export default function Topbar({
  session,
  playing,
  speed,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onSpeedChange,
  onFileLoad,
  isMinimal,
  onToggleMinimal,
}) {
  const title = session?.title || 'Playback';
  const createdAt = session?.createdAt || '';
  const meta = createdAt ? `${title} • ${createdAt}` : title;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (file) onFileLoad(file);
    e.target.value = '';
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">▶</div>
        <div>
          <div className="title">Playback</div>
          <div className="subtitle">{session ? meta : 'No session loaded'}</div>
        </div>
      </div>
      <div className="controls">
        <button onClick={onPlay}>Play</button>
        <button onClick={onPause}>Pause</button>
        <button onClick={onPrev}>Prev</button>
        <button onClick={onNext}>Next</button>
        <label className="speed">
          Speed
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
          </select>
        </label>
        <label className="file">
          Load JSON/JSONL
          <input type="file" accept=".json,.jsonl" onChange={handleFile} />
        </label>
        <button onClick={onToggleMinimal} title="Toggle minimal view">
          Minimal
        </button>
      </div>
    </header>
  );
}
