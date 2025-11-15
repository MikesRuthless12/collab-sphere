// Simplified WebRTC Service for Netlify
// Uses localStorage for simple peer discovery (works for same-browser testing)
// For production, you can upgrade to Firebase or another free service

import type { Message, Participant } from './types';

// Free public STUN servers - no setup required!
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

type MessagePayload = Message & { content: Omit<Message['content'], 'file'> };

export type SignalingConnectionState = 'connecting' | 'connected' | 'retrying' | 'config_failed' | 'connection_failed';

export type ScreenShareType = 'none' | 'screen' | 'window' | 'tab' | 'area';

export interface ScreenShareOptions {
  type: ScreenShareType;
  areaConstraints?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream?: MediaStream;
  private screenStream?: MediaStream;
  private localId: string;
  private localName: string;
  private roomId: string;
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  // Connection state
  private connectionState: SignalingConnectionState = 'connecting';

  // Callbacks
  private onParticipantJoined?: (participant: Participant) => void;
  private onParticipantLeft?: (userId: string) => void;
  private onStreamReceived?: (userId: string, stream: MediaStream) => void;
  private onMessageReceived?: (message: Message) => void;
  private onConnectionStateChange?: (state: SignalingConnectionState) => void;

  // Simple signaling using localStorage and BroadcastChannel
  private channel?: BroadcastChannel;
  private presenceInterval?: number;

  constructor(roomId: string, userId: string, userName: string) {
    this.roomId = roomId;
    this.localId = userId;
    this.localName = userName;
  }

  async initialize(callbacks: {
    onParticipantJoined?: (participant: Participant) => void;
    onParticipantLeft?: (userId: string) => void;
    onStreamReceived?: (userId: string, stream: MediaStream) => void;
    onMessageReceived?: (message: Message) => void;
    onConnectionStateChange?: (state: SignalingConnectionState) => void;
  }) {
    this.onParticipantJoined = callbacks.onParticipantJoined;
    this.onParticipantLeft = callbacks.onParticipantLeft;
    this.onStreamReceived = callbacks.onStreamReceived;
    this.onMessageReceived = callbacks.onMessageReceived;
    this.onConnectionStateChange = callbacks.onConnectionStateChange;

    // Use BroadcastChannel for simple same-browser signaling
    try {
      this.channel = new BroadcastChannel(`collab-sphere-${this.roomId}`);
      this.channel.onmessage = (event) => this.handleSignalingMessage(event.data);

      // Announce presence
      this.announcePresence();

      // Keep announcing presence
      this.presenceInterval = window.setInterval(() => {
        this.announcePresence();
      }, 3000);

      this.updateConnectionState('connected');
    } catch (error) {
      console.error('BroadcastChannel not supported, using localStorage fallback');
      this.setupLocalStorageSignaling();
    }
  }

  private setupLocalStorageSignaling() {
    // Fallback to localStorage for signaling
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(`signal-${this.roomId}-`)) {
        try {
          const message = JSON.parse(event.newValue || '{}');
          if (message.from !== this.localId) {
            this.handleSignalingMessage(message);
          }
        } catch (error) {
          console.error('Error parsing signaling message:', error);
        }
      }
    });

    this.announcePresence();
    this.presenceInterval = window.setInterval(() => {
      this.announcePresence();
    }, 3000);

    this.updateConnectionState('connected');
  }

  private announcePresence() {
    this.sendSignalingMessage({
      type: '__join',
      from: this.localId,
      name: this.localName,
    });
  }

  private sendSignalingMessage(message: any) {
    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      // localStorage fallback
      const key = `signal-${this.roomId}-${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(message));
      setTimeout(() => localStorage.removeItem(key), 1000);
    }
  }

  private async handleSignalingMessage(message: any) {
    const { type, from, name, offer, answer, candidate } = message;

    if (from === this.localId) return; // Ignore own messages

    switch (type) {
      case '__join':
        await this.handlePeerJoin(from, name);
        break;

      case 'offer':
        await this.handleOffer(from, offer);
        break;

      case 'answer':
        await this.handleAnswer(from, answer);
        break;

      case 'ice-candidate':
        await this.handleIceCandidate(from, candidate);
        break;

      case '__leave':
        this.handlePeerLeave(from);
        break;
    }
  }

  private async handlePeerJoin(peerId: string, name: string) {
    if (this.peerConnections.has(peerId)) return;

    console.log('Peer joined:', peerId, name);

    // Only create offer if our ID is "greater" to avoid duplicate connections
    if (this.localId > peerId) {
      const pc = this.createPeerConnection(peerId);

      // Add local stream if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
        });
      }

      // Create data channel
      const dataChannel = pc.createDataChannel('data');
      this.setupDataChannel(peerId, dataChannel);

      // Create and send offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.sendSignalingMessage({
          type: 'offer',
          from: this.localId,
          to: peerId,
          offer: pc.localDescription,
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }

    // Notify app
    this.onParticipantJoined?.({
      id: peerId,
      name: name || 'Participant',
      isHost: false,
      isMuted: false,
      isVideoOff: false,
      hasLeft: false,
      isHandRaised: false,
    });
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    let pc = this.peerConnections.get(peerId);
    
    if (!pc) {
      pc = this.createPeerConnection(peerId);

      // Add local stream if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc!.addTrack(track, this.localStream!);
        });
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        from: this.localId,
        to: peerId,
        answer: pc.localDescription,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  private handlePeerLeave(peerId: string) {
    console.log('Peer left:', peerId);

    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }

    this.dataChannels.delete(peerId);
    this.onParticipantLeft?.(peerId);
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          from: this.localId,
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received track from', peerId);
      this.onStreamReceived?.(peerId, event.streams[0]);
    };

    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.handlePeerLeave(peerId);
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('Data channel opened with', peerId);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessageReceived?.(message);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    this.dataChannels.set(peerId, channel);
  }

  private updateConnectionState(state: SignalingConnectionState) {
    this.connectionState = state;
    this.onConnectionStateChange?.(state);
  }

  async setLocalStream(stream: MediaStream) {
    this.localStream = stream;

    // Add tracks to all existing peer connections
    this.peerConnections.forEach((pc) => {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    });
  }

  async toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  async toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  sendMessage(message: MessagePayload) {
    const messageStr = JSON.stringify(message);
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(messageStr);
      }
    });
  }

  async startScreenShare(options?: ScreenShareOptions): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      this.screenStream = stream;

      // Replace video track in all peer connections
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && stream.getVideoTracks()[0]) {
          sender.replaceTrack(stream.getVideoTracks()[0]);
        }
      });

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = undefined;

      // Restore camera track
      if (this.localStream) {
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          const videoTrack = this.localStream!.getVideoTracks()[0];
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
  }

  disconnect() {
    // Announce leaving
    this.sendSignalingMessage({
      type: '__leave',
      from: this.localId,
    });

    // Clear presence interval
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    // Close broadcast channel
    if (this.channel) {
      this.channel.close();
    }

    // Close all peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();

    // Stop local streams
    this.localStream?.getTracks().forEach(track => track.stop());
    this.screenStream?.getTracks().forEach(track => track.stop());

    this.updateConnectionState('connection_failed');
  }

  getConnectionState(): SignalingConnectionState {
    return this.connectionState;
  }
}
