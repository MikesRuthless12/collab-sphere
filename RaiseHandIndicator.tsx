import React, { useState, useEffect } from 'react';
import { Participant } from './types';

interface RaiseHandIndicatorProps {
  participants: Participant[];
  isHost: boolean;
  onLowerHand: (participantId: string) => void;
}

const RaiseHandIndicator: React.FC<RaiseHandIndicatorProps> = ({
  participants,
  isHost,
  onLowerHand,
}) => {
  const handsRaised = participants.filter((p) => p.isHandRaised && !p.hasLeft);

  if (handsRaised.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 max-w-xs z-40 space-y-2">
      {handsRaised.map((participant) => (
        <div
          key={participant.id}
          className="bg-yellow-900 bg-opacity-90 border border-yellow-500 rounded-lg p-3 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl flex-shrink-0">✋</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-yellow-100 truncate">
                  {participant.name}
                </p>
                <p className="text-xs text-yellow-200">wants to speak</p>
              </div>
            </div>
            {isHost && (
              <button
                onClick={() => onLowerHand(participant.id)}
                className="flex-shrink-0 px-2 py-1 text-xs bg-yellow-700 hover:bg-yellow-600 text-white rounded transition-colors"
              >
                Lower
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RaiseHandIndicator;
