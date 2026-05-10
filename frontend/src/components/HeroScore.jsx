import { useEffect, useRef, useState } from 'react';

/**
 * HeroScore — 종합 점수 카운트업 애니메이션
 * 4개 KPI 산술평균으로 계산된 최종 점수를 0→최종값으로 카운트업
 * @param {number} finalScore - 최종 점수 (0~100)
 * @param {string} accent - accent 색상 (기본값 #6e74ff)
 */
export default function HeroScore({ finalScore, accent = '#6e74ff' }) {
  const display = useCountUp(finalScore, 1100, 0);

  return (
    <section className="hero-score" style={{ '--accent': accent }}>
      <div className="score-label">종합 점수</div>
      <div className="score-display">
        <span className="score-value">{display}</span>
        <span className="score-unit">/100</span>
      </div>
    </section>
  );
}

/**
 * useCountUp — rAF 기반 카운트업 훅 (ease-out cubic)
 * @param {number} target - 목표값
 * @param {number} duration - 애니메이션 시간 (ms, 기본값 1000)
 * @param {number} delay - 시작 지연 (ms, 기본값 0)
 * @returns {number} 현재 표시값 (정수)
 */
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
        // cubic ease-out: 1 - (1 - p)^3
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
