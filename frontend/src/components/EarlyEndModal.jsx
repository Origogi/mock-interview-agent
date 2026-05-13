import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * EarlyEndModal — 면접 조기 종료 확인 모달
 *
 * answeredCount 기준 분기:
 *  - >= threshold (3): Case A "결과 보기" (accent purple) → 부분 리포트 진입
 *  - <  threshold (3): Case B "그래도 종료" (warning red) → 폐기 후 Page 1
 *
 * @param {boolean} open
 * @param {number} answeredCount    현재까지의 답변 수
 * @param {number} maxQuestions     총 문항 수 (기본 5)
 * @param {number} threshold        분기 기준 (기본 3)
 * @param {() => Promise<void>} onConfirm  Primary CTA 핸들러 (async — 내부에서 로딩 처리)
 * @param {() => void} onCancel     Secondary / Esc / Backdrop 핸들러
 */
export default function EarlyEndModal({
  open,
  answeredCount = 0,
  maxQuestions = 5,
  threshold = 3,
  onConfirm,
  onCancel,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const secondaryRef = useRef(null);
  const primaryRef = useRef(null);
  const closeRef = useRef(null);
  const previousActiveRef = useRef(null);

  const isSufficient = answeredCount >= threshold;
  const title = '면접을 종료하시겠어요?';
  const body = isSufficient
    ? `지금까지의 답변 ${answeredCount}/${maxQuestions}으로 부분 리포트를 받을 수 있어요.\n면접을 다시 시작하면 결과는 사라집니다.`
    : answeredCount === 0
    ? '아직 답변이 없어 리포트가 생성되지 않습니다.\n그래도 종료하시겠어요?'
    : `답변이 ${answeredCount}개로 부족해 리포트가 생성되지 않습니다.\n그래도 종료하시겠어요?`;
  const primaryLabel = isSufficient ? '결과 보기' : '그래도 종료';
  const primaryLoadingLabel = isSufficient ? '결과 생성 중...' : '종료 중...';
  const primaryVariantClass = isSufficient
    ? 'early-end-cta-primary is-accent'
    : 'early-end-cta-primary is-danger';

  // Save previous focus + restore on close
  useEffect(() => {
    if (open) {
      previousActiveRef.current = document.activeElement;
      // Focus secondary CTA after mount
      requestAnimationFrame(() => {
        secondaryRef.current?.focus();
      });
    } else if (previousActiveRef.current) {
      try {
        previousActiveRef.current.focus();
      } catch {
        /* element gone — ignore */
      }
      previousActiveRef.current = null;
    }
  }, [open]);

  const handleCancel = useCallback(() => {
    if (isLoading) return;
    onCancel?.();
  }, [isLoading, onCancel]);

  // Esc / focus trap
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
        // Manual focus trap: Secondary → Primary → Close → Secondary (loop)
        const focusables = [secondaryRef.current, primaryRef.current, closeRef.current].filter(Boolean);
        if (focusables.length === 0) return;
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
    if (e.target !== e.currentTarget) return;
    handleCancel();
  };

  const handlePrimary = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm?.();
    } catch (err) {
      // Parent handles toast / error UI. Just release loading.
      console.warn('EarlyEndModal.onConfirm error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="early-end-backdrop"
      onClick={handleBackdropClick}
      aria-hidden={false}
    >
      <div
        className="early-end-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="early-end-title"
        aria-describedby="early-end-desc"
      >
        <button
          ref={closeRef}
          type="button"
          className="early-end-close"
          aria-label="닫기"
          onClick={handleCancel}
          disabled={isLoading}
        >
          ×
        </button>
        <h2 id="early-end-title" className="early-end-title">
          {title}
        </h2>
        <p id="early-end-desc" className="early-end-body">
          {body}
        </p>
        <div className="early-end-actions">
          <button
            ref={secondaryRef}
            type="button"
            className="early-end-cta-secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            계속 면접보기
          </button>
          <button
            ref={primaryRef}
            type="button"
            className={`${primaryVariantClass}${isLoading ? ' is-loading' : ''}`}
            onClick={handlePrimary}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {primaryLoadingLabel}
              </>
            ) : (
              primaryLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
