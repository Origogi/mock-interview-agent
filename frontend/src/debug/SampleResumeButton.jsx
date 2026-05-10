/**
 * SampleResumeButton v3 정정 — HomePage 빈 상태에서 "파일 선택" 우측에 인라인 배치
 * "파일 선택" 버튼과 100% 동일한 형태 (padding, radius, height, font 등)
 * Secondary Cyan (#06b6d4) outline + cyan-tinted background, 텍스트 "샘플 · 이력서 업로드"
 *
 * 주의:
 * - e.stopPropagation() 필수 (부모 .drop의 파일 피커 트리거 방지)
 * - 드래그 이벤트 핸들러 추가 금지 (부모가 처리)
 * - 반응형: ≤480px → 부모에서 flex-direction: column (Homepage 담당)
 */

const SECONDARY = '#06b6d4';
const BG_TINTED = 'rgba(6, 182, 212, 0.08)';
const BG_TINTED_HOVER = 'rgba(6, 182, 212, 0.12)';
const SHADOW_DEFAULT = '0 8px 30px -10px rgba(6, 182, 212, 0.3)';

export default function SampleResumeButton({ onSelectSampleResume, shouldVisible = true }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleClick = (e) => {
    // 부모의 클릭 핸들러 (파일 피커) 방지
    e.stopPropagation();
    onSelectSampleResume?.(e);
  };

  if (!shouldVisible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="샘플 이력서 업로드"
      title="분석이 완료된 샘플 이력서로 빠르게 체험하기"
      className="sample-resume-btn-v3"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: '14px 26px',
        fontSize: '16px',
        fontWeight: 600,
        lineHeight: 1.4,
        color: SECONDARY,
        backgroundColor: BG_TINTED,
        border: `1px solid ${SECONDARY}`,
        borderRadius: '999px',
        cursor: 'pointer',
        boxShadow: SHADOW_DEFAULT,
        transition: prefersReducedMotion
          ? 'none'
          : 'all 0.15s cubic-bezier(0.22, 0.61, 0.36, 1)',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = BG_TINTED_HOVER;
        e.currentTarget.style.opacity = '0.94';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = BG_TINTED;
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.15)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.backgroundColor = BG_TINTED_HOVER;
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `${SHADOW_DEFAULT}, 0 0 0 3px rgba(6, 182, 212, 0.2)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = SHADOW_DEFAULT;
      }}
    >
      샘플 · 이력서 업로드
    </button>
  );
}
