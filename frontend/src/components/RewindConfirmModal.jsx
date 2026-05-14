import { useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

export default function RewindConfirmModal({
  open,
  questionNumber,
  onConfirm,
  onCancel,
}) {
  const secondaryRef = useRef(null);
  const primaryRef = useRef(null);
  const closeRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (open) {
      previousActiveRef.current = document.activeElement;
      requestAnimationFrame(() => secondaryRef.current?.focus());
    } else if (previousActiveRef.current) {
      try {
        previousActiveRef.current.focus();
      } catch {
        /* element gone */
      }
      previousActiveRef.current = null;
    }
  }, [open]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = [secondaryRef.current, primaryRef.current, closeRef.current].filter(Boolean);
        if (!focusables.length) return;
        const active = document.activeElement;
        const idx = focusables.indexOf(active);
        if (idx === -1) {
          e.preventDefault();
          focusables[0].focus();
          return;
        }
        const next = e.shiftKey
          ? focusables[(idx - 1 + focusables.length) % focusables.length]
          : focusables[(idx + 1) % focusables.length];
        e.preventDefault();
        next.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, handleCancel]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleCancel();
  };

  if (!open) return null;

  return (
    <div className="rewind-backdrop" onClick={handleBackdropClick}>
      <div
        className="rewind-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewind-title"
        aria-describedby="rewind-desc"
      >
        <button
          ref={closeRef}
          type="button"
          className="rewind-close"
          aria-label="닫기"
          onClick={handleCancel}
        >
          ×
        </button>
        <div className="rewind-icon" aria-hidden="true">
          <RotateCcw size={18} />
        </div>
        <h2 id="rewind-title" className="rewind-title">
          이 질문으로 되감기
        </h2>
        <p id="rewind-desc" className="rewind-body">
          Q{questionNumber} 답변 전으로 돌아갑니다. Q{questionNumber} 이후의 답변,
          평가, 리포트는 무효화되고 다시 생성됩니다.
        </p>
        <div className="rewind-actions">
          <button
            ref={secondaryRef}
            type="button"
            className="rewind-cta-secondary"
            onClick={handleCancel}
          >
            취소
          </button>
          <button
            ref={primaryRef}
            type="button"
            className="rewind-cta-primary"
            onClick={onConfirm}
          >
            되감기 실행
          </button>
        </div>
      </div>
    </div>
  );
}
