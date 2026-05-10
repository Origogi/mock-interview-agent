/**
 * SampleResumeButton v4 — Mock 세션 토글 추가
 * HomePage 빈 상태에서 "파일 선택" 우측에 인라인 배치
 * "파일 선택" 버튼과 100% 동일한 형태 (padding, radius, height, font 등)
 * Secondary Cyan (#06b6d4) outline + cyan-tinted background, 텍스트 "샘플 · 이력서 업로드"
 *
 * Mock 세션 로직:
 * - Shift+Click으로 Mock 모드 토글
 * - sessionStorage.setItem('MOCK_SESSION', 'true') → /api/upload 요청 차단
 * - Blob placeholder 바이트 포함 (안전망, 실제 파싱 실패로 보호)
 *
 * 주의:
 * - e.stopPropagation() 필수 (부모 .drop의 파일 피커 트리거 방지)
 * - 드래그 이벤트 핸들러 추가 금지 (부모가 처리)
 * - 반응형: ≤480px → 부모에서 flex-direction: column (Homepage 담당)
 */

const BG_DEFAULT = '#374151';
const BG_HOVER = '#4b5563';
const BG_ACTIVE = '#2d3748';
const TEXT_COLOR = 'rgba(255, 255, 255, 0.9)';
const BG_MOCK_ON = '#10b981';  // green, Mock 활성화 시 피드백
const BG_MOCK_OFF = '#6b7280'; // gray, Mock 비활성화 시 피드백

function createMockFile() {
  // placeholder 바이트: 만약 실제 업로드로 빠지면 서버가 0바이트 거절
  const content = new Blob(['Sample Resume'], { type: 'application/pdf' });
  const file = new File([content], 'sample-resume.pdf', { type: 'application/pdf' });
  return file;
}

export default function SampleResumeButton({ onSelectSampleResume, shouldVisible = true }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleClick = (e) => {
    // 부모의 클릭 핸들러 (파일 피커) 방지
    e.stopPropagation();

    // Shift+Click: Mock 세션 토글
    if (e.shiftKey) {
      const isMock = sessionStorage.getItem('MOCK_SESSION') === 'true';
      if (isMock) {
        sessionStorage.removeItem('MOCK_SESSION');
      } else {
        sessionStorage.setItem('MOCK_SESSION', 'true');
      }
      // UI 피드백 필요하면 토스트/콘솔 로그 추가 가능
      console.log(`Mock session toggled: ${!isMock}`);
      return;
    }

    // 일반 클릭: Sample Resume 업로드
    const mockFile = createMockFile();
    const event = new Event('change', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: { files: [mockFile] },
      enumerable: true,
    });
    onSelectSampleResume?.(event);
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
        color: TEXT_COLOR,
        backgroundColor: BG_DEFAULT,
        border: 'none',
        borderRadius: '999px',
        cursor: 'pointer',
        transition: prefersReducedMotion
          ? 'none'
          : 'all 0.15s cubic-bezier(0.22, 0.61, 0.36, 1)',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = BG_HOVER;
        e.currentTarget.style.opacity = '0.94';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = BG_DEFAULT;
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.backgroundColor = BG_ACTIVE;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.backgroundColor = BG_HOVER;
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 2px #0f172a, 0 0 0 4px #6e74ff';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      샘플 · 이력서 업로드
    </button>
  );
}
