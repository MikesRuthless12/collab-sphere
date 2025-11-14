// FIX: Add type definitions for browser-specific APIs (Web Speech API and prefixed AudioContext) to solve TypeScript errors.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
    webkitAudioContext: typeof AudioContext;
  }
}

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Participant, Message, MeetingMode, RecordingState, RecordingConfig, Reaction, VirtualBackground, AvatarFilter, Caption, FileContent, VoiceEffectSettings } from './types';
import VideoGrid from './VideoGrid';
import ChatPanel from './ChatPanel';
import HostControls from './HostControls';
import RecordingModal from './RecordingModal';
import SettingsModal from './SettingsModal';
import { SphereIcon } from './SphereIcon';
import { WebRTCService, SignalingConnectionState } from './webrtcService';
import ReactionsOverlay from './ReactionsOverlay';
import ErrorOverlay from './ErrorOverlay';

interface MeetingRoomProps {
  meetingId: string;
  userName: string;
  userId: string;
  onLeave: () => void;
}

const ToggleSwitch: React.FC<{ isEnabled: boolean; onToggle: () => void; disabled?: boolean }> = ({ isEnabled, onToggle, disabled }) => (
    <button onClick={onToggle} disabled={disabled} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer ${isEnabled ? 'bg-brand-secondary' : 'bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const MicLevelIndicator: React.FC<{ level: number }> = ({ level }) => (
    <div className="flex items-end gap-1 h-6 w-10">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`w-1.5 rounded-full transition-all duration-75 ${i < level ? 'bg-green-500' : 'bg-gray-600'}`} style={{ height: `${25 + i * 15}%` }}></div>
        ))}
    </div>
);

const MeetingRoom: React.FC<MeetingRoomProps> = ({ meetingId, userName, userId, onLeave }) => {
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: userId,
      name: `${userName} (You)`,
      isHost: true, // The first user to create the meeting is the host.
      isMuted: false,
      avatarUrl: `https://picsum.photos/seed/${userId}/200`,
      isDownloadAllowed: true,
      hasLeft: false,
      isHandRaised: false,
      stream: undefined,
      virtualBackground: 'none',
      avatarFilter: 'none',
      isSpeaking: false,
      voiceEffect: { pitch: 0, presetName: 'Default' },
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [fileObjectURLs, setFileObjectURLs] = useState<Map<string, string>>(new Map());

  const [meetingMode, setMeetingMode] = useState<MeetingMode>(MeetingMode.VIDEO_CALL);
  const [mainParticipantId, setMainParticipantId] = useState<string>(userId);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [arePMsDisabled, setArePMsDisabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [meetingLink, setMeetingLink] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Pre-join state
  const [joinState, setJoinState] = useState<'pre-join' | 'joining' | 'joined'>('pre-join');
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const micIndicatorAnimationRef = useRef<number>();

  const [signalingStatus, setSignalingStatus] = useState<SignalingConnectionState>('connecting');


  // User-configurable settings
  const [isProfanityFilterEnabled, setIsProfanityFilterEnabled] = useState(true);
  const [isLiveCaptionsEnabled, setIsLiveCaptionsEnabled] = useState(false);

  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const webRTCServiceRef = useRef<WebRTCService | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  
  const currentUser = useMemo(() => participants.find(p => p.id === userId)!, [participants, userId]);
  const animationFrameRef = useRef<number>();

  // Audio processing refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const rawAudioStreamRef = useRef<MediaStream | null>(null);
  const biquadFilterRef = useRef<BiquadFilterNode | null>(null);
  
  const handleAddMessage = useCallback((newMessage: Message) => {
    setMessages(prev => [...prev, newMessage]);
    if (newMessage.type === 'FILE' || newMessage.type === 'AUDIO') {
        const file = (newMessage.content as FileContent).file;
        const url = URL.createObjectURL(file);
        setFileObjectURLs(prev => new Map(prev).set(newMessage.id, url));
    }
    webRTCServiceRef.current?.sendMessage(newMessage);
  }, []);
  
  const setupSpeakingDetection = useCallback((stream: MediaStream) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    // FIX: Expected 1 argument for AudioContext constructor, but got 0. Passing an empty options object.
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({});
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
      const isSpeaking = average > 20;
      setParticipants(prev => {
        const currentParticipant = prev.find(p => p.id === userId);
        if (currentParticipant && currentParticipant.isSpeaking !== isSpeaking) {
            return prev.map(p => p.id === userId ? {...p, isSpeaking} : p);
        }
        return prev;
      });
      animationFrameRef.current = requestAnimationFrame(checkSpeaking);
    };
    checkSpeaking();
  }, [userId]);

  const cleanupMicIndicator = useCallback(() => {
    if (micIndicatorAnimationRef.current) {
        cancelAnimationFrame(micIndicatorAnimationRef.current);
        micIndicatorAnimationRef.current = undefined;
    }
  }, []);

  const setupMicIndicator = useCallback((stream: MediaStream) => {
      cleanupMicIndicator();
      // FIX: Expected 1 argument for AudioContext constructor, but got 0. Passing an empty options object.
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({});
      if (audioContext.state === 'suspended') {
          audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkMicLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
          const level = Math.min(5, Math.floor(average / 10));
          setMicLevel(level);
          micIndicatorAnimationRef.current = requestAnimationFrame(checkMicLevel);
      };
      checkMicLevel();
  }, [cleanupMicIndicator]);

    // Proactively check for blocked permissions on pre-join screen
    useEffect(() => {
        if (joinState !== 'pre-join' || !navigator.permissions) {
        return;
        }

        const permissionBlockedMessage = (device: string) => 
            `${device} access is blocked. Please enable it in your browser settings.`;

        const checkPermission = async (name: PermissionName, setError: React.Dispatch<React.SetStateAction<string | null>>, deviceName: string) => {
            try {
                const permissionStatus = await navigator.permissions.query({ name });
                
                const handleStateChange = () => {
                    if (permissionStatus.state === 'denied') {
                        setError(permissionBlockedMessage(deviceName));
                    } else {
                         setError(prevError => 
                            prevError === permissionBlockedMessage(deviceName) ? null : prevError
                        );
                    }
                };

                permissionStatus.onchange = handleStateChange;
                handleStateChange(); // Check initial state
            } catch (e) {
                console.warn(`Could not query ${name} permission:`, e);
            }
        };

        checkPermission('camera' as PermissionName, setCameraError, 'Camera');
        checkPermission('microphone' as PermissionName, setMicError, 'Microphone');

    }, [joinState]);

  const handleToggleCamera = useCallback(async () => {
    if (isCameraOn) {
        videoTrackRef.current?.stop();
        videoTrackRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setIsCameraOn(false);
    } else {
        setCameraError(null);
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Your browser doesn't support camera access.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const track = stream.getVideoTracks()[0];
            videoTrackRef.current = track;
            if (localVideoRef.current) localVideoRef.current.srcObject = new MediaStream([track]);
            setIsCameraOn(true);
        } catch (err: any) {
            console.error("Error getting camera:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraError('Permission denied. Please enable camera access in your browser settings.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setCameraError('No camera found. Please connect a camera.');
            } else {
                setCameraError(`Error: ${err.message}`);
            }
        }
    }
  }, [isCameraOn]);

  const cleanupAudioProcessing = useCallback(() => {
      audioContextRef.current?.close();
      rawAudioStreamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current = null;
      rawAudioStreamRef.current = null;
      biquadFilterRef.current = null;
      audioTrackRef.current = null;
      cleanupMicIndicator();
      setMicLevel(0);
  }, [cleanupMicIndicator]);
  
  const handleToggleMic = useCallback(async () => {
    if (isMicOn) {
        cleanupAudioProcessing();
        setIsMicOn(false);
    } else {
        setMicError(null);
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Your browser doesn't support microphone access.");
            }
            const rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            rawAudioStreamRef.current = rawStream;

            // Setup Audio Processing
            const context = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = context;
            const source = context.createMediaStreamSource(rawStream);
            const filter = context.createBiquadFilter();
            biquadFilterRef.current = filter;
            filter.type = 'peaking';
            filter.frequency.value = 1000;
            filter.Q.value = 0.5;
            filter.detune.value = currentUser.voiceEffect.pitch; // initial pitch
            
            const destination = context.createMediaStreamDestination();
            source.connect(filter);
            filter.connect(destination);
            
            audioTrackRef.current = destination.stream.getAudioTracks()[0];
            
            setupMicIndicator(rawStream);
            setIsMicOn(true);
        } catch (err: any) {
            console.error("Error getting mic:", err);
            cleanupAudioProcessing();
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setMicError('Permission denied. Please enable microphone access in your browser settings.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setMicError('No microphone found. Please connect a microphone.');
            } else {
                setMicError(`Error: ${err.message}`);
            }
        }
    }
  }, [isMicOn, currentUser.voiceEffect.pitch, cleanupAudioProcessing, setupMicIndicator]);

  // Update voice effect in real-time
  useEffect(() => {
    if (biquadFilterRef.current) {
        biquadFilterRef.current.detune.value = currentUser.voiceEffect.pitch;
    }
  }, [currentUser.voiceEffect.pitch]);


  const joinMeeting = () => {
    setJoinState('joining');
    const tracks: MediaStreamTrack[] = [];
    if (videoTrackRef.current) tracks.push(videoTrackRef.current);
    if (audioTrackRef.current) tracks.push(audioTrackRef.current);
    
    if (tracks.length > 0) {
        const meetingStream = new MediaStream(tracks);
        setParticipants(prev => prev.map(p => p.id === userId ? { ...p, stream: meetingStream } : p));
        if (audioTrackRef.current) {
            cleanupMicIndicator();
            setupSpeakingDetection(meetingStream);
        }
    }
    setJoinState('joined');
  };
  
  const handleReconnect = useCallback(async () => {
    console.log('Reconnected. Re-establishing media streams...');
    try {
        const tracks: MediaStreamTrack[] = [];

        let videoTrack = videoTrackRef.current;
        if (isCameraOn) {
            if (videoTrack?.readyState === 'ended') {
                videoTrack.stop();
                videoTrack = null;
            }
            if (!videoTrack) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoTrack = stream.getVideoTracks()[0];
                videoTrackRef.current = videoTrack;
            }
            if (videoTrack) tracks.push(videoTrack);
        }

        let audioTrack = audioTrackRef.current;
        if (isMicOn) {
            if (audioTrack?.readyState === 'ended') {
                // Mic was disconnected, need to re-initialize the whole audio chain
                await handleToggleMic(); // Turn it off
                await handleToggleMic(); // Turn it back on to re-create the chain
                audioTrack = audioTrackRef.current;
            }
            if (audioTrack) tracks.push(audioTrack);
        }
        
        const newStream = new MediaStream(tracks);
        setParticipants(prev => prev.map(p => p.id === userId ? { ...p, stream: newStream } : p));
        webRTCServiceRef.current?.setLocalStream(newStream);

        if (isMicOn && newStream.getAudioTracks().length > 0) {
            setupSpeakingDetection(newStream);
        }

    } catch (error) {
        console.error('Failed to re-acquire media devices on reconnect:', error);
    }
  }, [isCameraOn, isMicOn, userId, setupSpeakingDetection, handleToggleMic]);

  useEffect(() => {
    if (joinState !== 'joined' || webRTCServiceRef.current) return;

    const webRTCService = new WebRTCService(meetingId, userId, userName);
    webRTCServiceRef.current = webRTCService;
    
    const localParticipant = participants.find(p => p.id === userId);
    if (localParticipant?.stream) {
        webRTCService.setLocalStream(localParticipant.stream);
    }

    webRTCService.onConnectionStateChange = setSignalingStatus;
    webRTCService.onReconnect = handleReconnect;
    
    webRTCService.onParticipantJoined = (id, name) => {
        setParticipants(prev => {
            if (prev.some(p => p.id === id)) return prev;
            return [...prev, {
                id, name, isHost: false, isMuted: true, hasLeft: false, isHandRaised: false,
                avatarUrl: `https://picsum.photos/seed/${id}/200`,
                isDownloadAllowed: true, stream: undefined, virtualBackground: 'none', avatarFilter: 'none', isSpeaking: false, voiceEffect: { pitch: 0, presetName: 'Default' }
            }];
        });
    };
    
    webRTCService.onParticipantLeft = (id) => {
        setParticipants(prev => prev.map(p => p.id === id ? { ...p, hasLeft: true, stream: undefined } : p));
    };

    webRTCService.onRemoteStream = (id, stream) => {
        setParticipants(prev => prev.map(p => p.id === id ? { ...p, stream } : p));
    };

    webRTCService.onReaction = (reaction) => setReactions(prev => [...prev, reaction]);
    webRTCService.onCaption = (caption) => {
        setCaptions(prev => {
            const lastCaption = prev[prev.length -1];
            if(lastCaption && lastCaption.senderId === caption.senderId && !lastCaption.isFinal) {
                const newCaptions = [...prev];
                newCaptions[newCaptions.length - 1] = caption;
                return newCaptions;
            }
            return [...prev, caption];
        });
    };
    webRTCService.onMessage = handleAddMessage;
    webRTCService.onMessageUpdate = (updatedMessage) => {
        setMessages(prev => prev.map(msg => msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg));
    };
    webRTCService.onMessageDelete = ({ messageId }) => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };
    webRTCService.onNicknameChange = ({ participantId, newName }) => {
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, name: newName } : p));
    };
    
    return () => {
        webRTCServiceRef.current?.close();
        webRTCServiceRef.current = null;
    }
  }, [joinState, meetingId, userId, userName, participants, handleAddMessage, handleReconnect]);
  
  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
        webRTCServiceRef.current?.close();
        videoTrackRef.current?.stop();
        cleanupAudioProcessing();
        speechRecognitionRef.current?.stop();
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        cleanupMicIndicator();
        fileObjectURLs.forEach(URL.revokeObjectURL);
    };
  }, [fileObjectURLs, cleanupMicIndicator, cleanupAudioProcessing]);

  useEffect(() => {
    if (isLiveCaptionsEnabled && joinState === 'joined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser.");
            setIsLiveCaptionsEnabled(false);
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            }
            if (finalTranscript) {
                webRTCServiceRef.current?.sendCaption({ senderId: currentUser.id, text: finalTranscript, isFinal: true });
            }
        };

        recognition.onerror = (event) => console.error('Speech recognition error:', event.error);
        recognition.start();
        speechRecognitionRef.current = recognition;
    } else {
        speechRecognitionRef.current?.stop();
    }
  }, [isLiveCaptionsEnabled, currentUser.id, joinState]);

  useEffect(() => {
    setMeetingLink(`${window.location.origin}?meetingId=${meetingId}`);
  }, [meetingId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingLink).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const host = useMemo(() => participants.find(p => p.isHost)!, [participants]);
  
  const handleEditMessage = (messageId: string, newContent: Message['content']) => {
    const updatedMessage = { id: messageId, content: newContent, isEdited: true };
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, ...updatedMessage } : msg));
    webRTCServiceRef.current?.updateMessage(updatedMessage);
  };
  
  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    webRTCServiceRef.current?.deleteMessage({ messageId });
  };
  
  const handleChangeNickname = (participantId: string, newName: string) => {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, name: newName } : p));
    webRTCServiceRef.current?.changeNickname({ participantId, newName });
  };

  const handleRemoveParticipant = useCallback((participantId: string) => {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, hasLeft: true, stream: undefined } : p));
    if (mainParticipantId === participantId) {
      setMainParticipantId(host.id);
    }
  }, [mainParticipantId, host.id]);

  const handleToggleMute = useCallback((participantId: string) => {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, isMuted: !p.isMuted } : p));
  }, []);
  
  const handleMakeHost = useCallback((participantId: string) => {
    setParticipants(prev => prev.map(p => ({ ...p, isHost: p.id === participantId })));
  }, []);

  const handleToggleHandRaised = useCallback((participantId: string) => {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, isHandRaised: !p.isHandRaised } : p));
  }, []);

  const handleLowerAllHands = useCallback(() => {
    setParticipants(prev => prev.map(p => ({ ...p, isHandRaised: false })));
  }, []);

  const handleStartRecording = async (config: RecordingConfig) => {
    setRecordingState(RecordingState.IDLE);
    try {
        let mediaStream: MediaStream;
        if (config.source === 'screen') {
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: config.includeSystemAudio,
            });
        } else { // 'camera'
            const constraints: MediaStreamConstraints = {
                video: true,
                audio: config.includeMic,
            };
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        }
        
        // Add microphone audio for screen recording if needed
        if (config.source === 'screen' && config.includeMic && !config.includeSystemAudio) {
            const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = voiceStream.getAudioTracks()[0];
            mediaStream.addTrack(audioTrack);
        }

        const options: MediaRecorderOptions = { mimeType: config.format };
        const recorder = new MediaRecorder(mediaStream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => event.data.size > 0 && recordedChunksRef.current.push(event.data);

        recorder.onstop = () => {
            try {
                const blob = new Blob(recordedChunksRef.current, { type: options.mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `collab-sphere-recording-${new Date().toISOString()}.${config.format.split('/')[1]}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                recordedChunksRef.current = [];
            } catch (error) {
                console.error('Error saving recording:', error);
            } finally {
                setRecordingState(RecordingState.IDLE);
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
        
        mediaStream.getVideoTracks()[0].onended = () => mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
        recorder.start();
        setRecordingState(RecordingState.RECORDING);
    } catch (err) {
        console.error("Error starting recording:", err);
        setRecordingState(RecordingState.IDLE);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
    }
  };

  const handleSendReaction = (emoji: string) => {
    webRTCServiceRef.current?.sendReaction(emoji);
  };

  const handleSettingsChange = (settings: { background?: VirtualBackground, avatar?: AvatarFilter, profanity?: boolean, captions?: boolean, voiceEffect?: VoiceEffectSettings }) => {
    setParticipants(prev => prev.map(p => {
        if (p.id === currentUser.id) {
            return {
                ...p,
                virtualBackground: settings.background ?? p.virtualBackground,
                avatarFilter: settings.avatar ?? p.avatarFilter,
                voiceEffect: settings.voiceEffect ?? p.voiceEffect,
            }
        }
        return p;
    }));
    if (settings.profanity !== undefined) setIsProfanityFilterEnabled(settings.profanity);
    if (settings.captions !== undefined) setIsLiveCaptionsEnabled(settings.captions);
  };

  const signalingErrorType = signalingStatus === 'config_failed' ? 'config' : signalingStatus === 'connection_failed' ? 'connection' : null;

  if (signalingErrorType) {
    return (
      <ErrorOverlay
        signalingErrorType={signalingErrorType}
        onLeave={onLeave}
      />
    );
  }

  if (joinState === 'pre-join') {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-dark-bg text-dark-text-primary p-4">
            <SphereIcon className="w-20 h-20 text-brand-secondary mb-4" />
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">Ready to join?</h1>
            <p className="text-dark-text-secondary mb-6 text-center">Check your camera and microphone setup before joining.</p>
            
            <div className="w-full max-w-lg aspect-video bg-black rounded-lg mb-6 relative overflow-hidden flex items-center justify-center">
                <video ref={localVideoRef} muted autoPlay playsInline className={`w-full h-full object-cover transform -scale-x-100 ${isCameraOn ? 'opacity-100' : 'opacity-0'}`}></video>
                {!isCameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      <span className="text-gray-400">Camera is off</span>
                  </div>
                )}
            </div>
            
            <div className="w-full max-w-lg flex flex-col sm:flex-row gap-4 mb-6">
                {/* Camera Controls */}
                <div className="flex-1 p-4 bg-dark-surface rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold">Camera</span>
                        <ToggleSwitch isEnabled={isCameraOn} onToggle={handleToggleCamera} disabled={!!cameraError && !isCameraOn} />
                    </div>
                    {cameraError && <p className="text-xs text-red-400">{cameraError}</p>}
                </div>
                {/* Mic Controls */}
                <div className="flex-1 p-4 bg-dark-surface rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold">Microphone</span>
                        <ToggleSwitch isEnabled={isMicOn} onToggle={handleToggleMic} disabled={!!micError && !isMicOn} />
                    </div>
                    {isMicOn ? <MicLevelIndicator level={micLevel} /> : <div className="h-6"></div>}
                    {micError && <p className="text-xs text-red-400">{micError}</p>}
                </div>
            </div>

            <button
                onClick={joinMeeting}
                disabled={!isCameraOn && !isMicOn}
                className="bg-brand-secondary hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
            >
                Join now
            </button>
            {(!isCameraOn && !isMicOn) && (
                <p className="text-sm text-yellow-400 mt-4">
                    Please enable your camera or microphone to join.
                </p>
            )}
        </div>
    );
  }

  if (joinState === 'joining') {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-dark-bg text-dark-text-primary">
              <SphereIcon className="w-24 h-24 text-brand-secondary mb-6 animate-pulse" />
              <p className="text-xl text-dark-text-secondary">Joining meeting...</p>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-dark-bg text-dark-text-primary overflow-hidden relative">
      {signalingStatus === 'retrying' && (
          <div className="absolute inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
              <SphereIcon className="w-16 h-16 text-brand-secondary mb-4 animate-pulse" />
              <h2 className="text-2xl font-semibold text-dark-text-primary mb-2">Connection Lost</h2>
              <p className="text-dark-text-secondary">Attempting to reconnect to the server...</p>
          </div>
      )}
      <ReactionsOverlay reactions={reactions} />
       {recordingState === RecordingState.CONFIGURING && (
        <RecordingModal 
            onStart={handleStartRecording}
            onCancel={() => setRecordingState(RecordingState.IDLE)}
        />
      )}
      {showSettings && (
        <SettingsModal
            onClose={() => setShowSettings(false)}
            currentUser={currentUser}
            onSettingsChange={handleSettingsChange}
            isProfanityFilterEnabled={isProfanityFilterEnabled}
            isLiveCaptionsEnabled={isLiveCaptionsEnabled}
        />
      )}
      <main className="flex-1 flex flex-col transition-all duration-300">
        <header className="flex items-center justify-between p-2 sm:p-4 bg-dark-surface border-b border-dark-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SphereIcon className="w-8 h-8 text-brand-secondary"/>
            <h1 className="text-lg sm:text-xl font-bold text-dark-text-primary">Collab Sphere</h1>
          </div>
          <div className="flex items-center space-x-2 bg-dark-bg p-1 rounded-md">
             <input type="text" readOnly value={meetingLink} className="bg-transparent text-xs w-24 sm:w-32 md:w-48 text-dark-text-secondary outline-none"/>
             <button onClick={handleCopyLink} className="text-xs p-1 rounded hover:bg-dark-border relative">
                {showCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {recordingState !== RecordingState.RECORDING ? (
                 <button onClick={() => setRecordingState(RecordingState.CONFIGURING)} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-md text-sm">Record</button>
            ) : (
                <button onClick={handleStopRecording} className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-3 rounded-md text-sm animate-pulse">Stop</button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-md hover:bg-dark-border" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
            </button>
            <button onClick={onLeave} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-md text-sm">Leave</button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-dark-border lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </header>
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
          <VideoGrid
            participants={participants.filter(p => !p.hasLeft)}
            mainParticipantId={mainParticipantId}
            setMainParticipantId={setMainParticipantId}
            mode={meetingMode}
            onToggleMute={handleToggleMute}
            isRecording={recordingState === RecordingState.RECORDING}
            onToggleHandRaised={handleToggleHandRaised}
            currentUser={currentUser}
            onSendReaction={handleSendReaction}
            captions={captions}
          />
        </div>
      </main>
      <aside className={`w-full lg:w-96 bg-dark-surface border-l border-dark-border flex flex-col transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 fixed lg:static top-0 right-0 h-full z-20`}>
        <div className="p-4 border-b border-dark-border flex items-center justify-between lg:hidden">
            <h2 className="font-bold text-lg">Collaboration Panel</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-md hover:bg-dark-border">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        {currentUser.isHost && (
          <HostControls
            participants={participants.filter(p => !p.isHost && p.id !== userId)}
            onRemoveParticipant={handleRemoveParticipant}
            onMakeHost={handleMakeHost}
            onToggleMute={handleToggleMute}
            onLowerAllHands={handleLowerAllHands}
            onNicknameChange={handleChangeNickname}
          />
        )}
        <ChatPanel
          currentUser={currentUser}
          messages={messages}
          onAddMessage={handleAddMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          isChatMuted={isChatMuted}
          arePMsDisabled={arePMsDisabled}
          participants={participants}
          isProfanityFilterEnabled={isProfanityFilterEnabled}
          fileObjectURLs={fileObjectURLs}
        />
      </aside>
    </div>
  );
};

export default MeetingRoom;
