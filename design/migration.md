# 프로토타입 → MUI 적용 가이드

> 본 가이드는 `Tech-Interviewer Redesign.html` 프로토타입의 핵심 UX/애니메이션을 **실제 frontend (React + MUI + 다크모드)** 코드베이스에 어떻게 옮길지 정리합니다.

---

## 0. 사전 작업: 모션 토큰 등록

`frontend/src/theme/motion.ts` (신규):
```ts
export const motion = {
  ease: {
    out: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    in: 'cubic-bezier(0.4, 0, 0.7, 0)',
  },
  duration: {
    fast: 200,
    base: 320,
    slow: 500,
    radar: 1100,
  },
};
```

테마 augmentation으로 `theme.motion` 노출.

---

## 1. Page 3 — 토큰 스트리밍

### 백엔드 (FastAPI)
```python
# backend/app/api/interview.py
from fastapi.responses import StreamingResponse

@router.post("/interview/answer")
async def answer(req: AnswerRequest):
    async def gen():
        async for chunk in interviewer_node.stream(req):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")
```

LangGraph의 `astream_events`로 LLM 토큰을 받아 SSE로 흘려보내기.

### 프론트
```tsx
// frontend/src/hooks/useStreamingAnswer.ts
export function useStreamingAnswer() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const stream = async (url: string, body: object) => {
    setTokens([]); setDone(false);
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // parse SSE frames, append to tokens
      chunk.split('\n\n').filter(Boolean).forEach(frame => {
        const data = JSON.parse(frame.replace('data: ', ''));
        setTokens(prev => [...prev, data.token]);
      });
    }
    setDone(true);
  };

  return { tokens, done, stream };
}
```

### MUI 메시지 컴포넌트
```tsx
// frontend/src/components/InterviewerMessage.tsx
import { Box, keyframes } from '@mui/material';

const tokenIn = keyframes`
  from { opacity: 0; filter: blur(2px); }
  to   { opacity: 1; filter: blur(0); }
`;

export function InterviewerMessage({ tokens, streaming }: Props) {
  return (
    <Box sx={{
      // NO bubble — Claude style
      fontSize: 18, lineHeight: 1.65,
      color: 'text.primary',
      px: 0,
    }}>
      {tokens.map((t, i) => (
        <Box component="span" key={i} sx={{ animation: `${tokenIn} 0.32s ease-out both` }}>
          {t}
        </Box>
      ))}
      {streaming && (
        <Box component="span" sx={{
          display: 'inline-block', width: 8, height: '1.05em',
          ml: '2px', verticalAlign: '-2px',
          bgcolor: 'accent.main',
          animation: 'caret-blink 1s steps(2) infinite',
        }} />
      )}
    </Box>
  );
}
```

---

## 2. Page 3 — Viewport Pin Scroll

```tsx
// frontend/src/components/InterviewThread.tsx
const threadRef = useRef<HTMLDivElement>(null);
const [pinnedId, setPinnedId] = useState<number | null>(null);

useLayoutEffect(() => {
  if (pinnedId == null) return;
  const el = threadRef.current;
  if (!el) return;
  const node = el.querySelector(`[data-msg-id="${pinnedId}"]`) as HTMLElement;
  if (!node) return;
  const containerRect = el.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const delta = nodeRect.top - containerRect.top;
  const target = el.scrollTop + delta - 24;
  el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
}, [pinnedId]);

// 답변 전송 시
const onSend = (text: string) => {
  const id = nextId();
  addMessage({ id, role: 'user', text });
  setPinnedId(id); // ← 핀 트리거
};

// 스레드 JSX
<Box ref={threadRef} sx={{ overflowY: 'auto', scrollBehavior: 'smooth' }}>
  {messages.map(m => <Message key={m.id} data-msg-id={m.id} {...m} />)}
  <Box sx={{ minHeight: '70vh' }} aria-hidden /> {/* 스페이서 */}
</Box>
```

---

## 3. 아코디언 부드러운 펼침

MUI `Collapse` 대신 `grid-template-rows` 트릭을 쓰면 측정 없이 부드럽게 동작합니다.

```tsx
// frontend/src/components/SmoothCollapse.tsx
export function SmoothCollapse({ open, children }: Props) {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateRows: open ? '1fr' : '0fr',
      transition: theme => `grid-template-rows ${theme.motion.duration.base}ms ${theme.motion.ease.out}`,
    }}>
      <Box sx={{ overflow: 'hidden', minHeight: 0 }}>
        <Box sx={{
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-4px)',
          transition: theme => `opacity 280ms ease 60ms, transform 280ms ease 60ms`,
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

---

## 4. Page 4 — 레이더 차트 애니메이션

Recharts를 쓰는 경우 `isAnimationActive` + `animationDuration`만 조정하면 부분적으로 가능합니다. 더 정밀한 제어가 필요하면 SVG 직접 그리기:

```tsx
// frontend/src/components/RadarChart.tsx
function RadarChart({ scores, accent }: Props) {
  const [progress, setProgress] = useState(0);
  const [dotsIn, setDotsIn] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / 1100);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const dt = setTimeout(() => setDotsIn(true), 700);
    return () => { cancelAnimationFrame(raf); clearTimeout(dt); };
  }, []);

  // ... ring/axis/data polygon with progress, dots with transition delay
}
```

범례 바는 keyframe + CSS variable로:
```tsx
<Box sx={{
  '@keyframes legendFill': { to: { width: 'var(--target-w)' } },
  width: 0,
  animation: 'legendFill 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
  '--target-w': `${value}%`,
  animationDelay: `${600 + idx * 80}ms`,
}} />
```

---

## 5. 페이지 트랜지션

React Router v6 + `<PageTransition>` 래퍼:
```tsx
// frontend/src/components/PageTransition.tsx
export function PageTransition({ children }: Props) {
  const location = useLocation();
  const [shown, setShown] = useState(location.pathname);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [pendingChildren, setPendingChildren] = useState(children);

  useEffect(() => {
    if (location.pathname === shown) {
      setPendingChildren(children);
      return;
    }
    setPhase('out');
    const t = setTimeout(() => {
      setShown(location.pathname);
      setPendingChildren(children);
      setPhase('in');
    }, 280);
    return () => clearTimeout(t);
  }, [location.pathname, children, shown]);

  return (
    <Box key={shown} sx={{
      animation: phase === 'in'
        ? 'pageIn 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both'
        : 'pageOut 0.28s cubic-bezier(0.4, 0, 0.7, 0) both',
      pointerEvents: phase === 'out' ? 'none' : 'auto',
      '@keyframes pageIn': {
        '0%':   { opacity: 0, transform: 'scale(1.02) translateY(8px)', filter: 'blur(6px)' },
        '60%':  { opacity: 1, filter: 'blur(0)' },
        '100%': { opacity: 1, transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
      },
      '@keyframes pageOut': {
        from: { opacity: 1, transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        to:   { opacity: 0, transform: 'scale(0.985) translateY(-4px)', filter: 'blur(4px)' },
      },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }}>
      {pendingChildren}
    </Box>
  );
}
```

---

## 6. 적용 우선순위
1. **2 → 1 → 3 순서** 추천. Pin scroll(2)은 가치 대비 구현 난이도 가장 낮음. 그 다음 스트리밍(1)으로 핵심 경험 강화.
2. 아코디언(3)·차트(4)·페이지 트랜지션(5)는 폴리싱 단계에서 한 묶음.
3. 모든 애니메이션에 `prefers-reduced-motion` 가드 필수.
