import { useState } from 'react';
import SampleResumeButton from '../debug/SampleResumeButton.jsx';
import { INTERVIEW_SESSIONS, INTERVIEW_TOTAL_QUESTIONS } from '../utils/interviewPolicy.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCENT = '#6e74ff';

const createMockFile = () => {
  const blob = new Blob(['Sample Resume'], { type: 'application/pdf' });
  const mockFile = new File([blob], '샘플 이력서.pdf', { type: 'application/pdf' });
  Object.defineProperty(mockFile, 'size', { value: 124000, writable: false });
  return mockFile;
};

export default function HomePage({ onSubmit, onError, onSelectSampleResume, onClearMock, isUploading = false }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);

  // 5상태 가시성 규칙
  // (a) 빈 상태 → visible
  // (b) 드래그 오버 → visible
  // (c) 파일 선택 상태 → hidden
  // (d) 분석 중 → hidden
  // (e) 에러 후 복귀 → visible (file이 null이므로 (a)와 동일)
  const shouldShowSampleButton = !file && !isUploading;

  const handleSelectSample = (e) => {
    e.stopPropagation();
    const mockFile = createMockFile();
    setFile(mockFile);
    onSelectSampleResume?.();
  };

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      onError?.('PDF 파일만 업로드 가능합니다.');
      return;
    }
    if (f.size > MAX_BYTES) {
      onError?.('파일이 너무 큽니다. 최대 5MB까지 업로드 가능합니다.');
      return;
    }
    setFile(f);
  };

  const sizeText = file ? `${(file.size / 1024).toFixed(0)} KB · 검토 준비됨` : '';

  return (
    <div className="screen home">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="eyebrow">
            <span className="dot" style={{ background: ACCENT }} />
            Tech-Interviewer AI · 베타
          </div>
          <h1 className="display">
            당신의 이력서가<br />
            <em style={{ color: ACCENT }}>면접관의 무기</em>가 됩니다.
          </h1>
          <p className="lede">
            이력서 PDF를 분석해 당신의 약점을 정확히 파고드는<br />
            맞춤형 꼬리 질문을 던집니다. 면접 후엔 4개 세션 리포트.
          </p>

          <div
            className={`drop ${drag ? 'is-drag' : ''} ${file ? 'is-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pickFile(e.dataTransfer.files[0]);
            }}
          >
            {!file ? (
              <>
                <div className="drop-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                    <path d="M12 18v-6" />
                    <path d="m9 15 3-3 3 3" />
                  </svg>
                </div>
                <div className="drop-title">이력서 PDF를 여기에 놓아 주세요</div>
                <div className="drop-sub">또는 직접 선택 · 최대 5MB</div>
                <div className="button-group">
                  <label className="btn btn-primary" style={{ background: ACCENT }}>
                    파일 선택
                    <input
                      type="file"
                      accept="application/pdf"
                      hidden
                      onChange={(e) => pickFile(e.target.files[0])}
                    />
                  </label>
                  {onSelectSampleResume && <SampleResumeButton onSelectSampleResume={handleSelectSample} shouldVisible={shouldShowSampleButton} />}
                </div>
              </>
            ) : (
              <>
                <div className="file-card">
                  <div className="file-glyph" style={{ borderColor: ACCENT, color: ACCENT }}>PDF</div>
                  <div className="file-meta">
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{sizeText}</div>
                  </div>
                  <button className="file-x" onClick={() => setFile(null)} aria-label="제거">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  className="btn btn-primary big"
                  style={{ background: ACCENT, marginTop: 24 }}
                  onClick={() => onSubmit?.(file)}
                >
                  분석 시작 <span className="arr">→</span>
                </button>
                <button className="btn-link" onClick={() => {
                  setFile(null);
                  onClearMock?.();
                }}>다른 파일 선택</button>
              </>
            )}
          </div>

          <div className="proof">
            <div className="proof-item">
              <span className="num">{INTERVIEW_TOTAL_QUESTIONS}</span>
              <span className="lbl">총 질문</span>
            </div>
            <div className="proof-sep" />
            <div className="proof-item">
              <span className="num">{INTERVIEW_SESSIONS.length}</span>
              <span className="lbl">고정 세션</span>
            </div>
            <div className="proof-sep" />
            <div className="proof-item">
              <span className="num">~3<small>min</small></span>
              <span className="lbl">분석 시간</span>
            </div>
          </div>
        </div>

        <div
          className="hero-glow"
          style={{ background: `radial-gradient(60% 60% at 50% 0%, ${ACCENT}24 0%, transparent 70%)` }}
        />
      </section>

      <section className="home-how">
        <h2 className="section-h">3 단계, 진짜 면접처럼.</h2>
        <div className="how-grid">
          {[
            { n: '01', t: '이력서 분석', d: 'PyPDF2로 텍스트 추출, LLM이 기술 스택·프로젝트·공격 포인트를 구조화합니다.' },
            { n: '02', t: '20문항 세션 면접', d: 'CS, 프레임워크, 문제 해결, 커뮤니케이션 순서로 5문항씩 진행합니다.' },
            { n: '03', t: '종합 리포트', d: '세션별 점수와 문항 피드백을 묶어 강점·약점·개선 방향을 구체적으로 제시합니다.' },
          ].map((s) => (
            <article key={s.n} className="how-card">
              <div className="how-num">{s.n}</div>
              <div className="how-t">{s.t}</div>
              <div className="how-d">{s.d}</div>
            </article>
          ))}
        </div>
      </section>

      <footer className="home-foot">
        <span>© 2026 Tech-Interviewer AI</span>
        <span>built with LangGraph · OpenAI · React</span>
      </footer>
    </div>
  );
}
