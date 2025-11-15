import React, { useState, useMemo } from 'react';
import { Participant } from './types';

interface HostControlsProps {
  participants: Participant[];
  onRemoveParticipant: (id: string) => void;
  onMakeHost: (id: string) => void;
  onToggleMute: (id: string) => void;
  onLowerAllHands: () => void;
  onNicknameChange: (id: string, newName: string) => void;
}

const ParticipantEditor: React.FC<{ participant: Participant, onNicknameChange: (id: string, newName: string) => void }> = ({ participant, onNicknameChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(participant.name);

    const handleSave = () => {
        if(name.trim() && name.trim() !== participant.name) {
            onNicknameChange(participant.id, name.trim());
        }
        setIsEditing(false);
    }
    
    return isEditing ? (
        <div className="flex items-center gap-2">
            <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                className="bg-dark-bg p-1 rounded-md text-sm w-24"
            />
            <button onClick={handleSave} className="p-1 hover:bg-dark-border rounded">✅</button>
            <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-dark-border rounded">❌</button>
        </div>
    ) : (
        <span className="truncate flex items-center gap-2">
            {participant.isHandRaised && <span title="Hand is raised">✋</span>}
            {participant.name}
            <button onClick={() => setIsEditing(true)} title="Edit Nickname" className="p-1 hover:bg-dark-border rounded">✏️</button>
        </span>
    );
};


const HostControls: React.FC<HostControlsProps> = (props) => {
  const { participants, onRemoveParticipant, onMakeHost, onToggleMute, onLowerAllHands, onNicknameChange } = props;
  const [showParticipants, setShowParticipants] = useState(true);

  const activeParticipants = useMemo(() => {
    return participants.filter(p => !p.hasLeft).sort((a, b) => (b.isHandRaised ? 1 : 0) - (a.isHandRaised ? 1 : 0));
  }, [participants]);
  
  const handsRaisedCount = activeParticipants.filter(p => p.isHandRaised).length;

  return (
    <div className="p-4 border-b border-dark-border bg-gray-800">
      <button onClick={() => setShowParticipants(!showParticipants)} className="w-full text-left font-bold mb-3 text-dark-text-secondary flex justify-between items-center">
        <span>Host Controls</span>
        <span>{showParticipants ? '▲' : '▼'}</span>
      </button>
      {showParticipants && (
        <div className="max-h-64 overflow-y-auto">
          {handsRaisedCount > 0 && (
             <button onClick={onLowerAllHands} className="w-full text-center p-2 mb-2 text-sm bg-dark-surface hover:bg-dark-border rounded-md">
                Lower All Hands ({handsRaisedCount})
            </button>
          )}
          <h4 className="text-xs font-bold uppercase text-dark-text-secondary mb-2">Active ({activeParticipants.length})</h4>
          <ul className="space-y-2 mb-4">
            {activeParticipants.map(p => (
              <li key={p.id} className="flex items-center justify-between text-sm bg-dark-surface p-2 rounded-md">
                <ParticipantEditor participant={p} onNicknameChange={onNicknameChange} />
                <div className="flex space-x-1 flex-shrink-0">
                   <button onClick={() => onToggleMute(p.id)} title={p.isMuted ? "Unmute Mic" : "Mute Mic"} className="p-1 hover:bg-dark-border rounded">{p.isMuted ? '🔇' : '🎤'}</button>
                   <button onClick={() => onMakeHost(p.id)} title="Make Host" className="p-1 hover:bg-dark-border rounded">👑</button>
                  <button onClick={() => onRemoveParticipant(p.id)} title="Remove Participant" className="p-1 text-red-500 hover:bg-dark-border rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HostControls;