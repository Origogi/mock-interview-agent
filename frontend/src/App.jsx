import { useEffect, useRef, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import TopBar from './components/TopBar.jsx';
import PageTransition from './components/PageTransition.jsx';
import Toast from './components/Toast.jsx';
import EarlyEndModal from './components/EarlyEndModal.jsx';
import RewindConfirmModal from './components/RewindConfirmModal.jsx';
import TimeMachineOverlay from './components/TimeMachineOverlay.jsx';
import { FIXTURE_SAMPLE_RESUME } from './debug/fixtures.js';

const REPORT_TRANSITION_DELAY_MS = 1000;
const TIME_MACHINE_PAGE_SETTLE_MS = 420;
const TIME_MACHINE_DONE_HOLD_MS = 1000;
const TIME_MACHINE_REVEAL_MS = 360;
const DEFAULT_CLOSING_MESSAGE =
  '좋습니다. 여기까지 5개 질문에 대한 답변을 모두 확인했습니다. 이제 전체 답변을 바탕으로 최종 리포트를 정리하겠습니다.';

// BE가 evaluations[0].question을 빈 문자열로 내려보내는 케이스가 있어,
// 첫 번째 AI 메시지(첫 질문) 본문으로 복구한다. 나머지 인덱스는 BE 응답 그대로 사용.
function normalizeEvaluations(rawEvaluations, messages) {
  const list = Array.isArray(rawEvaluations) ? rawEvaluations : [];
  if (list.length === 0) return list;
  if (list[0]?.question) return list;
  const firstAi = messages.find((m) => m.role === 'ai');
  if (!firstAi?.content) return list;
  const patched = list.slice();
  patched[0] = { ...patched[0], question: firstAi.content };
  return patched;
}

function normalizeChatMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages
    .map((message) => {
      const rawRole = message?.role || message?.type || '';
      const role =
        rawRole === 'human' || rawRole === 'user'
          ? 'user'
          : rawRole === 'assistant' || rawRole === 'ai'
          ? 'ai'
          : rawRole;

      if (role !== 'ai' && role !== 'user') return null;

      const rawContent = message?.content;
      const content = Array.isArray(rawContent)
        ? rawContent
            .map((part) => (typeof part === 'string' ? part : part?.text || ''))
            .join('')
        : String(rawContent ?? '');

      return {
        role,
        content,
        ...(role === 'ai' ? { streamDone: true } : {}),
      };
    })
    .filter(Boolean);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isUploading, setIsUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [isMockSession, setIsMockSession] = useState(false);

  // Page 3 States
  const [messages, setMessages] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentQuestionCount, setCurrentQuestionCount] = useState(1);
  const maxQuestions = 5;
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isFetchingSample, setIsFetchingSample] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [isClosingInterview, setIsClosingInterview] = useState(false);

  // F-29 Early Termination state
  const [earlyEndOpen, setEarlyEndOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastSeverity, setToastSeverity] = useState('info');
  const [rewindRequest, setRewindRequest] = useState(null);
  const [timeMachine, setTimeMachine] = useState({
    open: false,
    phase: 'running',
    questionNumber: null,
  });
  const streamAbortRef = useRef(null);
  const reportTransitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (reportTransitionRef.current) {
        clearTimeout(reportTransitionRef.current);
      }
    };
  }, []);

  const clearReportTransition = () => {
    if (reportTransitionRef.current) {
      clearTimeout(reportTransitionRef.current);
      reportTransitionRef.current = null;
    }
  };

  const scheduleReportTransition = () => {
    clearReportTransition();
    reportTransitionRef.current = setTimeout(() => {
      setCurrentPage('report');
      setIsClosingInterview(false);
      reportTransitionRef.current = null;
    }, REPORT_TRANSITION_DELAY_MS);
  };

  const showClosingMessage = (message) => {
    const content = message || DEFAULT_CLOSING_MESSAGE;
    setMessages((prev) => {
      if (!prev.length) {
        return [{ role: 'ai', content, streamDone: true }];
      }

      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last.role === 'ai' && !last.content) {
        updated[updated.length - 1] = { ...last, content, streamDone: true };
        return updated;
      }

      return [...updated, { role: 'ai', content, streamDone: true }];
    });
  };

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        setServerStatus(response.ok ? 'connected' : 'error');
      } catch {
        setServerStatus('error');
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;

    if (isMockSession) {
      setSummaryData(FIXTURE_SAMPLE_RESUME);
      setErrorMsg('');
      setCurrentPage('summary');
      return;
    }

    setIsUploading(true);
    setCurrentPage('summary');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        const parsed = data.parsed_data || { bio: '', tech_stack: [], projects: [] };
        setSummaryData({
          name: parsed.name || '',
          bio: parsed.bio || '',
          workExperience: parsed.work_experience || [],
          techStack: parsed.tech_stack || [],
          projects: parsed.projects || [],
          strengths: parsed.strengths || ['이력서를 바탕으로 강점을 분석 중입니다.'],
          weakPoints: parsed.weaknesses || parsed.focus_points || ['이력서를 바탕으로 심층 면접 질문을 준비 중입니다.'],
        });
      } else {
        setErrorMsg(`업로드 실패: ${data.detail}`);
        setCurrentPage('home');
      }
    } catch {
      setErrorMsg('서버 연결 오류: 백엔드 서버가 실행 중인지 확인해주세요.');
      setCurrentPage('home');
    } finally {
      setIsUploading(false);
    }
  };

  const startInterview = async (summary) => {
    clearReportTransition();
    const newThreadId = crypto.randomUUID();
    setThreadId(newThreadId);
    setFinalReport(null);
    setIsClosingInterview(false);
    setCurrentPage('interview');
    setIsAiTyping(true);
    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: newThreadId, resume_summary: summary }),
      });
      const data = await res.json();
      setMessages([{ role: 'ai', content: data.question }]);
      setCurrentQuestionCount(data.question_count);
      setEvaluations(data.evaluations || []);
    } catch {
      setErrorMsg('서버 연결 오류: 첫 질문을 받아오지 못했습니다.');
    } finally {
      setIsAiTyping(false);
    }
  };

  const sendAnswer = async (answer) => {
    if (!answer.trim() || !threadId || isAiTyping || isClosingInterview) return;
    setMessages((prev) => [...prev, { role: 'user', content: answer }]);
    setChatInput('');
    setIsAiTyping(true);

    // AbortController for early-termination support — onAbort can cancel mid-stream.
    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      // 스트림 엔드포인트 시도
      const res = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, user_answer: answer }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Stream not available');
      }

      // NDJSON 스트림 처리
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let partialContent = '';
      let streamDoneData = null;

      setIsAiTyping(false); // 스트림 시작 시 타이핑 상태 종료
      setMessages((prev) => [...prev, { role: 'ai', content: '' }]); // AI 메시지 준비

      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let nlIdx;
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);
          if (!line) continue;

          try {
            const event = JSON.parse(line);

            if (event.type === 'token') {
              partialContent += event.value;
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = {
                  role: 'ai',
                  content: partialContent,
                };
                return newMsgs;
              });
            } else if (event.type === 'done') {
              streamDoneData = event.data;
            } else if (event.type === 'error') {
              console.warn('Stream error:', event.message);
            }
          } catch (parseErr) {
            console.warn('JSON parse error in stream:', parseErr);
          }
        }
      }

      // 최종 메시지 정확성을 위해 streamDoneData로 덮어씀
      if (streamDoneData) {
        setEvaluations(normalizeEvaluations(streamDoneData.evaluations, messages));
        setCurrentQuestionCount(streamDoneData.question_count);
        if (streamDoneData.is_finished) {
          setFinalReport(streamDoneData.final_report);
          setIsAiTyping(false);
          setIsClosingInterview(true);
          showClosingMessage(streamDoneData.closing_message);
          scheduleReportTransition();
        }
        // Mark stream completion for InterviewPage to detect
        setMessages((prev) => {
          if (prev.length > 0) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], streamDone: true };
            return updated;
          }
          return prev;
        });
      }
    } catch (streamErr) {
      // Aborted (early-termination) — caller handles cleanup, skip fallback.
      if (controller.signal.aborted || streamErr?.name === 'AbortError') {
        setIsAiTyping(false);
        return;
      }

      // 폴백: 동기 `/api/chat` 호출
      console.warn('Stream failed, falling back to sync /api/chat:', streamErr);
      setIsAiTyping(true);
      try {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId, user_answer: answer }),
          signal: controller.signal,
        });
        const data = await res.json();
        setEvaluations(normalizeEvaluations(data.evaluations, messages));
        setCurrentQuestionCount(data.question_count);
        if (data.is_finished) {
          setFinalReport(data.final_report);
          setIsClosingInterview(true);
          showClosingMessage(data.closing_message);
          scheduleReportTransition();
        } else {
          setMessages((prev) => [...prev, { role: 'ai', content: data.question }]);
        }
      } catch (fbErr) {
        if (controller.signal.aborted || fbErr?.name === 'AbortError') return;
        setErrorMsg('서버 연결 오류: 답변 전송에 실패했습니다.');
      } finally {
        setIsAiTyping(false);
      }
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    }
  };

  const handleFillSampleAnswer = async (tier) => {
    if (!threadId || isFetchingSample || isAiTyping || isClosingInterview) return;
    setIsFetchingSample(true);
    try {
      const res = await fetch('http://localhost:8000/api/debug/sample-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, quality_tier: tier }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatInput(data.answer);
      } else {
        setErrorMsg(`샘플 답변 실패: ${data.detail || '알 수 없음'}`);
      }
    } catch {
      setErrorMsg('샘플 답변 호출 실패: 백엔드 확인 필요');
    } finally {
      setIsFetchingSample(false);
    }
  };


  const handleSelectSampleResume = () => {
    setIsMockSession(true);
  };

  const handleClearMock = () => {
    setIsMockSession(false);
  };

  const handleRestartOrClearMock = () => {
    clearReportTransition();
    setCurrentPage('home');
    setMessages([]);
    setEvaluations([]);
    setFinalReport(null);
    setIsClosingInterview(false);
    setIsMockSession(false);
  };

  // F-29 Early Termination: Step 1 — open modal (no API yet)
  const handleEarlyEndOpen = () => {
    if (earlyEndOpen || isClosingInterview) return;
    setEarlyEndOpen(true);
  };

  // F-29: Step 2 — user dismissed via Esc / backdrop / "계속 면접보기"
  const handleEarlyEndCancel = () => {
    setEarlyEndOpen(false);
  };

  // F-29: Step 3 — Primary CTA confirmed.
  // Abort in-flight stream → POST /api/interview/end → branch on response.
  const handleEarlyEndConfirm = async () => {
    if (!threadId) {
      setEarlyEndOpen(false);
      return;
    }

    // Abort any in-flight stream so BE lock can release; ignore if none.
    if (streamAbortRef.current) {
      try {
        streamAbortRef.current.abort();
      } catch {
        /* noop */
      }
      streamAbortRef.current = null;
    }
    setIsAiTyping(false);

    try {
      const res = await fetch('http://localhost:8000/api/interview/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId }),
      });

      // 409 — already naturally finished. Use existing finalReport if available.
      if (res.status === 409) {
        setEarlyEndOpen(false);
        setToastSeverity('info');
        setToastMsg('이미 면접이 종료되었어요. 결과 리포트로 이동합니다.');
        if (finalReport) {
          clearReportTransition();
          setIsClosingInterview(false);
          setCurrentPage('report');
        }
        return;
      }

      if (!res.ok) {
        // 404 or other — surface error toast, close modal.
        setEarlyEndOpen(false);
        setToastSeverity('error');
        setToastMsg('면접 종료에 실패했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const data = await res.json();

      // Case A — partial report available.
      if (data.final_report) {
        setFinalReport(data.final_report);
        if (Array.isArray(data.evaluations)) {
          setEvaluations(normalizeEvaluations(data.evaluations, messages));
        }
        setEarlyEndOpen(false);
        // Immediate transition — composer is already locked, no setTimeout race.
        setCurrentPage('report');
        return;
      }

      // Case B — discarded, return to Page 1 with warning toast.
      const answeredCount = data.answered_count ?? 0;
      setEarlyEndOpen(false);
      handleRestartOrClearMock();
      setToastSeverity('warning');
      setToastMsg(
        data.message ||
          (answeredCount > 0
            ? `답변(${answeredCount}개)이 부족해 리포트를 만들지 못했어요. 다시 시도해 주세요.`
            : '답변이 부족해 리포트를 만들지 못했어요. 다시 시도해 주세요.')
      );
    } catch (err) {
      console.warn('Early-end request failed:', err);
      setEarlyEndOpen(false);
      setToastSeverity('error');
      setToastMsg('네트워크 오류로 면접 종료에 실패했어요. 다시 시도해 주세요.');
    }
  };

  const handleRewindRequest = ({ questionIndex, source }) => {
    const targetIndex = Number(questionIndex);
    if (!threadId || !Number.isInteger(targetIndex)) return;
    if (isAiTyping || isClosingInterview || earlyEndOpen || rewindRequest || timeMachine.open) return;

    setRewindRequest({
      questionIndex: targetIndex,
      questionNumber: targetIndex + 1,
      source,
    });
  };

  const handleRewindCancel = () => {
    setRewindRequest(null);
  };

  const handleRewindConfirm = async () => {
    if (!rewindRequest || !threadId) return;

    const request = rewindRequest;
    setRewindRequest(null);
    clearReportTransition();

    if (streamAbortRef.current) {
      try {
        streamAbortRef.current.abort();
      } catch {
        /* noop */
      }
      streamAbortRef.current = null;
    }

    setIsAiTyping(false);
    setIsFetchingSample(false);
    setIsClosingInterview(false);
    setTimeMachine({
      open: true,
      phase: 'running',
      questionNumber: request.questionNumber,
    });

    try {
      const res = await fetch('http://localhost:8000/api/interview/rewind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          target_question_index: request.questionNumber,
          source: request.source,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || '되감기 요청에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }

      const normalizedMessages = normalizeChatMessages(data.messages);
      const normalizedEvaluations = normalizeEvaluations(data.evaluations, normalizedMessages);
      const nextQuestionCount = Number(data.question_count);

      setMessages(normalizedMessages);
      setEvaluations(normalizedEvaluations);
      setCurrentQuestionCount(
        Number.isFinite(nextQuestionCount) ? nextQuestionCount : request.questionNumber
      );
      setChatInput('');
      setFinalReport(null);
      setIsClosingInterview(false);
      setEarlyEndOpen(false);
      setCurrentPage('interview');

      await wait(TIME_MACHINE_PAGE_SETTLE_MS);
      setTimeMachine((prev) => ({
        ...prev,
        phase: 'done',
      }));
      await wait(TIME_MACHINE_DONE_HOLD_MS);
      setTimeMachine((prev) => ({
        ...prev,
        phase: 'revealing',
      }));
      await wait(TIME_MACHINE_REVEAL_MS);
      setTimeMachine({
        open: false,
        phase: 'running',
        questionNumber: null,
      });
    } catch (err) {
      console.warn('Rewind request failed:', err);
      setTimeMachine({
        open: false,
        phase: 'running',
        questionNumber: null,
      });
      setToastSeverity('error');
      setToastMsg(err?.message || '되감기 요청에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div className="app">
      <TopBar currentPage={currentPage} serverStatus={serverStatus} />

      <div className={`viewport${timeMachine.open ? ' is-time-machine-covered' : ''}`}>
        <PageTransition pageKey={currentPage}>
          {currentPage === 'home' && (
            <HomePage onSubmit={handleUpload} onError={setErrorMsg} onSelectSampleResume={handleSelectSampleResume} onClearMock={handleClearMock} isUploading={isUploading} />
          )}
          {currentPage === 'summary' && (
            <SummaryPage
              data={summaryData}
              loading={isUploading}
              onStart={startInterview}
            />
          )}
          {currentPage === 'interview' && (
            <InterviewPage
              messages={messages}
              evaluations={evaluations}
              currentQuestionCount={currentQuestionCount}
              maxQuestions={maxQuestions}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isAiTyping={isAiTyping}
              isFetchingSample={isFetchingSample}
              isClosingInterview={isClosingInterview}
              onSend={sendAnswer}
              onFillSampleAnswer={handleFillSampleAnswer}
              onAbort={handleEarlyEndOpen}
              onRewindRequest={handleRewindRequest}
              rewindDisabled={earlyEndOpen || !!rewindRequest || timeMachine.open}
            />
          )}
          {currentPage === 'report' && (
            <ReportPage
              report={finalReport}
              evaluations={evaluations}
              onRestart={handleRestartOrClearMock}
              onRewindRequest={handleRewindRequest}
              rewindDisabled={!threadId || !!rewindRequest || timeMachine.open}
            />
          )}
        </PageTransition>
      </div>

      <Toast
        open={!!errorMsg}
        message={errorMsg}
        severity="error"
        duration={6000}
        onClose={() => setErrorMsg('')}
      />

      <Toast
        open={!!toastMsg}
        message={toastMsg}
        severity={toastSeverity}
        duration={5000}
        onClose={() => setToastMsg('')}
      />

      <EarlyEndModal
        open={earlyEndOpen}
        answeredCount={evaluations.length}
        maxQuestions={maxQuestions}
        threshold={3}
        onConfirm={handleEarlyEndConfirm}
        onCancel={handleEarlyEndCancel}
      />

      <RewindConfirmModal
        open={!!rewindRequest}
        questionNumber={rewindRequest?.questionNumber ?? 1}
        onConfirm={handleRewindConfirm}
        onCancel={handleRewindCancel}
      />

      <TimeMachineOverlay
        open={timeMachine.open}
        phase={timeMachine.phase}
        questionNumber={timeMachine.questionNumber ?? 1}
      />
    </div>
  );
}

export default App;
