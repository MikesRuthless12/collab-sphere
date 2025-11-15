import React, { useState, useEffect } from 'react';
import { Message } from './types';

interface MeetingSummaryModalProps {
  onClose: () => void;
  meetingId: string;
  meetingDuration: number;
  participants: Array<{ name: string; joinTime: number; leaveTime?: number }>;
  messages: Message[];
  recordingUrl?: string;
}

interface MeetingSummary {
  title: string;
  duration: string;
  participantCount: number;
  participants: string[];
  messageCount: number;
  keyTopics: string[];
  summary: string;
  generatedAt: string;
}

const MeetingSummaryModal: React.FC<MeetingSummaryModalProps> = ({
  onClose,
  meetingId,
  meetingDuration,
  participants,
  messages,
  recordingUrl,
}) => {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Extract text from messages
        const messageTexts = messages
          .filter((m) => m.type === 'TEXT')
          .map((m) => (m.content as any).originalText)
          .join(' ');

        // Generate summary using Gemini API
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.VITE_GOOGLE_API_KEY || '',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Please analyze this meeting transcript and provide:
1. A brief summary (2-3 sentences)
2. Key topics discussed (as a list)
3. Action items (if any)

Meeting transcript:
${messageTexts || 'No messages recorded'}

Format your response as JSON with keys: summary, keyTopics (array), actionItems (array)`,
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate summary');
        }

        const data = await response.json();
        const generatedText =
          data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse the response
        let parsed = { summary: '', keyTopics: [], actionItems: [] };
        try {
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Error parsing summary response:', e);
        }

        const meetingSummary: MeetingSummary = {
          title: `Meeting ${meetingId.slice(-8)}`,
          duration: formatDuration(meetingDuration),
          participantCount: participants.length,
          participants: participants.map((p) => p.name),
          messageCount: messages.length,
          keyTopics: parsed.keyTopics || [],
          summary: parsed.summary || 'No summary available',
          generatedAt: new Date().toLocaleString(),
        };

        setSummary(meetingSummary);
      } catch (err) {
        console.error('Error generating summary:', err);
        setError('Failed to generate meeting summary. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    generateSummary();
  }, [meetingId, meetingDuration, participants, messages]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const downloadSummary = () => {
    if (!summary) return;

    const content = `
MEETING SUMMARY
===============

Meeting ID: ${meetingId}
Duration: ${summary.duration}
Date: ${summary.generatedAt}
Participants: ${summary.participantCount}

PARTICIPANTS
------------
${summary.participants.map((p) => `• ${p}`).join('\n')}

SUMMARY
-------
${summary.summary}

KEY TOPICS
----------
${summary.keyTopics.length > 0 ? summary.keyTopics.map((t) => `• ${t}`).join('\n') : 'No topics identified'}

STATISTICS
----------
Total Messages: ${summary.messageCount}
Total Participants: ${summary.participantCount}
Meeting Duration: ${summary.duration}

Generated: ${summary.generatedAt}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${meetingId.slice(-8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!summary) return;

    const content = `
Meeting Summary: ${summary.title}
Duration: ${summary.duration}
Participants: ${summary.participants.join(', ')}

Summary: ${summary.summary}

Key Topics: ${summary.keyTopics.join(', ')}
    `;

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-text-secondary hover:text-white text-2xl"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-6 text-dark-text-primary">Meeting Summary</h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-dark-text-secondary">Generating meeting summary...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        ) : summary ? (
          <div className="space-y-6 overflow-y-auto pr-2">
            {/* Meeting Info */}
            <div className="bg-dark-border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-text-secondary uppercase">Duration</p>
                  <p className="text-lg font-semibold text-dark-text-primary">{summary.duration}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-text-secondary uppercase">Participants</p>
                  <p className="text-lg font-semibold text-dark-text-primary">{summary.participantCount}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-text-secondary uppercase">Messages</p>
                  <p className="text-lg font-semibold text-dark-text-primary">{summary.messageCount}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-text-secondary uppercase">Generated</p>
                  <p className="text-sm font-semibold text-dark-text-primary">{summary.generatedAt}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-lg font-semibold text-dark-text-primary mb-2">Summary</h3>
              <p className="text-dark-text-secondary leading-relaxed">{summary.summary}</p>
            </div>

            {/* Key Topics */}
            {summary.keyTopics.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-dark-text-primary mb-3">Key Topics</h3>
                <div className="space-y-2">
                  {summary.keyTopics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="bg-dark-border rounded-lg p-3 text-dark-text-secondary"
                    >
                      • {topic}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            <div>
              <h3 className="text-lg font-semibold text-dark-text-primary mb-3">Participants</h3>
              <div className="bg-dark-border rounded-lg p-4 space-y-2">
                {summary.participants.map((participant, idx) => (
                  <p key={idx} className="text-dark-text-secondary">
                    • {participant}
                  </p>
                ))}
              </div>
            </div>

            {recordingUrl && (
              <div className="bg-blue-900 bg-opacity-20 border border-brand-secondary rounded-lg p-4">
                <p className="text-sm text-dark-text-secondary mb-2">
                  <strong>Recording Available:</strong> This meeting was recorded and can be accessed separately.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 justify-end pt-4 border-t border-dark-border">
          {summary && !isLoading && (
            <>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 rounded-lg border border-dark-border text-dark-text-primary hover:bg-dark-border transition-colors text-sm"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
              <button
                onClick={downloadSummary}
                className="px-4 py-2 rounded-lg border border-dark-border text-dark-text-primary hover:bg-dark-border transition-colors text-sm"
              >
                📥 Download
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-brand-secondary hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingSummaryModal;
