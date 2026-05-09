import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import SampleAnswerButton from '../debug/SampleAnswerButton.jsx';

const ACCENT = '#6e74ff';
const TOAST_MS = 2600;

export default function InterviewPage({
  messages,
  evaluations,
  currentQuestionCount,
  maxQuestions,
  chatInput,
  setChatInput,
  isAiTyping,
  isFetchingSample,
  onSend,
  onFillSampleAnswer,
  onAbort,
  accent = ACCENT,
}) {
  const threadRef = useRef(null);
  const lastUserIdxRef = useRef(-1);
  const lastEvalLenRef = useRef(evaluations.length);
  const streamedIdxRef = useRef(new Set());
  const textareaRef = useRef(null);

  // chatInput state → textarea DOM 단방향 sync.
  // controlled value prop을 쓰지 않는 이유: React 19 + 한글 IME 조합 중
  // value 강제 동기화가 자모를 깸. uncontrolled로 두고, 외부 변경(전송 후 reset, Tab 들여쓰기)만 명시적으로 반영.
  useEffect(() => {
    const el = textareaRef.current;
    if (el && el.value !== chatInput) el.value = chatInput;
  }, [chatInput]);

  const [latestEval, setLatestEval] = useState(null);
  const [streaming, setStreaming] = useState({ idx: -1, tokens: [], revealed: 0 });

  const lastAiIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'ai') return i;
    }
    return -1;
  }, [messages]);

  // Detect new user message + pin to top in a single layout pass (avoids paint flash).
  useLayoutEffect(() => {
    let userIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userIdx = i;
        break;
      }
    }
    if (userIdx === -1 || userIdx === lastUserIdxRef.current) return;
    lastUserIdxRef.current = userIdx;
    const el = threadRef.current;
    if (!el) return;
    const node = el.querySelector(`[data-msg-idx="${userIdx}"]`);
    if (!node) return;
    const containerRect = el.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const delta = nodeRect.top - containerRect.top;
    const target = el.scrollTop + delta - 24;
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [messages]);

  // Detect new AI message → start client-side token-fade animation.
  useEffect(() => {
    if (lastAiIdx === -1) return;
    if (streamedIdxRef.current.has(lastAiIdx)) return;
    if (streaming.idx === lastAiIdx) return;
    const content = messages[lastAiIdx]?.content || '';
    if (!content) return;
    const tokens = content.match(/\S+\s*/g) || [content];
    setStreaming({ idx: lastAiIdx, tokens, revealed: 0 });
  }, [lastAiIdx, messages, streaming.idx]);

  // Drive token reveal.
  useEffect(() => {
    if (streaming.idx === -1) return;
    if (streaming.revealed >= streaming.tokens.length) {
      streamedIdxRef.current.add(streaming.idx);
      return;
    }
    const prev = streaming.tokens[streaming.revealed - 1];
    const lastChar = prev ? prev.trim().slice(-1) : '';
    const pause = /[.!?。！？]/.test(lastChar)
      ? 220
      : /[,;:、]/.test(lastChar)
      ? 120
      : 0;
    const delay = 55 + Math.random() * 30 + pause;
    const t = setTimeout(() => {
      setStreaming((s) => ({ ...s, revealed: s.revealed + 1 }));
    }, delay);
    return () => clearTimeout(t);
  }, [streaming]);

  // Detect new evaluation → toast + reaction.
  useEffect(() => {
    if (evaluations.length > lastEvalLenRef.current) {
      const ev = evaluations[evaluations.length - 1];
      setLatestEval({ score: ev.score, idx: evaluations.length - 1 });
    }
    lastEvalLenRef.current = evaluations.length;
  }, [evaluations]);

  useEffect(() => {
    if (!latestEval) return;
    const t = setTimeout(() => setLatestEval(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [latestEval]);

  const lastScore = evaluations.length ? evaluations[evaluations.length - 1].score : null;
  const reactionEmoji = lastScore == null ? '🤔' : lastScore >= 8 ? '😌' : lastScore >= 6 ? '🤔' : '😐';

  const isStreaming = streaming.idx !== -1 && streaming.revealed < streaming.tokens.length;
  const busy = isAiTyping || isStreaming;
  const finished = currentQuestionCount > maxQuestions;
  const inputDisabled = busy || finished || isFetchingSample;

  const progressPct = Math.min((Math.max(currentQuestionCount, 1) - 1) / maxQuestions, 1) * 100;

  const placeholder = isFetchingSample
    ? '샘플 답변 생성 중…'
    : isAiTyping
    ? '면접관이 분석 중이에요…'
    : isStreaming
    ? '면접관이 말하는 중이에요…'
    : '답변을 입력하세요. Enter 전송 · Shift+Enter 줄바꿈 · Tab 들여쓰기';

  const onKey = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputDisabled && chatInput.trim()) onSend(chatInput);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.target;
      const s = el.selectionStart;
      const en = el.selectionEnd;
      const v = el.value;
      const next = v.slice(0, s) + '  ' + v.slice(en);
      el.value = next;
      setChatInput(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
    }
  };

  return (
    <div
      className="screen interview"
      data-screen-label="03 Interview"
      style={{ '--split': '28%', '--accent': accent }}
    >
      <aside className="iv-rail">
        <div className="iv-rail-top">
          <div className="iv-brand">
            <span className="iv-brand-dot" style={{ background: accent }} />
            <span>실전 면접 진행 중</span>
          </div>
          <div className="iv-progress-block">
            <div className="iv-progress-num">
              <span className="big" style={{ color: accent }}>
                {Math.min(currentQuestionCount, maxQuestions)}
              </span>
              <span className="of">/ {maxQuestions}</span>
            </div>
            <div className="iv-progress-lbl">현재 질문</div>
            <div className="iv-progress-bar">
              <div
                className="iv-progress-fill"
                style={{ width: `${progressPct}%`, background: accent }}
              />
            </div>
          </div>
          <button className="iv-end" onClick={onAbort}>
            <span className="iv-end-x">×</span> 면접 조기 종료
          </button>
        </div>

        <div className="iv-rail-evals">
          <div className="iv-rail-h">실시간 평가</div>
          {evaluations.length === 0 ? (
            <div className="iv-empty">
              <div className="iv-empty-glyph">···</div>
              <div className="iv-empty-t">아직 답변이 없습니다</div>
              <div className="iv-empty-s">첫 답변을 입력해보세요</div>
            </div>
          ) : (
            <ul className="iv-eval-list">
              {evaluations.map((ev, i) => (
                <EvalCard
                  key={i}
                  idx={i}
                  ev={ev}
                  accent={accent}
                  fresh={i === evaluations.length - 1}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="iv-stage">
        <header className="iv-stage-head">
          <div className="iv-interviewer">
            <div
              className={`iv-avatar ${busy ? 'is-busy' : ''}`}
              style={{ borderColor: accent }}
            >
              <span className="iv-avatar-emoji">{reactionEmoji}</span>
              {busy && <span className="iv-avatar-pulse" style={{ borderColor: accent }} />}
            </div>
            <div>
              <div className="iv-int-name">시니어 엔지니어 면접관</div>
              <div className="iv-int-role">
                {isStreaming ? (
                  <>
                    <span className="rec-dot" style={{ background: accent }} /> 답변 생성 중…
                  </>
                ) : isAiTyping ? (
                  <>
                    <span className="rec-dot" style={{ background: accent }} /> 분석 중…
                  </>
                ) : (
                  'Tech-Interviewer AI · gpt-4o-mini'
                )}
              </div>
            </div>
          </div>
          <div className="iv-stage-meta">
            <span className="iv-stage-pill">
              Q{Math.min(currentQuestionCount, maxQuestions)}
            </span>
          </div>
        </header>

        {latestEval && (
          <div
            className="eval-toast"
            style={{ '--toast-accent': latestEval.score >= 7 ? accent : '#ff6b6b' }}
          >
            <div className="eval-toast-num">
              {latestEval.score}
              <small>/10</small>
            </div>
            <div className="eval-toast-text">
              <div className="eval-toast-h">Q{latestEval.idx + 1} 평가 완료</div>
              <div className="eval-toast-d">
                {latestEval.score >= 7 ? '단단한 답변이었습니다' : '조금 아쉬운 답변이었습니다'}
              </div>
            </div>
          </div>
        )}

        <div ref={threadRef} className="iv-thread">
          {messages.map((m, idx) => {
            const isLastAi = idx === lastAiIdx && m.role === 'ai';
            const isStreamingThis = isLastAi && streaming.idx === idx;
            const visibleTokens = isStreamingThis
              ? streaming.tokens.slice(0, streaming.revealed)
              : null;
            const showCaret = isStreamingThis && streaming.revealed < streaming.tokens.length;
            return (
              <Bubble
                key={idx}
                idx={idx}
                m={m}
                accent={accent}
                tokens={visibleTokens}
                showCaret={showCaret}
              />
            );
          })}
          <div className="iv-thread-spacer" aria-hidden="true" />
          {isAiTyping && (
            <div className="bubble bubble-ai bubble-enter">
              <div className="bubble-author">면접관</div>
              <div className="bubble-body typing">
                <span className="td" style={{ background: accent }} />
                <span className="td" style={{ background: accent }} />
                <span className="td" style={{ background: accent }} />
              </div>
            </div>
          )}
        </div>

        <div className="iv-input-wrap">
          <div className={`iv-input ${busy ? 'is-disabled' : ''}`}>
            {/* Sample Answer Button */}
            <div style={{ marginBottom: '12px' }}>
              <SampleAnswerButton
                onPick={onFillSampleAnswer}
                disabled={finished || isAiTyping}
                isLoading={isFetchingSample}
              />
            </div>
            <textarea
              ref={textareaRef}
              className="iv-textarea"
              placeholder={placeholder}
              defaultValue=""
              disabled={inputDisabled}
              onChange={(e) => setChatInput(e.target.value)}
              onCompositionEnd={(e) => setChatInput(e.target.value)}
              onKeyDown={onKey}
              rows={2}
            />
            <div className="iv-input-foot">
              <span className="iv-input-hint">Enter · Shift+Enter · Tab</span>
              <button
                className="iv-send"
                style={{ background: accent }}
                onClick={() => onSend(chatInput)}
                disabled={inputDisabled || !chatInput.trim()}
              >
                전송 <span className="arr">→</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Bubble({ idx, m, accent, tokens, showCaret }) {
  const isAi = m.role === 'ai';
  return (
    <div className={`bubble bubble-${m.role} bubble-enter`} data-msg-idx={idx}>
      {isAi && <div className="bubble-author">면접관</div>}
      <div className="bubble-body" style={!isAi ? { background: accent } : null}>
        {isAi && tokens
          ? tokens.map((tok, i) => (
              <span key={i} className="tok">
                {tok}
              </span>
            ))
          : m.content}
        {showCaret && <span className="stream-caret" style={{ background: accent }} />}
      </div>
    </div>
  );
}

function EvalCard({ idx, ev, accent, fresh }) {
  const [open, setOpen] = useState(false);
  const isHigh = ev.score >= 7;
  const question = ev.question || ev.q || '';
  const feedback = ev.feedback || '';
  return (
    <li className={`iv-eval ${open ? 'is-open' : ''} ${fresh ? 'is-fresh' : ''}`}>
      <button className="iv-eval-row" onClick={() => setOpen(!open)}>
        <span className="iv-eval-num">Q{idx + 1}</span>
        <span className="iv-eval-q">{question.slice(0, 32)}…</span>
        <span
          className={`iv-score ${isHigh ? 'high' : 'low'}`}
          style={{ color: isHigh ? accent : '#ff6b6b' }}
        >
          {ev.score}
          <small>/10</small>
        </span>
        <span className="iv-eval-chev">▾</span>
      </button>
      <div className="iv-eval-detail-wrap" aria-hidden={!open}>
        <div className="iv-eval-detail-inner">
          <div className="iv-eval-detail">
            <div className="iv-eval-fb">{feedback}</div>
          </div>
        </div>
      </div>
    </li>
  );
}
