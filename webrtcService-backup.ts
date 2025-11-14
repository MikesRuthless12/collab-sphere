import { Reaction, Caption, Message } from '../types';

// INSTRUCTIONS:
// 1. Deploy signaling-server.ts to Deno Deploy (free tier available)
// 2. Get your Deno Deploy URL (e.g., "collab-sphere-signaling.deno.dev")
// 3. Replace 'YOUR-DENO-DEPLOY-URL' below with your actual URL
// 4. For local testing, you can use a local Deno server

const DENO_DEPLOY_URL = 'collab-sphere-5ka74qhrvprr.mikesruthless12.deno.net';

// This will point to your Deno Deploy signaling server
const SIGNALING_SERVER = `wss://${DENO_DEPLOY_URL}`;

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

export class WebRTCService {
  private ws: WebSocket | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream?: MediaStream;
  private screenStream?: MediaStream;
  private localId: string;
  private localName: string;
  private roomId: string;
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  // Connection retry logic state
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000; // Start with 1 second

  public isConfigured: boolean = DENO_DEPLOY_URL !== 'YOUR-DENO-DEPLOY-URL';

  // Callbacks for the UI to subscribe to
  public onConnectionStateChange: (state: SignalingConnectionState) => void = () => {};
  public onReconnect: () => Promise<void> = async () => {};
  public onRemoteStream: (id: string, stream: MediaStream) => void = () => {};
  public onReaction: (reaction: Reaction) => void = () => {};
  public onCaption: (caption: Caption) => void = () => {};
  public onMessage: (message: Message) => void = () => {};
  public onMessageUpdate: (data: { id: string; content: Message['content']; isEdited: boolean }) => void = () => {};
  public onMessageDelete: (data: { messageId: string }) => void = () => {};
  public onNicknameChange: (data: { participantId: string, newName: string }) => void = () => {};
  public onParticipantJoined: (id: string, name: string) => void = () => {};
  public onParticipantLeft: (id: string) => void = () => {};

  constructor(roomId: string, localId: string, localName: string) {
    this.roomId = roomId;
    this.localId = localId;
    this.localName = localName;
    
    if (!this.isConfigured) {
      console.error("Signaling server is not configured. Please update DENO_DEPLOY_URL in webrtcService.ts");
      this.onConnectionStateChange('config_failed');
      return;
    }
    this.connect();
  }

  private connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
    }
    
    if (this.retryCount >= this.maxRetries) {
        console.error(`Exhausted all retries for signaling server. Connection failed.`);
        this.onConnectionStateChange('connection_failed');
        return;
    }

    if (this.retryCount > 0) {
        this.onConnectionStateChange('retrying');
    } else {
        this.onConnectionStateChange('connecting');
    }

    const serverUrl = `${SIGNALING_SERVER}/${this.roomId}`;
    console.log(`Attempting to connect to: ${SIGNALING_SERVER} (Attempt ${this.retryCount + 1}/${this.maxRetries})`);
    this.ws = new WebSocket(serverUrl);

    this.ws.onopen = async () => {
        console.log(`Connected to signaling server: ${SIGNALING_SERVER}`);
        const wasReconnecting = this.retryCount > 0;
        
        this.retryCount = 0;
        this.retryDelay = 1000;

        if (wasReconnecting) {
            console.log("Reconnection detected, re-acquiring media streams before re-joining...");
            try {
                await this.onReconnect();
                console.log("Media streams re-acquired successfully.");
            } catch (error) {
                console.error("Failed to re-acquire media on reconnect, proceeding with no media.", error);
            }
        }
        
        this.onConnectionStateChange('connected');
        this.sendSignalingMessage({ type: '__join', name: this.localName });
    };

    this.ws.onmessage = this.handleSignalingMessage.bind(this);
    
    this.ws.onerror = () => {
        console.error(`Signaling server WebSocket error with ${SIGNALING_SERVER}.`);
    };
    
    this.ws.onclose = (event) => {
        console.log(`Disconnected from signaling server. Code: ${event.code}, Reason: "${event.reason || 'No reason given'}"`);
        
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.dataChannels.clear();
        
        if (event.code !== 1000) { // 1000 is normal closure
            this.retryCount++;
            this.retryDelay = Math.min(this.retryDelay * 2, 30000); // Exponential backoff up to 30s
            setTimeout(() => this.connect(), this.retryDelay);
        }
    }
  }

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Update tracks for all existing connections
    this.peerConnections.forEach(pc => {
        const senders = pc.getSenders();
        this.localStream?.getTracks().forEach(track => {
            const sender = senders.find(s => s.track?.kind === track.kind);
            if(sender) {
                sender.replaceTrack(track);
            } else {
                pc.addTrack(track, this.localStream!);
            }
        });
    });
  }

  /**
   * Start screen sharing with options for full screen, window, tab, or custom area
   */
  public async startScreenShare(options: ScreenShareOptions): Promise<MediaStream> {
    try {
      let constraints: DisplayMediaStreamOptions = {
        video: {
          cursor: 'always' as ConstantString,
        },
        audio: false,
      };

      // Handle area selection
      if (options.type === 'area' && options.areaConstraints) {
        constraints.video = {
          ...constraints.video,
          width: { ideal: options.areaConstraints.width },
          height: { ideal: options.areaConstraints.height },
        };
      }

      // Get display media based on type
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // For area selection, we need to crop the stream on the client side
      if (options.type === 'area' && options.areaConstraints) {
        // Note: Actual cropping would require canvas manipulation
        // This is a placeholder for the feature
        console.log('Area selection constraints applied');
      }

      this.screenStream = stream;

      // Replace video track with screen share
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        this.peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack).catch(err => 
              console.error('Error replacing track:', err)
            );
          }
        });

        // Handle when user stops screen sharing
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing and return to camera
   */
  public async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = undefined;
    }

    // Switch back to local camera stream
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        this.peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack).catch(err =>
              console.error('Error replacing track:', err)
            );
          }
        });
      }
    }
  }

  private handleDataChannelMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case 'reaction': this.onReaction(data.payload); break;
        case 'caption': this.onCaption(data.payload); break;
        case 'message': this.onMessage(data.payload); break;
        case 'message-update': this.onMessageUpdate(data.payload); break;
        case 'message-delete': this.onMessageDelete(data.payload); break;
        case 'nickname-change': this.onNicknameChange(data.payload); break;
        default: console.warn('Unknown data channel message type:', data.type);
    }
  }

  private async handleSignalingMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data);
    const { senderId } = msg;

    if (!senderId || senderId === this.localId) return;
    if (msg.targetId && msg.targetId !== this.localId) return;

    switch (msg.type) {
      case '__join':
        this.onParticipantJoined(senderId, msg.name);
        this.call(senderId);
        break;
      case '__leave':
        this.handleUserDisconnected(senderId);
        break;
      case 'offer': await this.handleOffer(senderId, msg.offer); break;
      case 'answer': await this.handleAnswer(senderId, msg.answer); break;
      case 'ice-candidate': await this.handleIceCandidate(senderId, msg.candidate); break;
    }
  }

  private createPeerConnection(remoteId: string): RTCPeerConnection {
    if(this.peerConnections.has(remoteId)) {
        this.peerConnections.get(remoteId)?.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({ type: 'ice-candidate', candidate: event.candidate }, remoteId);
      }
    };
    pc.ontrack = (event) => this.onRemoteStream(remoteId, event.streams[0]);
    pc.ondatachannel = (event) => {
        const channel = event.channel;
        this.dataChannels.set(remoteId, channel);
        channel.onmessage = this.handleDataChannelMessage.bind(this);
    };
     pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        this.handleUserDisconnected(remoteId);
      }
    };
    this.localStream?.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    this.peerConnections.set(remoteId, pc);
    return pc;
  }

  public async call(remoteId: string) {
    const pc = this.createPeerConnection(remoteId);
    const dataChannel = pc.createDataChannel('main');
    dataChannel.onmessage = this.handleDataChannelMessage.bind(this);
    this.dataChannels.set(remoteId, dataChannel);
    
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignalingMessage({ type: 'offer', offer }, remoteId);
    } catch (error) {
        console.error(`Error creating offer for ${remoteId}:`, error);
    }
  }

  private async handleOffer(remoteId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.createPeerConnection(remoteId);
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignalingMessage({ type: 'answer', answer }, remoteId);
    } catch (error) {
        console.error(`Error handling offer from ${remoteId}:`, error);
    }
  }

  private async handleAnswer(remoteId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(remoteId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
          console.error(`Error handling answer from ${remoteId}:`, error);
      }
    }
  }

  private async handleIceCandidate(remoteId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(remoteId);
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
          console.error(`Error adding ICE candidate from ${remoteId}:`, error);
      }
    }
  }

  private handleUserDisconnected(remoteId: string) {
    this.peerConnections.get(remoteId)?.close();
    this.peerConnections.delete(remoteId);
    this.dataChannels.delete(remoteId);
    this.onParticipantLeft(remoteId);
  }

  private broadcastData(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    this.dataChannels.forEach(channel => {
        if (channel.readyState === 'open') channel.send(message);
    });
  }
  
  public sendMessage(message: Message) {
    const { file, ...content } = message.content as any;
    const payload: MessagePayload = { ...message, content };
    this.broadcastData('message', payload);
  }
  
  public updateMessage(payload: { id: string; content: Message['content']; isEdited: boolean }) {
    this.broadcastData('message-update', payload);
  }
  
  public deleteMessage(payload: { messageId: string }) {
    this.broadcastData('message-delete', payload);
  }
  
  public changeNickname(payload: { participantId: string, newName: string }) {
    this.broadcastData('nickname-change', payload);
  }

  public sendReaction(emoji: string) {
    const reaction: Reaction = { id: Date.now().toString(), emoji, senderId: this.localId };
    this.broadcastData('reaction', reaction);
    this.onReaction(reaction);
  }

  public sendCaption(caption: Caption) {
    this.broadcastData('caption', caption);
  }

  private sendSignalingMessage(message: any, targetId?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        ...message,
        senderId: this.localId,
        targetId: targetId,
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  public close() {
    this.sendSignalingMessage({ type: '__leave' });
    this.localStream?.getTracks().forEach(track => track.stop());
    this.screenStream?.getTracks().forEach(track => track.stop());
    this.peerConnections.forEach(pc => pc.close());
    this.retryCount = this.maxRetries; 
    this.ws?.close(1000, "User left meeting");
  }
}
