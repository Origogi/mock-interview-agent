import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';
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
  const {
    scrollRef: threadRef,
    contentRef: threadContent,
    scrollToBottom,
  } = useStickToBottom({
    resize: 'smooth',
    initial: 'smooth',
  });
  const lastUserIdxRef = useRef(-1);
  const lastEvalLenRef = useRef(evaluations.length);
  const streamedIdxRef = useRef(new Set());
  const textareaRef = useRef(null);
  const spacerRef = useRef(null);
  const streamInitializedRef = useRef(false);

  // chatInput state → textarea DOM 단방향 sync.
  // controlled value prop을 쓰지 않는 이유: React 19 + 한글 IME 조합 중
  // value 강제 동기화가 자모를 깸. uncontrolled로 두고, 외부 변경(전송 후 reset, Tab 들여쓰기)만 명시적으로 반영.
  useEffect(() => {
    const el = textareaRef.current;
    if (el && el.value !== chatInput) el.value = chatInput;
  }, [chatInput]);

  const [latestEval, setLatestEval] = useState(null);
  const [streaming, setStreaming] = useState({
    idx: -1,
    partialContent: '',  // stream 모드: 누적 텍스트 (서버에서 실시간 도착)
    tokens: [],          // 폴백 모드: reveal 큐 (동기 응답을 분할)
    revealed: 0,         // 폴백 모드: reveal 진행도
    mode: 'idle',        // 'stream' | 'fallback' | 'idle'
    isDone: false,
  });

  const lastAiIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'ai') return i;
    }
    return -1;
  }, [messages]);

  const updateSpacer = useCallback(() => {
    if (!threadRef.current || !spacerRef.current) return;

    const containerH = threadRef.current.clientHeight;

    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) {
      spacerRef.current.style.height = '0px';
      return;
    }

    const userEl = threadRef.current.querySelector(`[data-msg-idx="${lastUserIdx}"]`);
    const userH = userEl?.offsetHeight ?? 0;

    let lastAiH = 0;
    for (let i = messages.length - 1; i > lastUserIdx; i--) {
      if (messages[i].role === 'ai') {
        const aiEl = threadRef.current.querySelector(`[data-msg-idx="${i}"]`);
        lastAiH = aiEl?.offsetHeight ?? 0;
        break;
      }
    }

    const GAP = 28;
    const TOP_PADDING = 24;
    const target = Math.max(0, containerH - userH - lastAiH - GAP - TOP_PADDING);
    spacerRef.current.style.height = `${target}px`;
  }, [messages]);

  // Update spacer when messages or streaming content changes.
  useLayoutEffect(() => {
    updateSpacer();
  }, [updateSpacer, streaming.partialContent]);

  // Observe viewport resize.
  useEffect(() => {
    if (!threadRef.current) return;
    const ro = new ResizeObserver(() => updateSpacer());
    ro.observe(threadRef.current);
    return () => ro.disconnect();
  }, [updateSpacer]);

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
  }, [messages, threadRef, threadContent]);

  // Force re-enable stick-to-bottom when stream starts (first chunk arrival).
  // External scrollTo (snap-to-top) disables the library's auto-scroll.
  // We must explicitly call scrollToBottom() to re-activate the stick-to-bottom behavior.
  // However, if the last user message is long (doesn't fit in container height),
  // the user is near-top and forcing scrollToBottom() creates jarring UX.
  // In that case, allow user to manually scroll down, and the library will auto-detect isNearBottom.
  useEffect(() => {
    if (streaming.mode === 'stream' && streaming.partialContent && !streamInitializedRef.current) {
      streamInitializedRef.current = true;

      // Check if last user message fits in container
      let lastUserIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserIdx = i;
          break;
        }
      }

      const shouldForceBotScroll = lastUserIdx !== -1 && threadRef.current;
      if (shouldForceBotScroll) {
        const userEl = threadRef.current.querySelector(`[data-msg-idx="${lastUserIdx}"]`);
        const userH = userEl?.offsetHeight ?? 0;
        const containerH = threadRef.current.clientHeight ?? 0;
        const TOP_PADDING = 24;

        // Only force scrollToBottom if user message + padding fits in viewport
        if (userH + TOP_PADDING <= containerH) {
          scrollToBottom();
        }
        // else: long message case — skip forced scroll, let user manually scroll down
      } else {
        // No user message (shouldn't happen in normal flow), force scroll
        scrollToBottom();
      }
    }
  }, [streaming.mode, streaming.partialContent, scrollToBottom, messages, threadRef]);

  // Detect new AI message → determine stream vs fallback mode.
  useEffect(() => {
    if (lastAiIdx === -1) return;
    if (streamedIdxRef.current.has(lastAiIdx)) return;
    if (streaming.idx === lastAiIdx) return;

    const content = messages[lastAiIdx]?.content || '';

    // 스트림 모드 감지: isAiTyping === false + 빈 메시지 = 스트림 시작
    if (!isAiTyping && content === '' && streaming.mode !== 'stream') {
      setStreaming({
        idx: lastAiIdx,
        partialContent: '',
        tokens: [],
        revealed: 0,
        mode: 'stream',
        isDone: false,
      });
      return;
    }

    // 폴백 모드: 기존 동기 응답 (isAiTyping이 true → false 후 content가 있음)
    if (!content) return;
    if (streaming.mode === 'stream') return; // 이미 스트림 모드이면 스킵

    // streamDone 플래그가 있는 메시지는 폴백 모드로 진입 금지 (스트림 완료 후 idle 리셋 중)
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.streamDone) return;

    const tokens = content.match(/\S+\s*/g) || [content];
    setStreaming({
      idx: lastAiIdx,
      partialContent: '',
      tokens,
      revealed: 0,
      mode: 'fallback',
      isDone: false,
    });
  }, [lastAiIdx, messages, streaming.idx, streaming.mode, isAiTyping]);

  // Drive token reveal (폴백 모드만).
  useEffect(() => {
    if (streaming.idx === -1) return;
    if (streaming.mode !== 'fallback') return; // 폴백 모드만 작동
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

  // Detect stream completion via message flag (streamDone).
  // App.jsx가 stream 완료 후 마지막 메시지에 streamDone: true 플래그 박으면,
  // 이 effect가 감지하여 streaming state를 idle로 리셋.
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.streamDone && streaming.idx !== -1) {
      // streamedIdxRef 표기하여 모드 감지 effect가 폴백으로 진입하는 것을 차단
      streamedIdxRef.current.add(streaming.idx);
      streamInitializedRef.current = false;
      setStreaming((s) => ({
        ...s,
        idx: -1,
        mode: 'idle',
        partialContent: '',
        tokens: [],
        revealed: 0,
        isDone: false,
      }));
    }
  }, [messages]);

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

  const isStreaming = streaming.idx !== -1 && (streaming.mode === 'stream' || (streaming.mode === 'fallback' && streaming.revealed < streaming.tokens.length));
  const busy = isAiTyping || isStreaming;
  const finished = currentQuestionCount > maxQuestions;
  const inputDisabled = busy || finished || isFetchingSample;

  const progressPct = Math.min((Math.max(currentQuestionCount, 1) - 1) / maxQuestions, 1) * 100;

  const placeholder = isFetchingSample
    ? '샘플 답변 생성 중…'
    : isAiTyping
    ? '면접관이 분석 중이에요…'
    : streaming.mode === 'stream'
    ? '면접관이 답변을 작성하는 중이에요…'
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
            {typeof window !== 'undefined' && sessionStorage.getItem('MOCK_SESSION') === 'true' && (
              <span
                style={{
                  marginLeft: 'auto',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#10b981',
                  color: '#fff',
                  borderRadius: '4px',
                }}
              >
                Mock
              </span>
            )}
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
                {streaming.mode === 'stream' ? (
                  <>
                    <span className="rec-dot" style={{ background: accent }} /> 답변 생성 중…
                  </>
                ) : isStreaming ? (
                  <>
                    <span className="rec-dot" style={{ background: accent }} /> 답변 표시 중…
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

        <div ref={threadRef} className="iv-thread-scroll">
          <div ref={threadContent} className="iv-thread">
            {messages.map((m, idx) => {
              const isLastAi = idx === lastAiIdx && m.role === 'ai';
              const isStreamingThis = isLastAi && streaming.idx === idx;

              let visibleTokens = null;
              let showCaret = false;

              if (isStreamingThis) {
                if (streaming.mode === 'stream') {
                  // 스트림 모드: partialContent를 단일 "토큰"으로 처리
                  visibleTokens = streaming.partialContent ? [streaming.partialContent] : null;
                  showCaret = !streaming.isDone;
                } else if (streaming.mode === 'fallback') {
                  // 폴백 모드: 기존 token-fade 애니메이션
                  visibleTokens = streaming.tokens.slice(0, streaming.revealed);
                  showCaret = streaming.revealed < streaming.tokens.length;
                }
              }

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
            <div ref={spacerRef} className="iv-thread-spacer" aria-hidden="true" />
          </div>
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
