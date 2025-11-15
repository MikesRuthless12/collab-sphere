import React from 'react';

interface ErrorOverlayProps {
  signalingErrorType: 'config' | 'connection' | null;
  onLeave: () => void;
}

const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ signalingErrorType, onLeave }) => {
  return (
    <div className="absolute inset-0 bg-dark-bg z-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Application Error</h1>
        {signalingErrorType === 'config' && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-dark-text-primary mb-2">Signaling Server Not Configured</h2>
            <p className="text-dark-text-secondary">
              The application's real-time communication server has not been set up correctly.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              <strong>Action Required:</strong> Please open the file <code className="bg-dark-surface px-1 py-0.5 rounded">services/webrtcService.ts</code> and replace the placeholder <code className="bg-dark-surface px-1 py-0.5 rounded">'YOUR-GLITCH-PROJECT-NAME'</code> with a valid signaling server URL.
            </p>
          </div>
        )}
        {signalingErrorType === 'connection' && (
           <div className="mb-6">
            <h2 className="text-2xl font-semibold text-dark-text-primary mb-2">Signaling Server Unreachable</h2>
            <p className="text-dark-text-secondary">
              The application could not connect to the real-time communication server. Please check your internet connection and try again. If the problem persists, the server may be offline.
            </p>
          </div>
        )}
        <button
          onClick={onLeave}
          className="bg-brand-secondary hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-full text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};

export default ErrorOverlay;