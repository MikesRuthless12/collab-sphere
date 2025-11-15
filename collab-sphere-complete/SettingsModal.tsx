import React, { useState } from 'react';
import { Participant, VirtualBackground, AvatarFilter, VoiceEffectSettings, VoicePreset } from './types';
import { VIRTUAL_BACKGROUND_OPTIONS, AVATAR_FILTERS, VOICE_PRESETS } from './constants';

interface SettingsModalProps {
  onClose: () => void;
  currentUser: Participant;
  onSettingsChange: (settings: {
    background?: VirtualBackground;
    avatar?: AvatarFilter;
    profanity?: boolean;
    captions?: boolean;
    voiceEffect?: VoiceEffectSettings;
  }) => void;
  isProfanityFilterEnabled: boolean;
  isLiveCaptionsEnabled: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  currentUser,
  onSettingsChange,
  isProfanityFilterEnabled,
  isLiveCaptionsEnabled,
}) => {
  const [background, setBackground] = useState(currentUser.virtualBackground);
  const [avatar, setAvatar] = useState(currentUser.avatarFilter);
  const [profanity, setProfanity] = useState(isProfanityFilterEnabled);
  const [captions, setCaptions] = useState(isLiveCaptionsEnabled);
  const [voiceEffect, setVoiceEffect] = useState(currentUser.voiceEffect);

  const handleApplyChanges = () => {
    onSettingsChange({ background, avatar, profanity, captions, voiceEffect });
    onClose();
  };
  
  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = parseInt(e.target.value, 10);
    const matchingPreset = VOICE_PRESETS.find(p => p.pitch === newPitch);
    setVoiceEffect({ pitch: newPitch, presetName: matchingPreset ? matchingPreset.name : 'Custom' });
  };
  
  const handlePresetClick = (preset: VoicePreset) => {
    setVoiceEffect({ pitch: preset.pitch, presetName: preset.name });
  }

  const hasAvatar = avatar !== 'none';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-lg shadow-xl p-4 sm:p-6 md:p-8 w-full max-w-2xl relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-dark-text-secondary hover:text-white text-2xl">&times;</button>
        <h2 className="text-2xl font-bold mb-6 text-dark-text-primary text-center">Settings</h2>

        <div className="space-y-6 overflow-y-auto pr-2">
          <div className={`${hasAvatar ? 'opacity-50' : ''}`}>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Virtual Background</label>
            {hasAvatar && <p className="text-xs text-yellow-400 mb-2">Disable Avatar Filter to use Virtual Backgrounds.</p>}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {Object.entries(VIRTUAL_BACKGROUND_OPTIONS).map(([category, backgrounds]) => (
                <div key={category}>
                    <h4 className="text-xs font-bold uppercase text-dark-text-secondary mb-2">{category}</h4>
                    <div className="grid grid-cols-3 gap-4">
                    {backgrounds.map(({ id, name, style }) => (
                        <button
                        key={id}
                        disabled={hasAvatar}
                        onClick={() => setBackground(id)}
                        className={`aspect-video rounded-md flex items-center justify-center text-sm font-semibold transition-all relative overflow-hidden disabled:cursor-not-allowed
                            ${background === id && !hasAvatar ? 'ring-2 ring-offset-2 ring-offset-dark-surface ring-brand-secondary' : 'hover:opacity-80'}`}
                        style={id !== 'blur' ? style : {backgroundColor: '#333'}}
                        title={name}
                        >
                        {id === 'blur' && <div className="absolute inset-0 backdrop-blur-sm"></div>}
                        <span className="relative z-10 p-1 bg-black/40 rounded truncate">{name}</span>
                        </button>
                    ))}
                    </div>
                </div>
                ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Avatar Filter</label>
            <p className="text-xs text-gray-400 mb-2">Use a cartoon avatar instead of your camera. Animates when you speak.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                {AVATAR_FILTERS.map(({ id, name, emoji }) => (
                    <button key={id} onClick={() => setAvatar(id as AvatarFilter)}
                     className={`aspect-square rounded-md flex flex-col items-center justify-center text-sm font-semibold transition-all relative overflow-hidden bg-dark-border
                     ${avatar === id ? 'ring-2 ring-offset-2 ring-offset-dark-surface ring-brand-secondary' : 'hover:opacity-80'}`}>
                        <span className="text-3xl">{emoji}</span>
                        <span className="text-xs mt-1">{name}</span>
                    </button>
                ))}
            </div>
          </div>
          
           <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Voice Effects</label>
            <div className="p-3 bg-dark-border rounded-md">
                <label className="text-sm font-semibold">Presets</label>
                <p className="text-xs text-gray-400 mb-2">Select a preset or use the custom slider below.</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
                    {VOICE_PRESETS.map((preset) => (
                        <button 
                            key={preset.name} 
                            onClick={() => handlePresetClick(preset)}
                            className={`aspect-square rounded-md flex flex-col items-center justify-center text-sm font-semibold transition-all relative overflow-hidden bg-dark-surface
                            ${voiceEffect.pitch === preset.pitch ? 'ring-2 ring-offset-2 ring-offset-dark-border ring-brand-secondary' : 'hover:opacity-80'}`}
                        >
                            <span className="text-2xl">{preset.emoji}</span>
                            <span className="text-xs mt-1">{preset.name}</span>
                        </button>
                    ))}
                </div>

                <label htmlFor="pitch" className="text-sm font-semibold">Custom Pitch</label>
                 <div className="flex items-center gap-4 mt-2">
                    <input id="pitch" type="range" min="-1200" max="1200" step="100" value={voiceEffect.pitch} onChange={handlePitchChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
                    <span className="font-mono w-16 text-center p-1 bg-dark-surface rounded">{voiceEffect.pitch / 100} st</span>
                </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Chat &amp; Accessibility</label>
            <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer p-3 bg-dark-border rounded-md">
                    <div>
                        <span className="font-semibold">Profanity Filter</span>
                        <p className="text-xs text-gray-400">Automatically censor inappropriate words in chat.</p>
                    </div>
                    <ToggleSwitch isEnabled={profanity} onToggle={() => setProfanity(!profanity)} />
                </label>
                <label className="flex items-center justify-between cursor-pointer p-3 bg-dark-border rounded-md">
                    <div>
                        <span className="font-semibold">Live Captions</span>
                        <p className="text-xs text-gray-400">Display real-time speech-to-text captions.</p>
                    </div>
                    <ToggleSwitch isEnabled={captions} onToggle={() => setCaptions(!captions)} />
                </label>
             </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end pt-4 border-t border-dark-border">
          <button
            onClick={handleApplyChanges}
            className="px-8 py-2 rounded-md bg-brand-secondary hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ToggleSwitch: React.FC<{isEnabled: boolean, onToggle: () => void}> = ({isEnabled, onToggle}) => (
    <div onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer ${isEnabled ? 'bg-brand-secondary' : 'bg-gray-600'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
);


export default SettingsModal;