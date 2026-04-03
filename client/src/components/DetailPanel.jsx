function buildDetail(step, currentIndex) {
  if (!step) return 'No step selected.';
  const tools = (step.tools || []).map((t) => {
    const args = t.arguments ? `Args: ${t.arguments}` : '';
    const out = t.output ? `Output: ${t.output}` : '';
    return `- ${t.name || '(tool)'} [${t.status || 'pending'}]\n  ${args}\n  ${out}`.trim();
  });

  return [
    `Step: ${step.id || currentIndex + 1}`,
    step.timestamp ? `Time: ${step.timestamp}` : '',
    '',
    `User: ${step.user_text || ''}`,
    '',
    `Agent summary: ${step.agent_summary || ''}`,
    step.reasoning_summary ? `Reasoning: ${step.reasoning_summary}` : '',
    step.context_summary ? `Context: ${step.context_summary}` : '',
    '',
    `Tools:\n${tools.length ? tools.join('\n') : '(none)'}`,
    '',
    `Output: ${step.agent_output || ''}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export default function DetailPanel({
  steps,
  currentIndex,
  sessionId,
  summary,
  stepContextSummary,
  onGenerateSummary,
  onGenerateStepSummary,
}) {
  const step = steps[currentIndex];
  const detail = steps.length ? buildDetail(step, currentIndex) : 'Load a session to begin.';

  return (
    <aside className="detail">
      <div className="detail-card">
        <div className="detail-title">Session Summary</div>
        <div className="detail-body">{summary}</div>
        <button
          className="summary-btn"
          disabled={!sessionId}
          onClick={onGenerateSummary}
        >
          Generate summary
        </button>
      </div>
      <div className="detail-card">
        <div className="detail-title">Step Details</div>
        <div className="detail-body">{detail}</div>
        <button
          className="summary-btn"
          disabled={!sessionId}
          onClick={onGenerateStepSummary}
        >
          Summarize step (context)
        </button>
        <div className="detail-body" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
          {stepContextSummary}
        </div>
      </div>
    </aside>
  );
}
