import Peer, { DataConnection, MediaConnection } from 'peerjs';
import type { Message, Participant, Reaction, Caption } from './types';

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
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private mediaConnections: Map<string, MediaConnection> = new Map();
  private localStream?: MediaStream;
  private screenStream?: MediaStream;
  private localId: string;
  private localName: string;
  private roomId: string;
  private connectionState: SignalingConnectionState = 'connecting';
  private presenceInterval?: number;
  private knownPeers: Set<string> = new Set();

  // Callbacks
  onParticipantJoined?: (id: string, name: string) => void;
  onParticipantLeft?: (userId: string) => void;
  onRemoteStream?: (userId: string, stream: MediaStream) => void;
  onMessage?: (message: Message) => void;
  onMessageUpdate?: (message: any) => void;
  onMessageDelete?: (data: any) => void;
  onNicknameChange?: (data: any) => void;
  onReaction?: (reaction: Reaction) => void;
  onCaption?: (caption: Caption) => void;
  onConnectionStateChange?: (state: SignalingConnectionState) => void;
  onReconnect?: () => void;

  constructor(roomId: string, userId: string, userName: string) {
    this.roomId = roomId;
    this.localId = userId;
    this.localName = userName;
    this.initialize();
  }

  private initialize() {
    try {
      // Create a peer with the room ID as prefix for easy discovery
      const peerId = `${this.roomId}-${this.localId}`;
      
      this.peer = new Peer(peerId, {
        // Using free PeerJS cloud server
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 2, // Enable debug logging
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        },
      });

      this.peer.on('open', (id) => {
        console.log('Connected to PeerJS server with ID:', id);
        this.updateConnectionState('connected');
        this.announcePresence();
        
        // Periodically announce presence to discover new peers
        this.presenceInterval = window.setInterval(() => {
          this.announcePresence();
        }, 3000);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('call', (call) => {
        this.handleIncomingCall(call);
      });

      this.peer.on('error', (error) => {
        console.error('PeerJS error:', error);
        
        if (error.type === 'peer-unavailable') {
          // Peer is not available, they might have disconnected
          const peerId = error.message.match(/peer (.*) is/)?.[1];
          if (peerId) {
            this.handlePeerDisconnect(peerId);
          }
        } else if (error.type === 'network' || error.type === 'server-error') {
          this.updateConnectionState('retrying');
          // Try to reconnect
          setTimeout(() => this.reconnect(), 2000);
        } else {
          this.updateConnectionState('connection_failed');
        }
      });

      this.peer.on('disconnected', () => {
        console.log('Disconnected from PeerJS server, attempting reconnect...');
        this.updateConnectionState('retrying');
        this.peer?.reconnect();
      });

      this.peer.on('close', () => {
        console.log('PeerJS connection closed');
        this.updateConnectionState('connection_failed');
      });

    } catch (error) {
      console.error('Failed to initialize PeerJS:', error);
      this.updateConnectionState('config_failed');
    }
  }

  private reconnect() {
    if (this.peer && !this.peer.disconnected) return;
    
    console.log('Attempting to reconnect...');
    this.peer?.reconnect();
    
    if (this.peer?.disconnected) {
      // If still disconnected after 5 seconds, reinitialize
      setTimeout(() => {
        if (this.peer?.disconnected) {
          this.peer.destroy();
          this.initialize();
          this.onReconnect?.();
        }
      }, 5000);
    }
  }

  private announcePresence() {
    // Use localStorage to announce presence to other peers in the same room
    const presenceKey = `peerjs-room-${this.roomId}`;
    const presence = JSON.parse(localStorage.getItem(presenceKey) || '{}');
    
    presence[this.localId] = {
      peerId: this.peer?.id,
      name: this.localName,
      timestamp: Date.now(),
    };

    localStorage.setItem(presenceKey, JSON.stringify(presence));
    
    // Clean up stale entries (older than 10 seconds)
    const now = Date.now();
    Object.keys(presence).forEach(id => {
      if (now - presence[id].timestamp > 10000) {
        delete presence[id];
      }
    });
    
    // Connect to peers we don't know about yet
    Object.keys(presence).forEach(id => {
      if (id !== this.localId && !this.knownPeers.has(id) && !this.connections.has(id)) {
        const peerData = presence[id];
        if (peerData.peerId) {
          this.connectToPeer(id, peerData.peerId, peerData.name);
        }
      }
    });
  }

  private connectToPeer(userId: string, peerId: string, name: string) {
    if (!this.peer || this.connections.has(userId)) return;

    console.log('Connecting to peer:', userId, peerId);
    
    try {
      // Create data connection
      const conn = this.peer.connect(peerId, {
        reliable: true,
        metadata: { userId: this.localId, name: this.localName },
      });

      conn.on('open', () => {
        console.log('Data connection opened with', userId);
        this.connections.set(userId, conn);
        this.knownPeers.add(userId);
        
        // Send initial handshake
        this.sendToPeer(userId, {
          type: '__handshake',
          from: this.localId,
          name: this.localName,
        });

        this.onParticipantJoined?.(userId, name);

        // If we have a local stream, call the peer
        if (this.localStream) {
          this.callPeer(userId, peerId);
        }
      });

      conn.on('data', (data) => {
        this.handleDataMessage(userId, data);
      });

      conn.on('close', () => {
        console.log('Data connection closed with', userId);
        this.handlePeerDisconnect(userId);
      });

      conn.on('error', (error) => {
        console.error('Data connection error with', userId, error);
      });

    } catch (error) {
      console.error('Error connecting to peer:', error);
    }
  }

  private callPeer(userId: string, peerId: string) {
    if (!this.peer || !this.localStream) return;

    console.log('Calling peer with media:', userId);

    try {
      const call = this.peer.call(peerId, this.localStream, {
        metadata: { userId: this.localId },
      });

      call.on('stream', (remoteStream) => {
        console.log('Received remote stream from', userId);
        this.onRemoteStream?.(userId, remoteStream);
      });

      call.on('close', () => {
        console.log('Media connection closed with', userId);
      });

      call.on('error', (error) => {
        console.error('Media connection error with', userId, error);
      });

      this.mediaConnections.set(userId, call);
    } catch (error) {
      console.error('Error calling peer:', error);
    }
  }

  private handleIncomingConnection(conn: DataConnection) {
    const userId = conn.metadata?.userId || conn.peer;
    const name = conn.metadata?.name || 'Participant';

    console.log('Incoming connection from', userId);

    conn.on('open', () => {
      console.log('Incoming data connection opened from', userId);
      this.connections.set(userId, conn);
      this.knownPeers.add(userId);

      // Send handshake response
      this.sendToPeer(userId, {
        type: '__handshake',
        from: this.localId,
        name: this.localName,
      });

      this.onParticipantJoined?.(userId, name);
    });

    conn.on('data', (data) => {
      this.handleDataMessage(userId, data);
    });

    conn.on('close', () => {
      console.log('Incoming data connection closed from', userId);
      this.handlePeerDisconnect(userId);
    });

    conn.on('error', (error) => {
      console.error('Incoming data connection error from', userId, error);
    });
  }

  private handleIncomingCall(call: MediaConnection) {
    const userId = call.metadata?.userId || call.peer;

    console.log('Incoming call from', userId);

    // Answer with local stream if available
    call.answer(this.localStream || new MediaStream());

    call.on('stream', (remoteStream) => {
      console.log('Received remote stream from incoming call:', userId);
      this.onRemoteStream?.(userId, remoteStream);
    });

    call.on('close', () => {
      console.log('Incoming media connection closed from', userId);
    });

    call.on('error', (error) => {
      console.error('Incoming media connection error from', userId, error);
    });

    this.mediaConnections.set(userId, call);
  }

  private handleDataMessage(userId: string, data: any) {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;

      // Route messages to appropriate handlers
      if (message.type === '__handshake') {
        // Handshake already handled in connection setup
        return;
      } else if (message.type === 'reaction') {
        this.onReaction?.({
          id: `${userId}-${message.timestamp}`,
          emoji: message.emoji,
          userId: userId,
          timestamp: message.timestamp,
        });
      } else if (message.type === 'caption') {
        this.onCaption?.(message);
      } else if (message.type === '__message_update') {
        this.onMessageUpdate?.(message.data);
      } else if (message.type === '__message_delete') {
        this.onMessageDelete?.(message.data);
      } else if (message.type === '__nickname_change') {
        this.onNicknameChange?.(message.data);
      } else {
        this.onMessage?.(message);
      }
    } catch (error) {
      console.error('Error handling data message:', error);
    }
  }

  private handlePeerDisconnect(userId: string) {
    this.connections.delete(userId);
    this.mediaConnections.get(userId)?.close();
    this.mediaConnections.delete(userId);
    this.knownPeers.delete(userId);
    this.onParticipantLeft?.(userId);
  }

  private sendToPeer(userId: string, data: any) {
    const conn = this.connections.get(userId);
    if (conn && conn.open) {
      try {
        conn.send(data);
      } catch (error) {
        console.error('Error sending to peer:', error);
      }
    }
  }

  private broadcast(data: any) {
    this.connections.forEach((conn, userId) => {
      if (conn.open) {
        try {
          conn.send(data);
        } catch (error) {
          console.error('Error broadcasting to peer:', userId, error);
        }
      }
    });
  }

  private updateConnectionState(state: SignalingConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.onConnectionStateChange?.(state);
    }
  }

  // Public API
  setLocalStream(stream: MediaStream) {
    this.localStream = stream;

    // Call all connected peers with the new stream
    this.connections.forEach((conn, userId) => {
      if (conn.open) {
        const peerId = conn.peer;
        this.callPeer(userId, peerId);
      }
    });
  }

  sendMessage(message: MessagePayload) {
    this.broadcast(message);
  }

  updateMessage(data: any) {
    this.broadcast({
      type: '__message_update',
      data,
    });
  }

  deleteMessage(data: any) {
    this.broadcast({
      type: '__message_delete',
      data,
    });
  }

  changeNickname(data: any) {
    this.broadcast({
      type: '__nickname_change',
      data,
    });
  }

  sendReaction(emoji: string) {
    this.broadcast({
      type: 'reaction',
      emoji,
      from: this.localId,
      timestamp: Date.now(),
    });
  }

  sendCaption(caption: any) {
    this.broadcast({
      type: 'caption',
      ...caption,
    });
  }

  async startScreenShare(options?: ScreenShareOptions): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      this.screenStream = stream;

      // Replace video track in all media connections
      this.mediaConnections.forEach((call) => {
        const sender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video');
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
        const videoTrack = this.localStream.getVideoTracks()[0];
        this.mediaConnections.forEach((call) => {
          const sender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
  }

  close() {
    // Clear presence interval
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    // Remove from presence
    const presenceKey = `peerjs-room-${this.roomId}`;
    const presence = JSON.parse(localStorage.getItem(presenceKey) || '{}');
    delete presence[this.localId];
    localStorage.setItem(presenceKey, JSON.stringify(presence));

    // Close all connections
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();

    this.mediaConnections.forEach((call) => call.close());
    this.mediaConnections.clear();

    // Stop local streams
    this.localStream?.getTracks().forEach(track => track.stop());
    this.screenStream?.getTracks().forEach(track => track.stop());

    // Destroy peer
    this.peer?.destroy();
    this.peer = null;

    this.updateConnectionState('connection_failed');
  }

  getConnectionState(): SignalingConnectionState {
    return this.connectionState;
  }
}