import React, { useState, useEffect } from 'react';
import { SphereIcon } from './SphereIcon';

interface LobbyProps {
  onStartMeeting: (name: string) => void;
  onJoinMeeting?: (meetingId: string, name: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onStartMeeting, onJoinMeeting }) => {
  const [name, setName] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [joinMeetingId, setJoinMeetingId] = useState<string | null>(null);
  
  // Load trusted users count from localStorage
  const targetUserCount = parseInt(localStorage.getItem('trustedUsersCount') || '0', 10);

  // Check for meeting ID in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const meetingId = params.get('meeting');
    if (meetingId) {
      setJoinMeetingId(meetingId);
    }
  }, []);

  useEffect(() => {
    let start = 0;
    const end = targetUserCount;
    if (start === end) return;

    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const animateCount = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const currentVal = Math.floor(progress * (end - start) + start);
      setUserCount(currentVal);
      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };
    
    requestAnimationFrame(animateCount);
  }, [targetUserCount]);


  const handleStart = () => {
    if (name.trim()) {
      // Increment trusted users counter when starting a new meeting
      const currentCount = parseInt(localStorage.getItem('trustedUsersCount') || '0', 10);
      localStorage.setItem('trustedUsersCount', (currentCount + 1).toString());
      onStartMeeting(name.trim());
    }
  };

  const handleJoinMeeting = () => {
    if (name.trim() && joinMeetingId) {
      // Increment trusted users counter when joining via link
      const currentCount = parseInt(localStorage.getItem('trustedUsersCount') || '0', 10);
      localStorage.setItem('trustedUsersCount', (currentCount + 1).toString());
      if (onJoinMeeting) {
        onJoinMeeting(joinMeetingId, name.trim());
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-2xl mx-auto p-4 sm:p-8">
        <SphereIcon className="w-24 h-24 mx-auto text-brand-secondary mb-6" />
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-dark-text-primary mb-4">
          Welcome to <span className="text-brand-secondary">Collab Sphere</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-dark-text-secondary mb-8">
          The next-generation meeting platform with real-time translation, seamless screen sharing, and powerful host controls. Connect and collaborate without language barriers.
        </p>
        
        {joinMeetingId ? (
          <div className="space-y-4">
            <div className="bg-blue-900 bg-opacity-20 border border-brand-secondary rounded-lg p-4 mb-6">
              <p className="text-dark-text-secondary text-sm mb-2">You've been invited to join a meeting</p>
              <p className="text-dark-text-primary font-mono text-xs break-all">{joinMeetingId}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
                placeholder="Enter your name"
                className="bg-dark-surface border border-dark-border text-dark-text-primary text-lg rounded-full py-4 px-6 focus:outline-none focus:ring-2 focus:ring-brand-secondary w-full sm:w-auto"
              />
              <button
                onClick={handleJoinMeeting}
                disabled={!name.trim()}
                className="bg-brand-secondary hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
              >
                Join Meeting
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Enter your name"
              className="bg-dark-surface border border-dark-border text-dark-text-primary text-lg rounded-full py-4 px-6 focus:outline-none focus:ring-2 focus:ring-brand-secondary w-full sm:w-auto"
            />
            <button
              onClick={handleStart}
              disabled={!name.trim()}
              className="bg-brand-secondary hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
            >
              Start New Meeting
            </button>
          </div>
        )}
        
        <div className="mt-12 text-center">
            <p className="text-lg text-dark-text-secondary">
                Number of Trusted Users for Collab Sphere:
                <span className="font-bold text-brand-secondary ml-2">{userCount.toLocaleString()}</span>
            </p>
            <p className="text-xs text-dark-text-secondary mt-2">© 2025 Collab Sphere. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Lobby;