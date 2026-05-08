import { useEffect, useRef, useState } from 'react';

const ACCENT = '#6e74ff';
const LOADER_OUT_MS = 400;

export default function SummaryPage({ data, loading, onStart, accent = ACCENT }) {
  const [loadedKey, setLoadedKey] = useState(0);
  const [showLoader, setShowLoader] = useState(loading);
  const [loaderLeaving, setLoaderLeaving] = useState(false);
  const prevLoading = useRef(loading);

  useEffect(() => {
    if (loading && !prevLoading.current) {
      setShowLoader(true);
      setLoaderLeaving(false);
    }
    if (!loading && prevLoading.current) {
      setLoaderLeaving(true);
      const t = setTimeout(() => {
        setShowLoader(false);
        setLoaderLeaving(false);
        setLoadedKey((k) => k + 1);
      }, LOADER_OUT_MS);
      prevLoading.current = loading;
      return () => clearTimeout(t);
    }
    prevLoading.current = loading;
  }, [loading]);

  const renderSummary = !loading && !showLoader;

  return (
    <div className="screen summary summary-host" data-screen-label="02 Summary">
      {showLoader && <SummaryLoader accent={accent} leaving={loaderLeaving} />}
      {renderSummary && (
        <SummaryLoaded
          data={data}
          accent={accent}
          onStart={onStart}
          animKey={loadedKey}
        />
      )}
    </div>
  );
}

function SummaryLoader({ accent, leaving }) {
  return (
    <div className={`summary-loader-fade${leaving ? ' is-leaving' : ''}`}>
      <div className="loader-stack">
        <div className="loader-dot" style={{ background: accent }} />
        <div className="loader-dot" style={{ background: accent, animationDelay: '0.15s' }} />
        <div className="loader-dot" style={{ background: accent, animationDelay: '0.3s' }} />
      </div>
      <div className="loader-title">이력서를 정밀 분석하는 중</div>
      <div className="loader-sub">기술 스택, 핵심 프로젝트, 공격 포인트를 추출합니다.</div>
      <div className="loader-bar">
        <div className="loader-bar-fill" style={{ background: accent }} />
      </div>
    </div>
  );
}

function SummaryLoaded({ data, onStart, accent, animKey }) {
  const d = {
    name: data?.name || '지원자',
    bio: data?.bio || '',
    workExperience: data?.workExperience ?? [],
    techStack: data?.techStack ?? [],
    projects: data?.projects ?? [],
    strengths: data?.strengths ?? [],
    weakPoints: data?.weakPoints ?? [],
  };

  return (
    <div className="sum-wrap summary-loaded-fade" key={animKey}>
      <header className="sum-head">
        <div className="eyebrow">
          <span className="dot" style={{ background: accent }} />
          분석 완료
        </div>
        <h1 className="display sm">
          면접관이 <em style={{ color: accent }}>{d.name}</em>님의<br />
          이력서를 모두 읽었습니다.
        </h1>
        {d.bio && <p className="lede sm">{d.bio}</p>}
      </header>

      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">{d.workExperience.length}</div>
          <div className="stat-lbl">경력</div>
        </div>
        <div className="stat">
          <div className="stat-num">{d.techStack.length}</div>
          <div className="stat-lbl">기술 스택</div>
        </div>
        <div className="stat">
          <div className="stat-num">{d.projects.length}</div>
          <div className="stat-lbl">주요 프로젝트</div>
        </div>
        <div className="stat">
          <div className="stat-num" style={{ color: accent }}>{d.weakPoints.length}</div>
          <div className="stat-lbl">공격 포인트</div>
        </div>
      </div>

      <section className="sum-sect">
        <h2 className="sect-h">경력</h2>
        <ol className="career">
          {d.workExperience.map((w, i) => (
            <li key={i} className="career-row">
              <div className="career-period">{w.period}</div>
              <div className="career-mid">
                <div className="career-co">{w.company}</div>
                <div className="career-role">{w.role}</div>
              </div>
              <div
                className="career-marker"
                style={{ background: i === 0 ? accent : '#3a3a3c' }}
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="sum-sect">
        <h2 className="sect-h">파악된 기술 스택</h2>
        <div className="chips">
          {d.techStack.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      </section>

      <section className="sum-sect">
        <h2 className="sect-h">주목할 만한 프로젝트</h2>
        <div className="proj-grid">
          {d.projects.map((p, i) => (
            <article key={i} className="proj">
              <div className="proj-idx">P{String(i + 1).padStart(2, '0')}</div>
              <h3 className="proj-name">{p.name}</h3>
              <p className="proj-desc">{p.description}</p>
              <div className="proj-tech">
                {(p.technologies ?? []).map((t) => (
                  <span key={t} className="tech-tag">{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sum-sect split">
        <div className="split-col">
          <h2 className="sect-h">강점</h2>
          <ul className="bullet plus">
            {d.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="split-col">
          <h2 className="sect-h" style={{ color: accent }}>면접관이 노릴 약점</h2>
          <ul className="bullet attack" style={{ '--accent': accent }}>
            {d.weakPoints.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="sum-cta">
        <div className="cta-text">
          <div className="cta-h">준비됐다면 시작하세요.</div>
          <div className="cta-d">최대 5개의 질문, 평균 12분 소요됩니다.</div>
        </div>
        <button
          className="btn btn-primary big"
          style={{ background: accent }}
          onClick={() => onStart?.(data)}
        >
          실전 면접 시작 <span className="arr">→</span>
        </button>
      </div>
    </div>
  );
}
