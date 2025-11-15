import React, { useState, useEffect } from 'react';
import { Reaction } from './types';

interface ReactionsOverlayProps {
  reactions: Reaction[];
}

const ReactionEmoji: React.FC<{ reaction: Reaction, onComplete: () => void }> = ({ reaction, onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Let the animation finish before removing
      setTimeout(onComplete, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const startX = Math.random() * 80 + 10; // 10% to 90%
  const endX = startX + (Math.random() - 0.5) * 20;

  return (
    <div
      className={`absolute bottom-20 transition-all duration-[2500ms] ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-[80vh]'}`}
      style={{ left: `${startX}%`, transform: `translateX(-${endX}%)` }}
    >
      <span className="text-4xl" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {reaction.emoji}
      </span>
    </div>
  );
};

const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({ reactions }) => {
  const [activeReactions, setActiveReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    if (reactions.length > 0) {
      // Add the latest reaction to the active list
      setActiveReactions(prev => [...prev, reactions[reactions.length - 1]]);
    }
  }, [reactions]);

  const handleAnimationComplete = (id: string) => {
    setActiveReactions(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {activeReactions.map(reaction => (
        <ReactionEmoji
          key={reaction.id}
          reaction={reaction}
          onComplete={() => handleAnimationComplete(reaction.id)}
        />
      ))}
    </div>
  );
};

export default ReactionsOverlay;
