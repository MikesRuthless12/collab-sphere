import React, { useState } from 'react';
import { RecordingConfig, RecordingFormat, RecordingQuality, RecordingSource } from './types';

interface RecordingModalProps {
  onStart: (config: RecordingConfig) => void;
  onCancel: () => void;
}

const RecordingModal: React.FC<RecordingModalProps> = ({ onStart, onCancel }) => {
  const [source, setSource] = useState<RecordingSource>('screen');
  const [format, setFormat] = useState<RecordingFormat>(RecordingFormat.MP4);
  const [quality, setQuality] = useState<RecordingQuality>(RecordingQuality.HIGH);
  const [includeMic, setIncludeMic] = useState(true);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);

  const handleStart = () => {
    onStart({ source, format, quality, includeMic, includeSystemAudio });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-dark-text-primary text-center">Configure Recording</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Recording Source</label>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSource('screen')} className={`p-3 rounded-md text-sm font-semibold transition-colors ${source === 'screen' ? 'bg-brand-secondary text-white' : 'bg-dark-border'}`}>Screen</button>
                <button onClick={() => setSource('camera')} className={`p-3 rounded-md text-sm font-semibold transition-colors ${source === 'camera' ? 'bg-brand-secondary text-white' : 'bg-dark-border'}`}>Camera</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Output Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as RecordingFormat)}
              className="w-full bg-dark-border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              <option value={RecordingFormat.MP4}>MP4</option>
              <option value={RecordingFormat.WEBM}>WebM</option>
            </select>
          </div>
          
          <div>
             <label className="block text-sm font-medium text-dark-text-secondary mb-2">Audio Sources</label>
             <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer p-2 bg-dark-border rounded-md">
                    <input type="checkbox" checked={includeMic} onChange={(e) => setIncludeMic(e.target.checked)} className="form-checkbox bg-dark-surface border-gray-500" />
                    <span>Include Microphone Audio</span>
                </label>
                {source === 'screen' && (
                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-dark-border rounded-md">
                        <input type="checkbox" checked={includeSystemAudio} onChange={(e) => setIncludeSystemAudio(e.target.checked)} className="form-checkbox bg-dark-surface border-gray-500" />
                        <span>Include System Audio (Tab/Application Audio)</span>
                    </label>
                )}
             </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-md bg-dark-border hover:bg-gray-600 text-dark-text-primary font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="px-6 py-2 rounded-md bg-brand-secondary hover:bg-blue-500 text-white font-semibold transition-colors shadow-md"
          >
            Start Recording
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingModal;