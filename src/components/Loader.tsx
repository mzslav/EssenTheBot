import React from 'react';

interface LoaderProps {
  color?: string;
}

export const Loader: React.FC<LoaderProps> = ({ color }) => {
  const tc = color || '#8b5cf6';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
    >
      <style>{`
        @keyframes heartPulse {
          0%   { transform: scale(1);    filter: drop-shadow(0 0 6px #e5354580); }
          10%  { transform: scale(1.25); filter: drop-shadow(0 0 18px #e53545cc); }
          20%  { transform: scale(1.05); filter: drop-shadow(0 0 8px #e5354599); }
          30%  { transform: scale(1.18); filter: drop-shadow(0 0 14px #e53545bb); }
          45%  { transform: scale(1);    filter: drop-shadow(0 0 6px #e5354566); }
          100% { transform: scale(1);    filter: drop-shadow(0 0 6px #e5354580); }
        }
        @keyframes glowRing1 {
          0%,100% { transform: scale(0.85); opacity: 0.45; }
          30%     { transform: scale(1.55); opacity: 0;    }
        }
        @keyframes glowRing2 {
          0%,100% { transform: scale(0.85); opacity: 0.25; }
          30%     { transform: scale(2.0);  opacity: 0;    }
        }
        .heart-svg   { animation: heartPulse 1.3s ease-in-out infinite; transform-origin: center; }
        .glow-ring-1 { animation: glowRing1  1.3s ease-out infinite; }
        .glow-ring-2 { animation: glowRing2  1.3s ease-out 0.08s infinite; }
      `}</style>

      <div className="relative flex items-center justify-center" style={{ width: 90, height: 90 }}>
        <div
          className="glow-ring-2 absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${tc}45 0%, transparent 65%)` }}
        />
        <div
          className="glow-ring-1 absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${tc}80 0%, transparent 58%)` }}
        />
        <svg
          className="heart-svg"
          width="52"
          height="48"
          viewBox="0 0 52 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hgrad" x1="26" y1="0" x2="26" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ff6b7a" />
              <stop offset="100%" stopColor="#c0152a" />
            </linearGradient>
            <radialGradient id="hshine" cx="38%" cy="28%" r="45%">
              <stop offset="0%" stopColor="#ffaab5" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffaab5" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            d="M26 44.5C26 44.5 3 30.5 3 16.5C3 9.596 8.596 4 15.5 4C19.785 4 23.57 6.115 26 9.355C28.43 6.115 32.215 4 36.5 4C43.404 4 49 9.596 49 16.5C49 30.5 26 44.5 26 44.5Z"
            fill="url(#hgrad)"
          />
          <path
            d="M26 44.5C26 44.5 3 30.5 3 16.5C3 9.596 8.596 4 15.5 4C19.785 4 23.57 6.115 26 9.355C28.43 6.115 32.215 4 36.5 4C43.404 4 49 9.596 49 16.5C49 30.5 26 44.5 26 44.5Z"
            fill="url(#hshine)"
          />
          <ellipse cx="19" cy="15" rx="6" ry="4" fill="white" opacity="0.18" />
        </svg>
      </div>
    </div>
  );
};