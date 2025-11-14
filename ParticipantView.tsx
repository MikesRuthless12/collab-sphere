import React, { useEffect, useRef } from 'react';
import { Participant, MeetingMode } from './types';
import { VIRTUAL_BACKGROUNDS, VOICE_PRESETS } from './constants';

interface ParticipantViewProps {
  participant: Participant;
  isMainView: boolean;
  mode: MeetingMode;
  onToggleMute: (id: string) => void;
  isRecording: boolean;
}

const ScreenShareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 16V6h16v10H4z"></path>
  </svg>
);

const MuteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l-2.25 2.25M19.5 12l2.25-2.25M12.75 6.036ll-5.167-5.167A4.5 4.5 0 0 0 1.5 4.5v15a4.5 4.5 0 0 0 6.364 3.182l5.167-5.167m2.833-2.833 2.12-2.12a1.5 1.5 0 0 0 0-2.12l-2.12-2.12a1.5 1.5 0 0 0-2.12 0L12.75 6.036m2.833 2.833-2.833 2.833" />
    </svg>
);

const UnmuteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
);

const HandRaisedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.73 6.01A4.502 4.502 0 0012.75 3h-.75a4.5 4.5 0 00-4.5 4.5v5.583a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5V9.75a3 3 0 013-3h.333a3 3 0 013 3v5.583a3 3 0 01-.649 1.895L6.15 19.69a1.5 1.5 0 001.221.68h7.13a4.5 4.5 0 004.473-4.01l.267-2.933a4.504 4.504 0 00-1.49-4.417z" />
    </svg>
);

const animalFace = (bgColor: string, featureColor: string, mouthOpen: boolean) => (
    <svg viewBox="0 0 100 100" width="80%" height="80%">
        <circle cx="50" cy="50" r="40" fill={bgColor} />
        <circle cx="35" cy="40" r="5" fill={featureColor} />
        <circle cx="65" cy="40" r="5" fill={featureColor} />
        <circle cx="50" cy="55" r="3" fill={featureColor} />
        {mouthOpen ? (
            <ellipse cx="50" cy="75" rx="15" ry="8" fill={featureColor} />
        ) : (
            <path d="M40 70 Q 50 75, 60 70" stroke={featureColor} strokeWidth="3" fill="none" strokeLinecap="round"/>
        )}
    </svg>
);

const genericFace = (bgColor: string, featureColor: string, isSpeaking: boolean, extras?: React.ReactElement) => (
     <svg viewBox="0 0 100 100" width="80%" height="80%">
        <circle cx="50" cy="50" r="40" fill={bgColor} />
        <circle cx="35" cy="40" r="5" fill={featureColor} />
        <circle cx="65" cy="40" r="5" fill={featureColor} />
        {isSpeaking ? (
            <ellipse cx="50" cy="75" rx="15" ry="8" fill={featureColor} />
        ) : (
            <path d="M40 70 Q 50 65, 60 70" stroke={featureColor} strokeWidth="3" fill="none" strokeLinecap="round"/>
        )}
        {extras}
    </svg>
);

const getAvatarSvg = (avatarId: string, isSpeaking: boolean): React.ReactElement | null => {
    switch (avatarId) {
        // Voice Preset Avatars
        case 'ogre': return genericFace('#556B2F', '#000', isSpeaking);
        case 'villain': return genericFace('#4B0082', '#FF0000', isSpeaking, <><path d="M25 38 L45 32" stroke="#FF0000" strokeWidth="3"/><path d="M75 38 L55 32" stroke="#FF0000" strokeWidth="3"/></>);
        case 'old-man': return genericFace('#F5DEB3', '#A9A9A9', isSpeaking, <path d="M30 60 C 35 50, 65 50, 70 60 C 60 70, 40 70, 30 60 Z" fill="#A9A9A9"/>);
        case 'heroine': return genericFace('#FFDAB9', '#0000FF', isSpeaking);
        case 'goblin': return genericFace('#228B22', '#FFFF00', isSpeaking, <><path d="M10 50 L25 20 L35 40 Z" fill="#228B22" /><path d="M90 50 L75 20 L65 40 Z" fill="#228B22" /></>);
        case 'fairy': return genericFace('#FFB6C1', '#DA70D6', isSpeaking, <><circle cx="20" cy="25" r="3" fill="yellow" /><circle cx="80" cy="25" r="3" fill="yellow" /><circle cx="50" cy="15" r="2" fill="yellow" /></>);
        case 'chipmunk': return animalFace('#8B4513', '#FFF', isSpeaking);
        case 'squeaky': return animalFace('#D3D3D3', '#000', isSpeaking);
        
        // Standard Animal Avatars
        case 'dog': return animalFace('#D2B48C', '#000', isSpeaking);
        case 'cat': return animalFace('#FFA07A', '#000', isSpeaking);
        case 'panda': return animalFace('#FFF', '#000', isSpeaking);
        case 'lion': return animalFace('#FFD700', '#A0522D', isSpeaking);
        case 'tiger': return animalFace('#FFA500', '#000', isSpeaking);
        case 'bear': return animalFace('#8B4513', '#000', isSpeaking);
        case 'rabbit': return animalFace('#FFFFFF', '#F08080', isSpeaking);
        case 'fox': return animalFace('#FF4500', '#FFFFFF', isSpeaking);
        case 'monkey': return animalFace('#CD853F', '#F5DEB3', isSpeaking);
        case 'elephant': return animalFace('#C0C0C0', '#000', isSpeaking);
        case 'koala': return animalFace('#D3D3D3', '#000', isSpeaking);
        case 'pig': return animalFace('#FFC0CB', '#000', isSpeaking);
        case 'cow': return animalFace('#FFFFFF', '#000', isSpeaking);
        case 'chicken': return animalFace('#FFFF00', '#FF0000', isSpeaking);
        case 'penguin': return animalFace('#000000', '#FFFFFF', isSpeaking);
        case 'owl': return animalFace('#A0522D', '#FFFF00', isSpeaking);
        case 'frog': return animalFace('#32CD32', '#000', isSpeaking);
        case 'raccoon': return animalFace('#808080', '#000', isSpeaking);
        case 'squirrel': return animalFace('#966919', '#000', isSpeaking);
        case 'deer': return animalFace('#C19A6B', '#000', isSpeaking);
        default: return null;
    }
};


const AvatarView: React.FC<{ avatar: string; isSpeaking: boolean }> = ({ avatar, isSpeaking }) => {
    const avatarSvg = getAvatarSvg(avatar, isSpeaking);
    return <div className="w-full h-full flex items-center justify-center bg-dark-border">{avatarSvg}</div>;
}

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant, isMainView, mode, onToggleMute, isRecording }) => {
  const isScreenSharing = isMainView && mode === MeetingMode.SCREEN_SHARE;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);
  
  const backgroundStyle = VIRTUAL_BACKGROUNDS.find(bg => bg.id === participant.virtualBackground)?.style || {};
  const isCurrentUser = participant.name.endsWith('(You)');

  const renderVideoContent = () => {
    const activeVoicePreset = VOICE_PRESETS.find(p => p.name === participant.voiceEffect.presetName);
    const voicePresetAvatarId = activeVoicePreset?.avatarId;
    
    // Priority: Voice Preset Avatar > Selected Avatar Filter > Video > Fallback Image
    if (voicePresetAvatarId) {
      return <AvatarView avatar={voicePresetAvatarId} isSpeaking={participant.isSpeaking} />;
    }
    if (participant.avatarFilter !== 'none') {
      return <AvatarView avatar={participant.avatarFilter} isSpeaking={participant.isSpeaking} />;
    }

    const hasVideo = participant.stream?.getVideoTracks().some(t => t.readyState === 'live');
    return (
      <>
        <div className="absolute inset-0 z-10" style={backgroundStyle}></div>
        {hasVideo ? (
            <video ref={videoRef} autoPlay playsInline muted={isCurrentUser} className={`w-full h-full object-cover relative z-0 ${isCurrentUser ? 'transform -scale-x-100' : ''}`}></video>
        ) : (
            <img src={participant.avatarUrl} alt={participant.name} className="w-full h-full object-cover" />
        )}
      </>
    );
  }

  return (
    <div className="w-full h-full bg-black relative group flex items-center justify-center text-dark-text-primary">
      {isScreenSharing ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
          <ScreenShareIcon className="w-24 h-24 text-gray-500" />
          <p className="mt-4 text-xl">{participant.name} is sharing their screen.</p>
        </div>
      ) : renderVideoContent()}
      
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <span className="text-xs sm:text-sm font-semibold px-2 py-1 bg-black/50 rounded-md">{participant.name} {participant.isHost && ' (Host)'}</span>
        <div className="flex items-center space-x-2">
            {participant.isHandRaised && <HandRaisedIcon className="w-5 h-5 text-yellow-400" />}
            {participant.id !== 'user-1' && (
                <button onClick={() => onToggleMute(participant.id)} className="p-1 rounded-full bg-black/50 hover:bg-black/80">
                {participant.isMuted ? <MuteIcon className="w-4 h-4" /> : <UnmuteIcon className="w-4 h-4" />}
                </button>
            )}
        </div>
      </div>
      
      {isRecording && isMainView && (
        <div className="absolute top-2 left-2 flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-red-500">REC</span>
        </div>
      )}
    </div>
  );
};

export default ParticipantView;