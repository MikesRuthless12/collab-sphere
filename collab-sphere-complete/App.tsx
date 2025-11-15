import React, { useState, useCallback, useMemo } from 'react';
import Lobby from './Lobby';
import MeetingRoom from './MeetingRoom';

export default function App() {
  const [meetingState, setMeetingState] = useState<{ id: string; name: string } | null>(null);
  const userId = useMemo(() => `user-${Math.random().toString(36).substring(2, 9)}`, []);

  const handleStartMeeting = useCallback((name: string) => {
    if (name.trim()) {
      const newMeetingId = `collab-sphere-${Math.random().toString(36).substring(2, 9)}`;
      setMeetingState({ id: newMeetingId, name });
      // Update URL with meeting ID for sharing
      window.history.pushState({}, '', `?meeting=${newMeetingId}`);
    }
  }, []);

  const handleJoinMeeting = useCallback((meetingId: string, name: string) => {
    if (meetingId.trim() && name.trim()) {
      setMeetingState({ id: meetingId, name });
    }
  }, []);

  const handleLeaveMeeting = useCallback(() => {
    setMeetingState(null);
    // Clear meeting ID from URL
    window.history.pushState({}, '', window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg font-sans flex flex-col">
      <div className="flex-1">
        {meetingState ? (
          <MeetingRoom 
            meetingId={meetingState.id} 
            userName={meetingState.name}
            userId={userId}
            onLeave={handleLeaveMeeting} 
          />
        ) : (
          <Lobby onStartMeeting={handleStartMeeting} onJoinMeeting={handleJoinMeeting} />
        )}
      </div>
    </div>
  );
}
