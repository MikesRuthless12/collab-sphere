import React, { useState, useEffect } from 'react';
import { Caption } from './types';

interface CaptionsDisplayProps {
    captions: Caption[];
}

const CaptionsDisplay: React.FC<CaptionsDisplayProps> = ({ captions }) => {
    const [visibleCaption, setVisibleCaption] = useState<Caption | null>(null);
    const timeoutRef = React.useRef<number | null>(null);
    
    useEffect(() => {
        if(captions.length > 0) {
            const latestCaption = captions[captions.length - 1];
            setVisibleCaption(latestCaption);

            if(timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = window.setTimeout(() => {
                setVisibleCaption(null);
            }, 4000); // Caption disappears after 4 seconds of inactivity
        }
        
        return () => {
            if(timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
    }, [captions]);

    if (!visibleCaption) {
        return null;
    }

    return (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 pointer-events-none">
           <p className="text-center text-lg md:text-xl font-semibold text-white py-1 px-3 bg-black/60 rounded-md" style={{ textShadow: '1px 1px 2px black' }}>
               {visibleCaption.text}
           </p>
        </div>
    );
};

export default CaptionsDisplay;
