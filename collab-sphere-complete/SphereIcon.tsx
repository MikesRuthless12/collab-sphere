import React from 'react';

export const SphereIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sphereGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#1e3a8a', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#sphereGradient)" />
    <path
      d="M 50,10 A 40,40 0 0,1 50,90"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M 10,50 A 40,40 0 0,1 90,50"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="1.5"
      fill="none"
      strokeDasharray="5, 5"
    />
    <ellipse
      cx="50"
      cy="50"
      rx="20"
      ry="39"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);
