import React, { useState, useEffect, useRef } from 'react';

interface PreJoinLobbyProps {
  userName: string;
  meetingId: string;
  onJoinMeeting: () => void;
  onCancel: () => void;
}

const PreJoinLobby: React.FC<PreJoinLobbyProps> = ({
  userName,
  meetingId,
  onJoinMeeting,
  onCancel,
}) => {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    mics: MediaDeviceInfo[];
  }>({ cameras: [], mics: [] });
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Enumerate available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = allDevices.filter((device) => device.kind === 'videoinput');
        const mics = allDevices.filter((device) => device.kind === 'audioinput');
        setDevices({ cameras, mics });
        if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    };
    getDevices();
  }, []);

  // Get camera stream
  useEffect(() => {
    const getStream = async () => {
      try {
        if (isCameraOn && selectedCamera) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedCamera },
            audio: false,
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraError(null);
        } else if (videoRef.current) {
          videoRef.current.srcObject = null;
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      } catch (error) {
        setCameraError('Unable to access camera. Please check permissions.');
        setIsCameraOn(false);
      }
    };

    getStream();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [isCameraOn, selectedCamera]);

  // Test microphone
  useEffect(() => {
    const testMic = async () => {
      try {
        if (isMicOn && selectedMic) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: selectedMic },
            video: false,
          });
          stream.getTracks().forEach((track) => track.stop());
          setMicError(null);
        }
      } catch (error) {
        setMicError('Unable to access microphone. Please check permissions.');
        setIsMicOn(false);
      }
    };

    testMic();
  }, [isMicOn, selectedMic]);

  const handleJoin = () => {
    // Stop preview stream
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onJoinMeeting();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-dark-text-primary text-center">
          Ready to Join?
        </h2>

        <div className="space-y-6">
          {/* Meeting Info */}
          <div className="bg-dark-border rounded-lg p-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-dark-text-secondary">Your Name</p>
                <p className="text-lg font-semibold text-dark-text-primary">{userName}</p>
              </div>
              <div>
                <p className="text-sm text-dark-text-secondary">Meeting ID</p>
                <p className="text-sm font-mono text-dark-text-primary break-all">{meetingId}</p>
              </div>
            </div>
          </div>

          {/* Video Preview */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Camera Preview
            </label>
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            {cameraError && (
              <p className="text-sm text-red-400 mt-2">{cameraError}</p>
            )}
          </div>

          {/* Device Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Camera Selection */}
            <div>
              <label htmlFor="camera" className="block text-sm font-medium text-dark-text-secondary mb-2">
                Camera
              </label>
              <select
                id="camera"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border rounded px-3 py-2 text-dark-text-primary text-sm"
              >
                {devices.cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${devices.cameras.indexOf(camera) + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone Selection */}
            <div>
              <label htmlFor="mic" className="block text-sm font-medium text-dark-text-secondary mb-2">
                Microphone
              </label>
              <select
                id="mic"
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border rounded px-3 py-2 text-dark-text-primary text-sm"
              >
                {devices.mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${devices.mics.indexOf(mic) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Device Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer p-3 bg-dark-border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isCameraOn ? '📹' : '🚫'}</span>
                <div>
                  <p className="font-semibold text-dark-text-primary">Camera</p>
                  <p className="text-xs text-dark-text-secondary">
                    {isCameraOn ? 'On' : 'Off'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCameraOn(!isCameraOn)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  isCameraOn ? 'bg-brand-secondary' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    isCameraOn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 bg-dark-border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isMicOn ? '🎤' : '🚫'}</span>
                <div>
                  <p className="font-semibold text-dark-text-primary">Microphone</p>
                  <p className="text-xs text-dark-text-secondary">
                    {isMicOn ? 'On' : 'Off'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  isMicOn ? 'bg-brand-secondary' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    isMicOn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {micError && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-3">
              <p className="text-sm text-red-400">{micError}</p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-900 bg-opacity-20 border border-brand-secondary rounded-lg p-4">
            <p className="text-sm text-dark-text-secondary">
              <strong>💡 Tip:</strong> Test your camera and microphone before joining. You can adjust settings
              after joining the meeting.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg border border-dark-border text-dark-text-primary hover:bg-dark-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            className="px-6 py-2 rounded-lg bg-brand-secondary hover:bg-blue-500 text-white font-semibold transition-colors flex items-center gap-2"
          >
            <span>✓</span>
            Join Meeting
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreJoinLobby;
