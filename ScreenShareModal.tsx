import React, { useState, useRef } from 'react';
import { ScreenShareType } from './webrtcService';

interface ScreenShareModalProps {
  onStartShare: (type: ScreenShareType, areaConstraints?: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ScreenShareModal: React.FC<ScreenShareModalProps> = ({ onStartShare, onCancel, isLoading = false }) => {
  const [shareType, setShareType] = useState<ScreenShareType>('screen');
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = Math.abs(x - startPos.x);
    const height = Math.abs(y - startPos.y);

    // Draw the selection rectangle
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(
        Math.min(startPos.x, x),
        Math.min(startPos.y, y),
        width,
        height
      );
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.min(startPos.x, x),
        Math.min(startPos.y, y),
        width,
        height
      );
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const area = {
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    };

    if (area.width > 10 && area.height > 10) {
      setSelectedArea(area);
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const handleStartShare = () => {
    if (shareType === 'area') {
      if (!selectedArea || selectedArea.width === 0 || selectedArea.height === 0) {
        alert('Please select an area to share');
        return;
      }
      onStartShare('area', selectedArea);
    } else {
      onStartShare(shareType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-dark-text-secondary hover:text-white text-2xl disabled:opacity-50"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-6 text-dark-text-primary">Share Your Screen</h2>

        {!isSelectingArea ? (
          <div className="space-y-4">
            <p className="text-dark-text-secondary mb-4">Choose what you want to share:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Entire Screen */}
              <button
                onClick={() => setShareType('screen')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  shareType === 'screen'
                    ? 'border-brand-secondary bg-blue-900 bg-opacity-20'
                    : 'border-dark-border hover:border-brand-secondary'
                }`}
              >
                <div className="text-2xl mb-2">🖥️</div>
                <div className="font-semibold text-dark-text-primary">Entire Screen</div>
                <div className="text-sm text-dark-text-secondary">Share your entire display</div>
              </button>

              {/* Application Window */}
              <button
                onClick={() => setShareType('window')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  shareType === 'window'
                    ? 'border-brand-secondary bg-blue-900 bg-opacity-20'
                    : 'border-dark-border hover:border-brand-secondary'
                }`}
              >
                <div className="text-2xl mb-2">🪟</div>
                <div className="font-semibold text-dark-text-primary">Application Window</div>
                <div className="text-sm text-dark-text-secondary">Share a specific app window</div>
              </button>

              {/* Browser Tab */}
              <button
                onClick={() => setShareType('tab')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  shareType === 'tab'
                    ? 'border-brand-secondary bg-blue-900 bg-opacity-20'
                    : 'border-dark-border hover:border-brand-secondary'
                }`}
              >
                <div className="text-2xl mb-2">📑</div>
                <div className="font-semibold text-dark-text-primary">Browser Tab</div>
                <div className="text-sm text-dark-text-secondary">Share just this tab</div>
              </button>

              {/* Custom Area */}
              <button
                onClick={() => {
                  setShareType('area');
                  setIsSelectingArea(true);
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  shareType === 'area'
                    ? 'border-brand-secondary bg-blue-900 bg-opacity-20'
                    : 'border-dark-border hover:border-brand-secondary'
                }`}
              >
                <div className="text-2xl mb-2">📍</div>
                <div className="font-semibold text-dark-text-primary">Custom Area</div>
                <div className="text-sm text-dark-text-secondary">Select a specific region</div>
              </button>
            </div>

            <div className="bg-dark-border rounded-lg p-4 mt-6">
              <p className="text-sm text-dark-text-secondary">
                <strong>Privacy Tip:</strong> Only the content you select will be shared. Your browser may ask for permission to access your screen.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg border border-dark-border text-dark-text-primary hover:bg-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleStartShare}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg bg-brand-secondary hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Starting...
                  </>
                ) : (
                  <>
                    <span>▶️</span>
                    Start Sharing
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-dark-text-secondary mb-4">
              Click and drag to select the area you want to share:
            </p>

            <div className="bg-dark-border rounded-lg p-2">
              <canvas
                ref={canvasRef}
                width={window.innerWidth - 200}
                height={400}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDrawing(false)}
                className="w-full bg-black rounded cursor-crosshair border border-dark-border"
              />
            </div>

            {selectedArea && (
              <div className="bg-blue-900 bg-opacity-20 border border-brand-secondary rounded-lg p-3">
                <p className="text-sm text-dark-text-secondary">
                  Selected area: {selectedArea.width.toFixed(0)} × {selectedArea.height.toFixed(0)} pixels
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsSelectingArea(false);
                  setSelectedArea(null);
                }}
                className="px-6 py-2 rounded-lg border border-dark-border text-dark-text-primary hover:bg-dark-border transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleStartShare}
                disabled={isLoading || !selectedArea || selectedArea.width === 0 || selectedArea.height === 0}
                className="px-6 py-2 rounded-lg bg-brand-secondary hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Starting...
                  </>
                ) : (
                  <>
                    <span>▶️</span>
                    Share Selected Area
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenShareModal;
