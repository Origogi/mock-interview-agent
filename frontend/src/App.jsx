import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import TopBar from './components/TopBar.jsx';
import PageTransition from './components/PageTransition.jsx';
import Toast from './components/Toast.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isUploading, setIsUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [summaryData, setSummaryData] = useState(null);

  // Page 3 States
  const [messages, setMessages] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentQuestionCount, setCurrentQuestionCount] = useState(1);
  const maxQuestions = 5;
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
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
  };

  const restartFromReport = () => {
    setCurrentPage('home');
    setMessages([]);
    setEvaluations([]);
    setFinalReport(null);
  };

  return (
    <div className="app">
      <TopBar currentPage={currentPage} serverStatus={serverStatus} />

      <div className="viewport">
        <PageTransition pageKey={currentPage}>
          {currentPage === 'home' && (
            <HomePage onSubmit={handleUpload} onError={setErrorMsg} />
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
              onSend={sendAnswer}
              onAbort={() => alert('면접 조기 종료 및 결과 보기 (Page 4 이동)')}
            />
          )}
          {currentPage === 'report' && (
            <ReportPage
              report={finalReport}
              evaluations={evaluations}
              onRestart={restartFromReport}
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
