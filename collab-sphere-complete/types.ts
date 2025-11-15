export type VirtualBackground = string;
export type AvatarFilter = 
  'none' | 'dog' | 'cat' | 'panda' | 'lion' | 'tiger' | 'bear' | 'rabbit' | 
  'fox' | 'monkey' | 'elephant' | 'koala' | 'pig' | 'cow' | 'chicken' | 
  'penguin' | 'owl' | 'frog' | 'raccoon' | 'squirrel' | 'deer';

export interface Reaction {
  id: string;
  emoji: string;
  senderId: string;
}

export interface Caption {
    text: string;
    senderId: string;
    isFinal: boolean;
}

export interface VoiceEffectSettings {
  pitch: number; // in cents, -1200 to 1200
  presetName?: string;
}

export interface VoicePreset {
  name: string;
  pitch: number; // in cents
  emoji: string;
  avatarId?: string;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  avatarUrl: string;
  isDownloadAllowed: boolean;
  hasLeft: boolean;
  isHandRaised: boolean;
  handRaisedAt?: number; // Timestamp when hand was raised
  stream?: MediaStream;
  virtualBackground: VirtualBackground;
  avatarFilter: AvatarFilter;
  isSpeaking: boolean;
  voiceEffect: VoiceEffectSettings;
  joinedAt?: number; // Timestamp when participant joined
  videoEnabled?: boolean; // Whether participant's video is enabled
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
}

export interface TextContent {
  originalText: string;
  translatedText?: string;
  targetLanguage?: string;
}

export interface FileContent {
  fileName: string;
  fileSize: number;
  fileType: string;
  file: File;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  content: TextContent | FileContent;
  isPrivate: boolean;
  recipientIds?: string[];
  timestamp: string;
  isEdited?: boolean;
}


export enum MeetingMode {
  VIDEO_CALL = 'VIDEO_CALL',
  SCREEN_SHARE = 'SCREEN_SHARE',
}

export interface Language {
  code: string;
  name: string;
}

export enum RecordingState {
  IDLE = 'IDLE',
  CONFIGURING = 'CONFIGURING',
  RECORDING = 'RECORDING',
}

export enum RecordingFormat {
    MP4 = 'video/mp4',
    WEBM = 'video/webm',
}

export enum RecordingQuality {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
}

export type RecordingSource = 'screen' | 'camera';

export interface RecordingConfig {
    source: RecordingSource;
    format: RecordingFormat;
    quality: RecordingQuality;
    includeMic: boolean;
    includeSystemAudio: boolean;
}

export interface MeetingMetadata {
  meetingId: string;
  hostId: string;
  hostName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  participantCount: number;
  messageCount: number;
  recordingUrl?: string;
  isRecording: boolean;
}

export interface MeetingStats {
  totalDuration: number;
  totalParticipants: number;
  totalMessages: number;
  averageParticipants: number;
  peakParticipants: number;
  screenShareCount: number;
  recordingSize?: number;
}