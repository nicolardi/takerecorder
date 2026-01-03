import React from 'react';

export function MetronomeIcon({ className = "w-4 h-4", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Metronome body - trapezoid shape */}
      <path d="M6 22 L8 4 L16 4 L18 22 Z" />
      {/* Pendulum arm */}
      <line x1="12" y1="18" x2="8" y2="6" />
      {/* Pendulum weight */}
      <circle cx="8" cy="6" r="2" fill="currentColor" />
      {/* Base line */}
      <line x1="5" y1="22" x2="19" y2="22" />
    </svg>
  );
}

export default MetronomeIcon;
