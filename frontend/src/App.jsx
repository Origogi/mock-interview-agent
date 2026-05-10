import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import TopBar from './components/TopBar.jsx';
import PageTransition from './components/PageTransition.jsx';
import Toast from './components/Toast.jsx';
import { FIXTURE_SAMPLE_RESUME } from './debug/fixtures.js';

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
    const newThreadId = crypto.randomUUID();
    setThreadId(newThreadId);
    setFinalReport(null);
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
    if (!answer.trim() || !threadId || isAiTyping) return;
    setMessages((prev) => [...prev, { role: 'user', content: answer }]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      // 스트림 엔드포인트 시도
      const res = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, user_answer: answer }),
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
        setEvaluations(streamDoneData.evaluations || []);
        setCurrentQuestionCount(streamDoneData.question_count);
        if (streamDoneData.is_finished) {
          setFinalReport(streamDoneData.final_report);
          setTimeout(() => setCurrentPage('report'), 2000);
          setMessages((prev) => [...prev, { role: 'ai', content: '면접이 모두 완료되었습니다! 결과를 집계하는 중...' }]);
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
      // 폴백: 동기 `/api/chat` 호출
      console.warn('Stream failed, falling back to sync /api/chat:', streamErr);
      setIsAiTyping(true);
      try {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId, user_answer: answer }),
        });
        const data = await res.json();
        setEvaluations(data.evaluations || []);
        setCurrentQuestionCount(data.question_count);
        if (data.is_finished) {
          setFinalReport(data.final_report);
          setTimeout(() => setCurrentPage('report'), 2000);
          setMessages((prev) => [...prev, { role: 'ai', content: '면접이 모두 완료되었습니다! 결과를 집계하는 중...' }]);
        } else {
          setMessages((prev) => [...prev, { role: 'ai', content: data.question }]);
        }
      } catch {
        setErrorMsg('서버 연결 오류: 답변 전송에 실패했습니다.');
      } finally {
        setIsAiTyping(false);
      }
    }
  };

  const handleFillSampleAnswer = async (tier) => {
    if (!threadId || isFetchingSample || isAiTyping) return;
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
    setCurrentPage('home');
    setMessages([]);
    setEvaluations([]);
    setFinalReport(null);
    setIsMockSession(false);
  };

  return (
    <div className="app">
      <TopBar currentPage={currentPage} serverStatus={serverStatus} />

      <div className="viewport">
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
              onSend={sendAnswer}
              onFillSampleAnswer={handleFillSampleAnswer}
              onAbort={() => alert('면접 조기 종료 및 결과 보기 (Page 4 이동)')}
            />
          )}
          {currentPage === 'report' && (
            <ReportPage
              report={finalReport}
              evaluations={evaluations}
              onRestart={handleRestartOrClearMock}
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
    </div>
  );
}

export default App;
