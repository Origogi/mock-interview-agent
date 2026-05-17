import { useState } from 'react';
import { Sparkles, ChevronDown, RotateCcw } from 'lucide-react';
import HeroScore from '../components/HeroScore';
import {
  INTERVIEW_TOTAL_QUESTIONS,
  SESSION_QUESTION_COUNT,
  buildSessionProgress,
  formatSessionScore,
} from '../utils/interviewPolicy.js';

const ACCENT = '#6e74ff';

const RADAR_LABELS = {
  cs_fundamentals: 'CS',
  framework_usage: 'Framework',
  problem_solving: 'Problem Solving',
  communication: 'Communication',
};

export default function ReportPage({
  report,
  evaluations = [],
  onRestart,
  onRewindRequest,
  rewindDisabled = false,
  accent = ACCENT,
}) {
  const reportScores = report?.scores || {};
  const feedback = report?.feedback || {};
  const isPartial = report?.is_partial === true;
  const answeredCount = report?.answered_count ?? evaluations.length;
  const maxQuestions = INTERVIEW_TOTAL_QUESTIONS;
  const disclaimer =
    report?.disclaimer ||
    (isPartial ? `총 ${answeredCount}개 답변을 바탕으로 작성된 부분 리포트입니다.` : '');
  const sessionRows = buildSessionProgress({
    evaluations,
    reportScores,
    currentQuestionNumber: INTERVIEW_TOTAL_QUESTIONS,
    isFinished: true,
  });
  const scores = Object.fromEntries(
    sessionRows.map((session) => [session.key, session.isComplete ? session.score100 : 0])
  );
  const completedScoreValues = sessionRows
    .filter((session) => session.isComplete && session.averageScore10 != null)
    .map((session) => session.score100);
  const legacyScoreValues = Object.values(reportScores).filter(
    (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
  );
  const scoreValues = completedScoreValues.length > 0 ? completedScoreValues : legacyScoreValues;

  const avgScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, val) => sum + Number(val || 0), 0) / scoreValues.length)
    : 0;

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

        <section className="session-summary-grid">
          {sessionRows.map((session, i) => (
            <SessionSummaryCard
              key={session.key}
              session={session}
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
              {sessionRows.map((session, i) => (
                <LegendBar
                  key={session.key}
                  label={session.label}
                  value={scores[session.key] ?? 0}
                  isComplete={session.isComplete}
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
          <h2 className="qa-title">세션별 상세 문항 피드백</h2>
          <div className="session-detail-list">
            {sessionRows.map((session) => (
              <SessionDetailGroup
                key={session.key}
                session={session}
                accent={accent}
                onRewindRequest={onRewindRequest}
                rewindDisabled={rewindDisabled || !onRewindRequest}
              />
            ))}
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

function SessionSummaryCard({ session, accent, delay }) {
  const scoreLabel = session.isComplete ? formatSessionScore(session.averageScore10) : '평가 부족';
  const stateLabel = session.isComplete
    ? '세션 완료'
    : session.completedCount > 0
    ? '부분 진행'
    : '미진행';

  return (
    <article className="session-summary-card" style={{ '--accent': accent, animationDelay: `${delay}ms` }}>
      <div className="session-summary-top">
        <div>
          <div className="session-summary-range">{session.rangeLabel}</div>
          <div className="session-summary-title">{session.label}</div>
        </div>
        <span className={`session-summary-state ${session.isComplete ? 'is-complete' : ''}`}>
          {stateLabel}
        </span>
      </div>
      <div className={`session-summary-score ${session.isComplete ? '' : 'is-empty'}`}>
        {scoreLabel}
      </div>
      <div className="session-summary-progress">
        <div className="session-summary-track" aria-hidden="true">
          <div className="session-summary-fill" style={{ width: `${session.progress * 100}%` }} />
        </div>
        <span>{session.completedCount}/{SESSION_QUESTION_COUNT} 문항</span>
      </div>
    </article>
  );
}

function LegendBar({ label, value, isComplete, accent, delay }) {
  return (
    <div className="legend-row" style={{ '--accent': accent }}>
      <span className="legend-label">{label}</span>
      <div className="legend-track">
        <div
          className="legend-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <span className="legend-num">{isComplete ? value : '부족'}</span>
    </div>
  );
}

function SessionDetailGroup({ session, accent, onRewindRequest, rewindDisabled }) {
  return (
    <article className="session-detail-card" style={{ '--accent': accent }}>
      <header className="session-detail-head">
        <div>
          <div className="session-summary-range">{session.rangeLabel}</div>
          <h3 className="session-detail-title">{session.label}</h3>
        </div>
        <div className="session-detail-score">
          {session.isComplete ? formatSessionScore(session.averageScore10) : '평가 부족'}
        </div>
      </header>

      <div className="qa-list">
        {session.items.map((item) =>
          item.evaluation ? (
            <QaAccordion
              key={item.questionNumber}
              ev={item.evaluation}
              idx={item.evaluationIndex}
              questionNumber={item.questionNumber}
              accent={accent}
              onRewind={() =>
                onRewindRequest?.({ questionIndex: item.evaluationIndex, source: 'page4' })
              }
              rewindDisabled={rewindDisabled}
            />
          ) : (
            <div key={item.questionNumber} className="qa-empty-row">
              <span>Q{item.questionNumber}</span>
              <strong>평가 부족</strong>
            </div>
          )
        )}
      </div>
    </article>
  );
}

function QaAccordion({ ev, idx, questionNumber, accent, onRewind, rewindDisabled }) {
  const [open, setOpen] = useState(false);
  const score = ev.score ?? 0;
  const tone = score >= 7 ? 'good' : score >= 5 ? 'mid' : 'low';
  const preview = (ev.question || '').replace(/\s+/g, ' ').slice(0, 80);
  const displayNumber = questionNumber ?? idx + 1;
  const rewindTitle = rewindDisabled
    ? '지금은 되감을 수 없어요.'
    : `Q${displayNumber}부터 Q20까지 답변, 평가, 리포트가 무효화됩니다.`;

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
          <span className="qa-num">Q{displayNumber}</span>
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
                aria-label={`Q${displayNumber} 다시 답변하기`}
              >
                <RotateCcw size={15} />
                <span>Q{displayNumber}부터 다시 답변</span>
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
    { key: 'cs_fundamentals', label: RADAR_LABELS.cs_fundamentals, angle: -Math.PI / 2 },
    { key: 'framework_usage', label: RADAR_LABELS.framework_usage, angle: 0 },
    { key: 'problem_solving', label: RADAR_LABELS.problem_solving, angle: Math.PI / 2 },
    { key: 'communication', label: RADAR_LABELS.communication, angle: Math.PI },
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
