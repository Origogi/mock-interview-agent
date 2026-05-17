import { Clock3 } from 'lucide-react';

export default function TimeMachineOverlay({ open, phase = 'running', questionNumber }) {
  if (!open) return null;

  const isDone = phase === 'done' || phase === 'revealing';
  const isRevealing = phase === 'revealing';
  const overlayClass = [
    'time-machine-overlay',
    isDone ? 'is-done' : '',
    isRevealing ? 'is-revealing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClass}
      role="status"
      aria-live="polite"
      aria-busy={phase === 'running'}
    >
      <div className="tm-panel">
        <div className="tm-clock" aria-hidden="true">
          <Clock3 size={40} strokeWidth={1.7} />
          <span className="tm-hand" />
        </div>
        <div className="tm-copy">
          <div className="tm-title">{isDone ? '되감기 완료' : '타임머신 실행 중'}</div>
          <div className="tm-subtitle">
            {isDone
              ? `Q${questionNumber}부터 Q20까지 다시 답변할 준비가 되었어요.`
              : `세션 경계와 관계없이 Q${questionNumber} 이후 전체 흐름을 무효화하고 있어요.`}
          </div>
        </div>
      </div>
    </div>
  );
}
