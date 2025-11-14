import React from 'react';
import { Participant, MeetingMode, Caption } from './types';
import ParticipantView from './ParticipantView';
import { REACTION_EMOJIS } from './constants';
import CaptionsDisplay from './CaptionsDisplay';

interface VideoGridProps {
  participants: Participant[];
  mainParticipantId: string;
  setMainParticipantId: (id: string) => void;
  mode: MeetingMode;
  onToggleMute: (id: string) => void;
  isRecording: boolean;
  onToggleHandRaised: (id: string) => void;
  currentUser: Participant;
  onSendReaction: (emoji: string) => void;
  captions: Caption[];
}

const RaiseHandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15.333V9.75a4.5 4.5 0 0 1 4.5-4.5h.75a4.5 4.5 0 0 1 4.5 4.5v3.458a3 3 0 0 1-.65 1.895l-1.85 2.467a1.5 1.5 0 0 1-1.22.68H9.75a1.5 1.5 0 0 1-1.5-1.5V15.333Z" />
  </svg>
);

const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  mainParticipantId,
  setMainParticipantId,
  mode,
  onToggleMute,
  isRecording,
  onToggleHandRaised,
  currentUser,
  onSendReaction,
  captions,
}) => {
  const mainParticipant = participants.find(p => p.id === mainParticipantId) || participants[0];
  const otherParticipants = participants.filter(p => p.id !== mainParticipant?.id);

  return (
    <div className="h-full w-full flex flex-col relative">
      <div className="flex-1 bg-black rounded-lg overflow-hidden relative">
        {mainParticipant ? (
          <ParticipantView
            participant={mainParticipant}
            isMainView={true}
            mode={mode}
            onToggleMute={onToggleMute}
            isRecording={isRecording}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p>No one is in the meeting.</p>
          </div>
        )}
        <CaptionsDisplay captions={captions} />
      </div>

      <div className="flex justify-center items-center gap-2 sm:gap-4 p-2 sm:p-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-full bg-dark-surface p-2">
            {REACTION_EMOJIS.map(emoji => (
                <button 
                    key={emoji}
                    onClick={() => onSendReaction(emoji)}
                    className="text-2xl rounded-full w-10 h-10 flex items-center justify-center hover:bg-dark-border transition-colors"
                >
                    {emoji}
                </button>
            ))}
        </div>
        <button
          onClick={() => onToggleHandRaised(currentUser.id)}
          className={`p-3 rounded-full flex items-center justify-center transition-colors ${
            currentUser.isHandRaised ? 'bg-yellow-500 text-white' : 'bg-dark-surface hover:bg-dark-border'
          }`}
          title={currentUser.isHandRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          <RaiseHandIcon className="w-6 h-6" />
        </button>
      </div>

      {otherParticipants.length > 0 && (
        <div className="w-full h-28 sm:h-32 md:h-40 flex-shrink-0">
          <div className="flex space-x-2 h-full overflow-x-auto p-2">
            {otherParticipants.map(p => (
              <div
                key={p.id}
                className="h-full aspect-video rounded-md overflow-hidden cursor-pointer"
                onClick={() => setMainParticipantId(p.id)}
              >
                <ParticipantView
                  participant={p}
                  isMainView={false}
                  mode={MeetingMode.VIDEO_CALL}
                  onToggleMute={onToggleMute}
                  isRecording={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;