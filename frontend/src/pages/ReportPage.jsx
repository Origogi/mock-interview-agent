import { useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronDown, RotateCcw } from 'lucide-react';
import HeroScore from '../components/HeroScore';

const ACCENT = '#6e74ff';

const KPI_DEFS = [
  { key: 'cs_fundamentals', label: 'CS Fundamentals' },
  { key: 'framework_usage', label: 'Framework Usage' },
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'communication', label: 'Communication' },
];

export default function ReportPage({
  report,
  evaluations = [],
  onRestart,
  onRewindRequest,
  rewindDisabled = false,
  accent = ACCENT,
}) {
  const scores = report?.scores || {};
  const feedback = report?.feedback || {};
  const isPartial = report?.is_partial === true;
  const answeredCount = report?.answered_count ?? evaluations.length;
  const maxQuestions = report?.max_questions ?? 5;
  const disclaimer = report?.disclaimer || '';

  // 종합 점수 계산: 4개 KPI 산술평균
  const avgScore = Math.round(
    Object.values(scores).reduce((sum, val) => sum + (val || 0), 0) / 4
  );

  return (
    <div className="screen report report-host" data-screen-label="04 Report">
      <div className="report-wrap">
        <header className="report-head">
          <div className="eyebrow-row">
            <div className="eyebrow">
              <span className="dot" style={{ background: accent }} />
              면접 결과 리포트
            </div>
            {isPartial && (
              <span className="report-partial-badge">
                조기 종료 · {answeredCount}/{maxQuestions} 문항
              </span>
            )}
          </div>
          <h1 className="report-title">고생하셨습니다</h1>
          <p className="report-sub">지원자님의 역량 분석 결과입니다.</p>
        </header>

        <div className="hero-score-group">
          <HeroScore finalScore={avgScore} accent={accent} />
          {isPartial && disclaimer && (
            <p className="report-disclaimer">{disclaimer}</p>
          )}
        </div>

        <section className="kpi-row">
          {KPI_DEFS.map((kpi, i) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={scores[kpi.key] ?? 0}
              accent={accent}
              delay={150 + i * 90}
            />
          ))}
        </section>

        <section className="report-grid">
          <div className="report-card radar-card">
            <div className="card-h">역량 다이어그램</div>
            <RadarChart scores={scores} accent={accent} />
            <div className="radar-legend">
              {KPI_DEFS.map((kpi, i) => (
                <LegendBar
                  key={kpi.key}
                  label={kpi.label}
                  value={scores[kpi.key] ?? 0}
                  accent={accent}
                  delay={900 + i * 90}
                />
              ))}
            </div>
          </div>

          <div className="report-card feedback-card">
            <div className="card-h">종합 피드백</div>
            <div className="fb-block">
              <div className="fb-h">강점</div>
              <p className="fb-body">{feedback.strengths || '분석된 강점이 없습니다.'}</p>
            </div>
            <div className="fb-block">
              <div className="fb-h">약점</div>
              <p className="fb-body">{feedback.weaknesses || '분석된 약점이 없습니다.'}</p>
            </div>
            <div className="fb-block">
              <div className="fb-h">개선 방향</div>
              <ul className="fb-list">
                {(feedback.improvements || []).map((imp, i) => (
                  <li key={i}>{imp}</li>
                ))}
                {!(feedback.improvements || []).length && (
                  <li className="fb-empty">제안된 개선 방향이 없습니다.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="qa-section">
          <h2 className="qa-title">상세 문항 피드백</h2>
          <div className="qa-list">
            {evaluations.map((ev, idx) => (
              <QaAccordion
                key={idx}
                ev={ev}
                idx={idx}
                accent={accent}
                onRewind={() => onRewindRequest?.({ questionIndex: idx, source: 'page4' })}
                rewindDisabled={rewindDisabled || !onRewindRequest}
              />
            ))}
            {!evaluations.length && (
              <div className="qa-empty">평가된 문항이 없습니다.</div>
            )}
          </div>
        </section>

        <footer className="report-foot">
          <button type="button" className="restart-btn" onClick={onRestart}>
            <Sparkles size={18} />
            <span>새로운 면접 시작하기</span>
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

function KpiCard({ label, value, accent, delay }) {
  const display = useCountUp(value, 1100, delay);
  return (
    <div className="kpi-card" style={{ '--accent': accent, animationDelay: `${delay}ms` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {display}
        <span className="kpi-unit">/100</span>
      </div>
    </div>
  );
}

function LegendBar({ label, value, accent, delay }) {
  return (
    <div className="legend-row" style={{ '--accent': accent }}>
      <span className="legend-label">{label}</span>
      <div className="legend-track">
        <div
          className="legend-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <span className="legend-num">{value}</span>
    </div>
  );
}

function QaAccordion({ ev, idx, accent, onRewind, rewindDisabled }) {
  const [open, setOpen] = useState(false);
  const score = ev.score ?? 0;
  const tone = score >= 7 ? 'good' : score >= 5 ? 'mid' : 'low';
  const preview = (ev.question || '').replace(/\s+/g, ' ').slice(0, 80);
  const rewindTitle = rewindDisabled ? '지금은 되감을 수 없어요.' : '이 질문 다시 답변하기';

  return (
    <div className={`qa-item${open ? ' is-open' : ''}`} style={{ '--accent': accent }}>
      <button
        type="button"
        className="qa-summary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`qa-badge qa-badge-${tone}`}>{score}</span>
        <span className="qa-q">
          <span className="qa-num">Q{idx + 1}</span>
          <span className="qa-text">{preview}{(ev.question || '').length > 80 ? '…' : ''}</span>
        </span>
        <ChevronDown size={18} className="qa-chev" />
      </button>
      <div className="qa-detail-wrap">
        <div className="qa-detail">
          <div className="qa-block">
            <div className="qa-h">내 답변</div>
            <p className="qa-answer">{ev.answer || '(답변 없음)'}</p>
          </div>
          <div className="qa-block">
            <div className="qa-h">면접관의 피드백</div>
            <p className="qa-feedback">{ev.feedback || '(피드백 없음)'}</p>
          </div>
          <div className="qa-actions">
            <span title={rewindTitle}>
              <button
                type="button"
                className="qa-rewind-btn"
                onClick={onRewind}
                disabled={rewindDisabled}
                aria-label={`Q${idx + 1} 다시 답변하기`}
              >
                <RotateCcw size={15} />
                <span>이 질문 다시 답변하기</span>
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Radar (custom SVG) ===== */

function RadarChart({ scores, accent }) {
  const cx = 100, cy = 100, r = 70;
  const axes = [
    { key: 'cs_fundamentals', label: 'CS', angle: -Math.PI / 2 },
    { key: 'framework_usage', label: 'Framework', angle: 0 },
    { key: 'problem_solving', label: 'Problem Solving', angle: Math.PI / 2 },
    { key: 'communication', label: 'Communication', angle: Math.PI },
  ];
  const point = (a, d) => [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
  const ringTiers = [0.33, 0.66, 1];
  const dataPoints = axes.map((ax) => point(ax.angle, r * Math.max(0, Math.min(100, scores?.[ax.key] ?? 0)) / 100));
  const polygonPoints = dataPoints.map((p) => p.join(',')).join(' ');

  const labelAnchor = (angle) => {
    const cos = Math.cos(angle);
    if (Math.abs(cos) < 0.15) return 'middle';
    return cos > 0 ? 'start' : 'end';
  };
  const labelBaseline = (angle) => {
    const sin = Math.sin(angle);
    if (sin > 0.5) return 'hanging';
    if (sin < -0.5) return 'auto';
    return 'middle';
  };

  return (
    <svg className="radar-svg" viewBox="-40 -20 280 240" preserveAspectRatio="xMidYMid meet" style={{ '--accent': accent }}>
      {ringTiers.map((t, i) => {
        const pts = axes.map((ax) => point(ax.angle, r * t).join(',')).join(' ');
        return (
          <polygon
            key={`ring-${i}`}
            className="radar-ring"
            points={pts}
            style={{ animationDelay: `${100 + i * 80}ms` }}
          />
        );
      })}
      {axes.map((ax, i) => {
        const [x, y] = point(ax.angle, r);
        return (
          <line
            key={`axis-${i}`}
            className="radar-axis"
            x1={cx} y1={cy} x2={x} y2={y}
            style={{ animationDelay: `${250 + i * 60}ms` }}
          />
        );
      })}
      <polygon className="radar-polygon" points={polygonPoints} />
      {dataPoints.map(([x, y], i) => (
        <circle
          key={`pt-${i}`}
          className="radar-vertex"
          cx={x} cy={y} r="3.5"
          style={{ animationDelay: `${1100 + i * 90}ms` }}
        />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = point(ax.angle, r + 14);
        return (
          <text
            key={`lbl-${i}`}
            className="radar-label"
            x={x} y={y}
            textAnchor={labelAnchor(ax.angle)}
            dominantBaseline={labelBaseline(ax.angle)}
            style={{ animationDelay: `${500 + i * 70}ms` }}
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ===== rAF count-up hook (cubic ease-out) ===== */

function useCountUp(target, duration = 1000, delay = 0) {
  const [value, setValue] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let raf;
    let startedAt;
    const t = setTimeout(() => {
      const tick = (ts) => {
        if (startedAt == null) startedAt = ts;
        const elapsed = ts - startedAt;
        const p = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(targetRef.current * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}
