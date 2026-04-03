import { useEffect, useRef } from 'react';
import TapeDeck from './TapeDeck';

function truncate(text, len = 120) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len - 3) + '...' : text;
}

function TimelineRow({ step, index, isActive, onClick }) {
  const tools = step.tools?.length
    ? step.tools.map((t) => t.name).filter(Boolean).join(', ')
    : '';

  return (
    <div
      className={`lane-row${isActive ? ' active' : ''}`}
      data-index={index}
      style={{ '--i': index }}
      onClick={onClick}
    >
      <div className="cell user">{truncate(step.user_text || '(no user text)')}</div>
      <div className="cell agent">{truncate(step.agent_summary || step.reasoning_summary || '')}</div>
      <div className="cell muted tools">{truncate(tools || '(no tools)')}</div>
      <div className="cell output">{truncate(step.agent_output || '')}</div>
    </div>
  );
}

export default function Timeline({
  steps,
  currentIndex,
  playing,
  speed,
  session,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onScrub,
  onStepClick,
}) {
  const rowsRef = useRef(null);

  // Scroll active row into view
  useEffect(() => {
    const container = rowsRef.current;
    if (!container) return;
    const activeRow = container.querySelector(`.lane-row[data-index="${currentIndex}"]`);
    if (!activeRow) return;
    const rowTop = activeRow.offsetTop;
    const rowBottom = rowTop + activeRow.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (rowTop < viewTop + 8) {
      container.scrollTo({ top: Math.max(0, rowTop - 8), behavior: 'smooth' });
    } else if (rowBottom > viewBottom - 8) {
      container.scrollTo({ top: rowBottom - container.clientHeight + 8, behavior: 'smooth' });
    }
  }, [currentIndex]);

  return (
    <section className="timeline">
      <div className="lane-header">
        <div className="lane-title lane-user">User</div>
        <div className="lane-title lane-agent">Agent</div>
        <div className="lane-title lane-tools">Tools</div>
        <div className="lane-title lane-output">Output</div>
      </div>
      <TapeDeck
        session={session}
        playing={playing}
        speed={speed}
        currentIndex={currentIndex}
        totalSteps={steps.length}
        onPlay={onPlay}
        onPause={onPause}
        onPrev={onPrev}
        onNext={onNext}
        onScrub={onScrub}
      />
      <div className="lane-rows" ref={rowsRef}>
        {steps.map((step, index) => (
          <TimelineRow
            key={step.id || index}
            step={step}
            index={index}
            isActive={index === currentIndex}
            onClick={() => onStepClick(index)}
          />
        ))}
      </div>
    </section>
  );
}
