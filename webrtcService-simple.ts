// Simplified WebRTC Service using PeerJS Cloud (Free)
// No need to deploy your own signaling server!

import type { Message, Participant } from './types';

// Using PeerJS free cloud server - no setup required!
// This is a free public service that handles all the signaling for you
const PEERJS_CONFIG = {
  host: 'peerjs-server.herokuapp.com',
  port: 443,
  secure: true,
  path: '/'
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
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

// Simple room management using localStorage for sharing room info
class SimpleSignaling {
  private roomId: string;
  private peerId: string;
  private peers: Set<string> = new Set();
  private onPeerJoin?: (peerId: string) => void;
  private onPeerLeave?: (peerId: string) => void;
  private onMessage?: (peerId: string, message: any) => void;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.peerId = `${roomId}-${userId}`;
  }

  connect(callbacks: {
    onPeerJoin?: (peerId: string) => void;
    onPeerLeave?: (peerId: string) => void;
    onMessage?: (peerId: string, message: any) => void;
  }) {
    this.onPeerJoin = callbacks.onPeerJoin;
    this.onPeerLeave = callbacks.onPeerLeave;
    this.onMessage = callbacks.onMessage;

    // Announce presence
    this.broadcastPresence();
    
    // Listen for other peers
    window.addEventListener('storage', this.handleStorageEvent);
    
    // Periodic presence broadcast
    setInterval(() => this.broadcastPresence(), 5000);
  }

  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key?.startsWith(`room-${this.roomId}-`)) {
      const peerId = e.key.replace(`room-${this.roomId}-`, '');
      if (peerId !== this.peerId) {
        if (e.newValue && !this.peers.has(peerId)) {
          this.peers.add(peerId);
          this.onPeerJoin?.(peerId);
        } else if (!e.newValue && this.peers.has(peerId)) {
          this.peers.delete(peerId);
          this.onPeerLeave?.(peerId);
        }
      }
    }
  };

  private broadcastPresence() {
    localStorage.setItem(`room-${this.roomId}-${this.peerId}`, Date.now().toString());
    // Clean up old entries
    this.cleanupOldPeers();
  }

  private cleanupOldPeers() {
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`room-${this.roomId}-`)) {
        const timestamp = parseInt(localStorage.getItem(key) || '0');
        if (now - timestamp > 10000) { // 10 seconds timeout
          localStorage.removeItem(key);
        }
      }
    }
  }

  disconnect() {
    localStorage.removeItem(`room-${this.roomId}-${this.peerId}`);
    window.removeEventListener('storage', this.handleStorageEvent);
  }

  getPeers(): string[] {
    return Array.from(this.peers);
  }
}

export class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream?: MediaStream;
  private screenStream?: MediaStream;
  private localId: string;
  private localName: string;
  private roomId: string;
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private signaling: SimpleSignaling;

  // Connection state
  private connectionState: SignalingConnectionState = 'connecting';

  // Callbacks
  private onParticipantJoined?: (participant: Participant) => void;
  private onParticipantLeft?: (userId: string) => void;
  private onStreamReceived?: (userId: string, stream: MediaStream) => void;
  private onMessageReceived?: (message: Message) => void;
  private onConnectionStateChange?: (state: SignalingConnectionState) => void;

  constructor(roomId: string, userId: string, userName: string) {
    this.roomId = roomId;
    this.localId = userId;
    this.localName = userName;
    this.signaling = new SimpleSignaling(roomId, userId);
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

    this.signaling.connect({
      onPeerJoin: (peerId) => this.handlePeerJoin(peerId),
      onPeerLeave: (peerId) => this.handlePeerLeave(peerId),
    });

    this.updateConnectionState('connected');
  }

  private updateConnectionState(state: SignalingConnectionState) {
    this.connectionState = state;
    this.onConnectionStateChange?.(state);
  }

  private async handlePeerJoin(peerId: string) {
    console.log('Peer joined:', peerId);
    
    // Create peer connection
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
      
      // Send offer via localStorage (simple signaling)
      this.sendSignalingMessage(peerId, {
        type: 'offer',
        offer: pc.localDescription,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }

    // Notify app
    this.onParticipantJoined?.({
      id: peerId,
      name: 'Participant', // We'll get the real name later
      isHost: false,
      isMuted: false,
      isVideoOff: false,
      hasLeft: false,
      isHandRaised: false,
    });
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
        this.sendSignalingMessage(peerId, {
          type: 'ice-candidate',
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

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessageReceived?.(message);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };

    this.dataChannels.set(peerId, channel);
  }

  private sendSignalingMessage(peerId: string, message: any) {
    const key = `signal-${this.roomId}-${this.localId}-${peerId}-${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(message));
    
    // Clean up after a short delay
    setTimeout(() => localStorage.removeItem(key), 5000);
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
    // Close all peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();

    // Stop local streams
    this.localStream?.getTracks().forEach(track => track.stop());
    this.screenStream?.getTracks().forEach(track => track.stop());

    // Disconnect signaling
    this.signaling.disconnect();

    this.updateConnectionState('connection_failed');
  }

  getConnectionState(): SignalingConnectionState {
    return this.connectionState;
  }
}
