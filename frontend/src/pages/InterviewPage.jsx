import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';
import SampleAnswerButton from '../debug/SampleAnswerButton.jsx';

const ACCENT = '#6e74ff';
const TOAST_MS = 2600;
const USER_PIN_TOP_OFFSET = 72;

const SCORE_TIERS = [
  {
    id: 'best',
    min: 7,
    color: 'accent',
    toastCopy: '단단한 답변이었습니다',
    avatar: '😌',
  },
  {
    id: 'good',
    min: 5,
    color: '#facc15',
    toastCopy: '방향은 좋지만 보완이 필요합니다',
    avatar: '🤔',
  },
  {
    id: 'bad',
    min: 1,
    color: '#ff6b6b',
    toastCopy: '핵심 보강이 필요합니다',
    avatar: '😐',
  },
];

function getScoreTier(score, accent = ACCENT) {
  const numericScore = Number(score);
  const fallbackTier = SCORE_TIERS[SCORE_TIERS.length - 1];
  const tier = Number.isFinite(numericScore)
    ? SCORE_TIERS.find(({ min }) => numericScore >= min) ?? fallbackTier
    : fallbackTier;

  return {
    ...tier,
    color: tier.color === 'accent' ? accent : tier.color,
  };
}

export default function InterviewPage({
  messages,
  evaluations,
  currentQuestionCount,
  maxQuestions,
  chatInput,
  setChatInput,
  isAiTyping,
  isFetchingSample,
  isClosingInterview = false,
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
    const target = Math.max(0, containerH - userH - lastAiH - GAP - USER_PIN_TOP_OFFSET);
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
    const target = el.scrollTop + delta - USER_PIN_TOP_OFFSET;
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [messages, threadRef, threadContent]);

  // Force re-enable stick-to-bottom when stream starts (first revealed chunk).
  // External scrollTo (snap-to-top) disables the library's auto-scroll.
  // We must explicitly call scrollToBottom() to re-activate the stick-to-bottom behavior.
  // However, if the last user message is long (doesn't fit in container height),
  // the user is near-top and forcing scrollToBottom() creates jarring UX.
  // In that case, allow user to manually scroll down, and the library will auto-detect isNearBottom.
  useEffect(() => {
    if (streaming.mode === 'stream' && streaming.revealed > 0 && !streamInitializedRef.current) {
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
        // Only force scrollToBottom if user message + padding fits in viewport
        if (userH + USER_PIN_TOP_OFFSET <= containerH) {
          scrollToBottom();
        }
        // else: long message case — skip forced scroll, let user manually scroll down
      } else {
        // No user message (shouldn't happen in normal flow), force scroll
        scrollToBottom();
      }
    }
  }, [streaming.mode, streaming.revealed, scrollToBottom, messages, threadRef]);

  // Detect new AI message → determine stream vs fallback mode.
  useEffect(() => {
    if (lastAiIdx === -1) return;
    if (streamedIdxRef.current.has(lastAiIdx)) return;
    if (streaming.idx === lastAiIdx) return;

    const content = messages[lastAiIdx]?.content || '';

    // 스트림 모드 감지: isAiTyping === false + 빈 메시지 = 스트림 시작
    if (!isAiTyping && content === '' && streaming.idx !== lastAiIdx) {
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

  // Mirror server-streamed content into the local reveal queue.
  // Even if the network/browser batches chunks, the UI still reveals tokens progressively.
  useEffect(() => {
    if (streaming.mode !== 'stream' || streaming.idx === -1) return;
    const source = messages[streaming.idx]?.content || '';
    const currentSource = streaming.tokens.join('');
    if (source === currentSource) return;

    const tokens = source.match(/\S+\s*/g) || [];
    setStreaming((s) => {
      if (s.mode !== 'stream' || s.idx !== streaming.idx) return s;
      return {
        ...s,
        tokens,
        revealed: Math.min(s.revealed, tokens.length),
      };
    });
  }, [messages, streaming.idx, streaming.mode, streaming.tokens]);

  // Drive token reveal.
  useEffect(() => {
    if (streaming.idx === -1) return;
    if (streaming.mode !== 'fallback' && streaming.mode !== 'stream') return;
    if (streaming.revealed >= streaming.tokens.length) {
      if (streaming.mode === 'fallback' || streaming.isDone) {
        streamedIdxRef.current.add(streaming.idx);
      }
      if (streaming.mode === 'stream' && streaming.isDone) {
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
      setStreaming((s) => {
        const revealed = Math.min(s.revealed + 1, s.tokens.length);
        return {
          ...s,
          revealed,
          partialContent: s.tokens.slice(0, revealed).join(''),
        };
      });
    }, delay);
    return () => clearTimeout(t);
  }, [streaming]);

  // Detect stream completion via message flag (streamDone).
  // Server stream may finish before the local reveal queue is fully shown,
  // so mark it done first and let the reveal driver drain the remaining tokens.
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.streamDone && streaming.idx !== -1) {
      if (streaming.mode === 'stream') {
        const source = messages[streaming.idx]?.content || '';
        const tokens = source.match(/\S+\s*/g) || [];
        setStreaming((s) => ({
          ...s,
          tokens,
          isDone: true,
        }));
        return;
      }

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
  const lastTier = lastScore == null ? null : getScoreTier(lastScore, accent);
  const reactionEmoji = lastTier?.avatar ?? '🤔';
  const avatarAccent = lastTier?.color ?? accent;
  const latestEvalTier = latestEval ? getScoreTier(latestEval.score, accent) : null;

  const isStreamRevealing =
    streaming.mode === 'stream' && (!streaming.isDone || streaming.revealed < streaming.tokens.length);
  const isFallbackRevealing =
    streaming.mode === 'fallback' && streaming.revealed < streaming.tokens.length;
  const isStreaming = streaming.idx !== -1 && (isStreamRevealing || isFallbackRevealing);
  const busy = isAiTyping || isStreaming;
  const finished = currentQuestionCount > maxQuestions;
  const inputDisabled = busy || finished || isFetchingSample || isClosingInterview;

  const progressPct = isClosingInterview
    ? 100
    : Math.min((Math.max(currentQuestionCount, 1) - 1) / maxQuestions, 1) * 100;

  const placeholder = isFetchingSample
    ? '샘플 답변 생성 중…'
    : isClosingInterview
    ? '최종 리포트를 준비하는 중이에요…'
    : isAiTyping
    ? '면접관이 분석 중이에요…'
    : isStreaming && streaming.mode === 'stream'
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

          <div className="iv-side-profile">
            <div
              className={`iv-avatar ${lastTier ? `is-${lastTier.id}` : ''} ${busy ? 'is-busy' : ''}`}
              style={{ borderColor: avatarAccent }}
            >
              <span className="iv-avatar-emoji">{reactionEmoji}</span>
              {busy && <span className="iv-avatar-pulse" style={{ borderColor: avatarAccent }} />}
            </div>
            <div className="iv-side-profile-copy">
              <div className="iv-int-name">시니어 엔지니어 면접관</div>
              <div className="iv-int-role">Tech-Interviewer AI · gpt-4o-mini</div>
            </div>
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
          <button className="iv-end" onClick={onAbort} disabled={isClosingInterview}>
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
        {latestEval && latestEvalTier && (
          <div
            className={`eval-toast is-${latestEvalTier.id}`}
            style={{ '--toast-accent': latestEvalTier.color }}
          >
            <div className="eval-toast-num">
              {latestEval.score}
              <small>/10</small>
            </div>
            <div className="eval-toast-text">
              <div className="eval-toast-h">Q{latestEval.idx + 1} 평가 완료</div>
              <div className="eval-toast-d">{latestEvalTier.toastCopy}</div>
            </div>
          </div>
        )}

        <div ref={threadRef} className="iv-thread-scroll">
          <div ref={threadContent} className="iv-thread">
            {messages.map((m, idx) => {
              const isLastAi = idx === lastAiIdx && m.role === 'ai';
              const isStreamingThis = isLastAi && streaming.idx === idx;
              const isPendingStream = isStreamingThis && streaming.mode === 'stream' && streaming.revealed === 0;

              let visibleTokens = null;
              let showCaret = false;

              if (isStreamingThis) {
                if (streaming.mode === 'stream') {
                  // 스트림 모드도 로컬 reveal 큐로 표시해 덩어리 업데이트를 방지한다.
                  visibleTokens = streaming.tokens.slice(0, streaming.revealed);
                  showCaret = !streaming.isDone || streaming.revealed < streaming.tokens.length;
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
                  isPending={isPendingStream}
                />
              );
            })}
            {isAiTyping && (
              <div className="bubble bubble-ai bubble-enter">
                <div className="bubble-author">면접관</div>
                <TypingStatus accent={accent} />
              </div>
            )}
            <div ref={spacerRef} className="iv-thread-spacer" aria-hidden="true" />
          </div>
        </div>

        <div className="iv-input-wrap">
          <div className={`iv-input ${inputDisabled ? 'is-disabled' : ''}`}>
            {/* Sample Answer Button */}
            <div style={{ marginBottom: '12px' }}>
              <SampleAnswerButton
                onPick={onFillSampleAnswer}
                disabled={finished || isAiTyping || isClosingInterview}
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

function Bubble({ idx, m, accent, tokens, showCaret, isPending = false }) {
  const isAi = m.role === 'ai';
  return (
    <div className={`bubble bubble-${m.role} bubble-enter`} data-msg-idx={idx}>
      {isAi && <div className="bubble-author">면접관</div>}
      <div className="bubble-body" style={!isAi ? { background: accent } : null}>
        {isPending ? (
          <TypingStatus accent={accent} />
        ) : isAi && tokens
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

function TypingStatus({ accent }) {
  return (
    <div className="typing-status" role="status" aria-live="polite">
      <span className="rec-dot" style={{ background: accent }} />
      <span>답변 생성 중...</span>
    </div>
  );
}

function EvalCard({ idx, ev, accent, fresh }) {
  const [open, setOpen] = useState(false);
  const tier = getScoreTier(ev.score, accent);
  const question = ev.question || ev.q || '';
  const feedback = ev.feedback || '';
  return (
    <li className={`iv-eval ${open ? 'is-open' : ''} ${fresh ? 'is-fresh' : ''}`}>
      <button className="iv-eval-row" onClick={() => setOpen(!open)}>
        <span className="iv-eval-num">Q{idx + 1}</span>
        <span className="iv-eval-q">{question.slice(0, 32)}…</span>
        <span
          className={`iv-score ${tier.id}`}
          style={{ '--score-color': tier.color }}
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
