import React, { useState } from 'react';
import { Participant } from './types';

interface ParticipantControlsProps {
  participant: Participant;
  isHost: boolean;
  onMuteParticipant: (participantId: string) => void;
  onStopParticipantVideo: (participantId: string) => void;
  onRemoveParticipant: (participantId: string) => void;
  onLowerHand: (participantId: string) => void;
}

const ParticipantControls: React.FC<ParticipantControlsProps> = ({
  participant,
  isHost,
  onMuteParticipant,
  onStopParticipantVideo,
  onRemoveParticipant,
  onLowerHand,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  if (!isHost) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-lg bg-dark-border hover:bg-dark-surface transition-colors text-dark-text-secondary hover:text-dark-text-primary"
        title="Participant controls"
      >
        ⋮
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-dark-surface border border-dark-border rounded-lg shadow-lg z-50">
          <div className="py-2">
            {/* Mute Audio */}
            <button
              onClick={() => {
                onMuteParticipant(participant.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-dark-text-secondary hover:bg-dark-border hover:text-dark-text-primary transition-colors flex items-center gap-2"
            >
              <span>{participant.isMuted ? '🔊' : '🔇'}</span>
              {participant.isMuted ? 'Unmute' : 'Mute'}
            </button>

            {/* Stop Video */}
            <button
              onClick={() => {
                onStopParticipantVideo(participant.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-dark-text-secondary hover:bg-dark-border hover:text-dark-text-primary transition-colors flex items-center gap-2"
            >
              <span>📹</span>
              Stop Video
            </button>

            {/* Lower Hand */}
            {participant.isHandRaised && (
              <button
                onClick={() => {
                  onLowerHand(participant.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-dark-text-secondary hover:bg-dark-border hover:text-dark-text-primary transition-colors flex items-center gap-2"
              >
                <span>✋</span>
                Lower Hand
              </button>
            )}

            <div className="border-t border-dark-border my-2"></div>

            {/* Remove Participant */}
            <button
              onClick={() => {
                onRemoveParticipant(participant.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900 hover:bg-opacity-20 transition-colors flex items-center gap-2"
            >
              <span>🚪</span>
              Remove from Meeting
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantControls;
