import { useEffect, useRef } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function TapeDeck({
  session,
  playing,
  speed,
  currentIndex,
  totalSteps,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onScrub,
}) {
  const barsRef = useRef([]);
  const vizTimerRef = useRef(null);

  const seconds = Math.floor(currentIndex * 1.5);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const frames = Math.floor((currentIndex * 12) % 100);
  const timeCode = `${pad(minutes)}:${pad(secs)}:${pad(frames)}`;

  useEffect(() => {
    if (playing) {
      if (vizTimerRef.current) return;
      vizTimerRef.current = setInterval(() => {
        barsRef.current.forEach((bar) => {
          if (bar) bar.style.height = `${Math.random() * 80 + 10}%`;
        });
      }, 90);
    } else {
      if (vizTimerRef.current) {
        clearInterval(vizTimerRef.current);
        vizTimerRef.current = null;
      }
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = '10%';
      });
    }
    return () => {
      if (vizTimerRef.current) {
        clearInterval(vizTimerRef.current);
        vizTimerRef.current = null;
      }
    };
  }, [playing]);

  const deckClass = [
    'tape-deck widget-container',
    playing ? 'is-playing is-recording' : '',
  ]
    .join(' ')
    .trim();

  const statusText = playing ? 'Playing... keep it loud!' : totalSteps > 0 ? 'Paused.' : 'Ready to replay';
  const title = session?.title || 'Playback';

  return (
    <div className={deckClass}>
      <div className="widget-header">
        <span className="brand-label">PLAYBACK</span>
        <span className="deck-title">{title}</span>
      </div>
      <div className="visualizer-stage">
        <div className="tape-reel" />
        <div className="eq-bars">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bar"
              ref={(el) => (barsRef.current[i] = el)}
            />
          ))}
        </div>
        <button
          className="record-trigger"
          title="Play/Pause"
          onClick={playing ? onPause : onPlay}
        >
          <div className="trigger-icon" />
        </button>
      </div>
      <div className="widget-footer">
        <div className="status-row">
          <div className="main-readout">{statusText}</div>
          <div className="timer-display">{timeCode}</div>
        </div>
        <div className="scrub-row">
          <input
            type="range"
            min={0}
            max={totalSteps > 0 ? totalSteps - 1 : 0}
            value={currentIndex}
            onChange={(e) => onScrub(parseInt(e.target.value, 10))}
          />
          <div className="deck-meta">
            <span>Step {totalSteps ? currentIndex + 1 : 0} / {totalSteps}</span>
            <span>{speed}x</span>
          </div>
        </div>
        <div className="deck-controls">
          <button title="Previous" onClick={onPrev}>⟲</button>
          <button title="Play" onClick={onPlay}>▶</button>
          <button title="Pause" onClick={onPause}>❚❚</button>
          <button title="Next" onClick={onNext}>⟳</button>
        </div>
      </div>
    </div>
  );
}
