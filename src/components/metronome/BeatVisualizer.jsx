import React, { useEffect, useState, useRef } from 'react';

// Componente per visualizzare il beat con animazioni creative
export function BeatVisualizer({
  currentBeat,
  totalBeats,
  isPlaying,
  effect = 'pulse',
  bpm = 120,
  isRecording = false,
  compact = false,
}) {
  const [beatTrigger, setBeatTrigger] = useState(0);
  const prevBeatRef = useRef(currentBeat);
  const beatDuration = 60000 / bpm; // ms per beat

  // Trigger animation on beat change
  useEffect(() => {
    if (isPlaying && currentBeat !== prevBeatRef.current) {
      setBeatTrigger(prev => prev + 1);
      prevBeatRef.current = currentBeat;
    }
  }, [currentBeat, isPlaying]);

  const isFirstBeat = currentBeat === 0;
  const containerSize = compact ? 'w-24 h-24' : 'w-40 h-40';

  // Render the selected effect
  const renderEffect = () => {
    switch (effect) {
      case 'pulse':
        return <PulseEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} />;
      case 'ripple':
        return <RippleEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} />;
      case 'flash':
        return <FlashEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} />;
      case 'bounce':
        return <BounceEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} beatDuration={beatDuration} />;
      case 'pendulum':
        return <PendulumEffect currentBeat={currentBeat} totalBeats={totalBeats} isPlaying={isPlaying} beatDuration={beatDuration} />;
      case 'heartbeat':
        return <HeartbeatEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} />;
      case 'radar':
        return <RadarEffect currentBeat={currentBeat} totalBeats={totalBeats} isPlaying={isPlaying} beatDuration={beatDuration} />;
      case 'firework':
        return <FireworkEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} />;
      case 'vinyl':
        return <VinylEffect beatTrigger={beatTrigger} isPlaying={isPlaying} bpm={bpm} />;
      case 'equalizer':
        return <EqualizerEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} totalBeats={totalBeats} currentBeat={currentBeat} />;
      default:
        return <PulseEffect beatTrigger={beatTrigger} isFirstBeat={isFirstBeat} isPlaying={isPlaying} />;
    }
  };

  return (
    <div className={`relative ${containerSize} flex items-center justify-center`}>
      {renderEffect()}
      {/* Beat counter overlay */}
      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`font-bold text-white drop-shadow-lg ${compact ? 'text-2xl' : 'text-4xl'}`}>
            {currentBeat + 1}
          </span>
        </div>
      )}
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}

// EFFECT 1: Pulsazione - Cerchio che pulsa
function PulseEffect({ beatTrigger, isFirstBeat, isPlaying }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        key={beatTrigger}
        className={`
          w-20 h-20 rounded-full transition-all
          ${isPlaying ? 'animate-ping-once' : ''}
          ${isFirstBeat ? 'bg-red-500' : 'bg-blue-500'}
        `}
        style={{
          animation: isPlaying ? 'pulse-beat 0.3s ease-out' : 'none',
        }}
      />
      <style>{`
        @keyframes pulse-beat {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// EFFECT 2: Onde concentriche
function RippleEffect({ beatTrigger, isFirstBeat, isPlaying }) {
  const color = isFirstBeat ? 'border-red-500' : 'border-blue-500';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {isPlaying && (
        <>
          <div
            key={`ripple1-${beatTrigger}`}
            className={`absolute w-8 h-8 rounded-full border-4 ${color}`}
            style={{ animation: 'ripple 0.6s ease-out forwards' }}
          />
          <div
            key={`ripple2-${beatTrigger}`}
            className={`absolute w-8 h-8 rounded-full border-4 ${color}`}
            style={{ animation: 'ripple 0.6s ease-out 0.1s forwards' }}
          />
          <div
            key={`ripple3-${beatTrigger}`}
            className={`absolute w-8 h-8 rounded-full border-4 ${color}`}
            style={{ animation: 'ripple 0.6s ease-out 0.2s forwards' }}
          />
        </>
      )}
      <div className={`w-8 h-8 rounded-full ${isFirstBeat ? 'bg-red-500' : 'bg-blue-500'}`} />
      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// EFFECT 3: Flash luminoso
function FlashEffect({ beatTrigger, isFirstBeat, isPlaying }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
      <div
        key={beatTrigger}
        className={`
          absolute inset-0 rounded-full
          ${isPlaying ? '' : 'opacity-20'}
        `}
        style={{
          background: isFirstBeat
            ? 'radial-gradient(circle, rgba(239,68,68,1) 0%, rgba(239,68,68,0) 70%)'
            : 'radial-gradient(circle, rgba(59,130,246,1) 0%, rgba(59,130,246,0) 70%)',
          animation: isPlaying ? 'flash-beat 0.15s ease-out' : 'none',
        }}
      />
      <style>{`
        @keyframes flash-beat {
          0% { opacity: 1; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.3; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// EFFECT 4: Pallina che rimbalza
function BounceEffect({ beatTrigger, isFirstBeat, isPlaying, beatDuration }) {
  return (
    <div className="relative w-full h-full flex items-end justify-center pb-2">
      <div
        key={beatTrigger}
        className={`
          w-12 h-12 rounded-full shadow-lg
          ${isFirstBeat ? 'bg-red-500' : 'bg-blue-500'}
        `}
        style={{
          animation: isPlaying ? `bounce-ball ${beatDuration}ms ease-in-out infinite` : 'none',
        }}
      />
      {/* Ground line */}
      <div className="absolute bottom-0 left-4 right-4 h-1 bg-gray-600 rounded-full" />
      <style>{`
        @keyframes bounce-ball {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-80px); }
        }
      `}</style>
    </div>
  );
}

// EFFECT 5: Pendolo oscillante
function PendulumEffect({ currentBeat, totalBeats, isPlaying, beatDuration }) {
  const angle = isPlaying ? (currentBeat % 2 === 0 ? -30 : 30) : 0;

  return (
    <div className="relative w-full h-full flex items-start justify-center pt-2">
      {/* Pivot point */}
      <div className="absolute top-2 w-3 h-3 bg-gray-400 rounded-full z-10" />
      {/* Pendulum arm */}
      <div
        className="absolute top-4 w-1 h-24 bg-gray-500 origin-top transition-transform"
        style={{
          transform: `rotate(${angle}deg)`,
          transitionDuration: `${beatDuration}ms`,
          transitionTimingFunction: 'ease-in-out',
        }}
      >
        {/* Pendulum weight */}
        <div className={`
          absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full shadow-lg
          ${currentBeat === 0 ? 'bg-red-500' : 'bg-blue-500'}
        `} />
      </div>
    </div>
  );
}

// EFFECT 6: Cuore pulsante
function HeartbeatEffect({ beatTrigger, isFirstBeat, isPlaying }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        key={beatTrigger}
        className="text-6xl"
        style={{
          animation: isPlaying ? 'heartbeat 0.3s ease-in-out' : 'none',
          filter: isFirstBeat ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))' : 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.6))',
        }}
      >
        {isFirstBeat ? '❤️' : '💗'}
      </div>
      <style>{`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          25% { transform: scale(1.3); }
          50% { transform: scale(1); }
          75% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// EFFECT 7: Scansione radar
function RadarEffect({ currentBeat, totalBeats, isPlaying, beatDuration }) {
  const rotationDeg = (currentBeat / totalBeats) * 360;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Radar circles */}
      <div className="absolute w-32 h-32 rounded-full border border-green-500/30" />
      <div className="absolute w-24 h-24 rounded-full border border-green-500/40" />
      <div className="absolute w-16 h-16 rounded-full border border-green-500/50" />
      <div className="absolute w-8 h-8 rounded-full border border-green-500/60" />
      {/* Center dot */}
      <div className="absolute w-2 h-2 bg-green-500 rounded-full" />
      {/* Radar sweep */}
      {isPlaying && (
        <div
          className="absolute w-full h-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(34, 197, 94, 0.4) 30deg, transparent 60deg)',
            transform: `rotate(${rotationDeg}deg)`,
            transition: `transform ${beatDuration}ms linear`,
          }}
        />
      )}
      {/* Beat blips */}
      {Array.from({ length: totalBeats }).map((_, i) => {
        const blipAngle = (i / totalBeats) * 360 - 90;
        const isActive = i <= currentBeat && isPlaying;
        return (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full transition-all duration-200 ${
              isActive ? 'bg-green-400 scale-150' : 'bg-green-700'
            }`}
            style={{
              transform: `rotate(${blipAngle}deg) translateX(50px)`,
            }}
          />
        );
      })}
    </div>
  );
}

// EFFECT 8: Esplosione di scintille
function FireworkEffect({ beatTrigger, isFirstBeat, isPlaying }) {
  const particleCount = 12;
  const color = isFirstBeat ? 'bg-red-400' : 'bg-blue-400';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {isPlaying && (
        <>
          {Array.from({ length: particleCount }).map((_, i) => (
            <div
              key={`${beatTrigger}-${i}`}
              className={`absolute w-2 h-2 rounded-full ${color}`}
              style={{
                animation: 'firework-particle 0.5s ease-out forwards',
                transform: `rotate(${(360 / particleCount) * i}deg)`,
              }}
            />
          ))}
        </>
      )}
      {/* Center burst */}
      <div
        key={`center-${beatTrigger}`}
        className={`w-6 h-6 rounded-full ${isFirstBeat ? 'bg-red-500' : 'bg-blue-500'}`}
        style={{
          animation: isPlaying ? 'burst 0.3s ease-out' : 'none',
        }}
      />
      <style>{`
        @keyframes firework-particle {
          0% { opacity: 1; transform: rotate(inherit) translateX(0); }
          100% { opacity: 0; transform: rotate(inherit) translateX(60px); }
        }
        @keyframes burst {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// EFFECT 9: Disco vinile rotante
function VinylEffect({ beatTrigger, isPlaying, bpm }) {
  const rotationSpeed = 60 / bpm; // seconds per rotation based on BPM

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Vinyl disc */}
      <div
        className="w-32 h-32 rounded-full bg-gray-900 flex items-center justify-center"
        style={{
          animation: isPlaying ? `spin ${rotationSpeed}s linear infinite` : 'none',
          background: 'repeating-radial-gradient(circle at center, #1a1a1a 0px, #1a1a1a 2px, #2a2a2a 2px, #2a2a2a 4px)',
        }}
      >
        {/* Label */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-gray-900" />
        </div>
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
      </div>
      {/* Needle */}
      <div className="absolute top-2 right-4 w-1 h-16 bg-gray-400 origin-top rotate-[30deg]">
        <div className="absolute bottom-0 w-3 h-3 bg-gray-300 rounded-full -left-1" />
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// EFFECT 10: Barre equalizzatore
function EqualizerEffect({ beatTrigger, isFirstBeat, isPlaying, totalBeats, currentBeat }) {
  const bars = 5;

  return (
    <div className="relative w-full h-full flex items-end justify-center gap-2 pb-4">
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = isPlaying;
        const height = isActive
          ? 20 + Math.sin((currentBeat + i) * 1.5) * 30 + Math.random() * 20
          : 20;
        const color = i === Math.floor(bars / 2) && isFirstBeat
          ? 'bg-red-500'
          : 'bg-blue-500';

        return (
          <div
            key={i}
            className={`w-4 rounded-t transition-all duration-100 ${color}`}
            style={{
              height: `${height}px`,
              boxShadow: isActive ? `0 0 10px ${isFirstBeat ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'}` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

export default BeatVisualizer;
