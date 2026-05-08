import React, { useState, useEffect } from 'react';
import {
  ThemeProvider, createTheme, Box, Typography, Button,
  Snackbar, Alert, Paper, Avatar,
  Grid, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, ChevronDown } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import HomePage from './pages/HomePage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import TopBar from './components/TopBar.jsx';
import PageTransition from './components/PageTransition.jsx';

// MUI 테마는 Page 2~4가 의존하므로 유지. body/배경은 tokens.css가 담당.
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
    secondary: { main: '#06b6d4' },
    background: {
      default: 'transparent',
      paper: 'rgba(30, 41, 59, 0.7)',
    },
    text: { primary: '#f8fafc', secondary: '#94a3b8' },
  },
  typography: {
    fontFamily: '"Pretendard Variable", "Pretendard", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 400, lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 28px',
          fontSize: '1.05rem',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 8px 20px -6px rgba(124, 58, 237, 0.5)' },
        },
      },
    },
  },
});

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


  // ===== Page 4 (Report) =====
  const renderReport = () => {
    const chartData = [
      { subject: 'CS Fundamentals', A: finalReport?.scores?.cs_fundamentals || 50, fullMark: 100 },
      { subject: 'Framework Usage', A: finalReport?.scores?.framework_usage || 50, fullMark: 100 },
      { subject: 'Problem Solving', A: finalReport?.scores?.problem_solving || 50, fullMark: 100 },
      { subject: 'Communication', A: finalReport?.scores?.communication || 50, fullMark: 100 },
    ];

    return (
      <div className="screen">
        <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 4, py: 4 }}>
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: 'primary.light' }}>
                면접 결과 리포트
              </Typography>
              <Typography variant="body1" color="text.secondary">
                고생하셨습니다! 지원자님의 역량 분석 결과입니다.
              </Typography>
            </Box>

            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '450px', backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>역량 다이어그램</Typography>
                  <Box sx={{ width: '100%', height: '100%', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar name="지원자" dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 4, height: '450px', overflowY: 'auto', backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="h6" fontWeight="bold" color="secondary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp size={20} /> 종합 피드백
                  </Typography>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#f8fafc" gutterBottom>강점</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 2 }}>
                      {finalReport?.feedback?.strengths}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" color="#f8fafc" gutterBottom>약점</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 2 }}>
                      {finalReport?.feedback?.weaknesses}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" color="#f8fafc" gutterBottom>개선 방향</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {finalReport?.feedback?.improvements?.map((imp, i) => (
                        <Typography key={i} variant="body2" color="text.secondary">▪ {imp}</Typography>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 4, mb: 3, textAlign: 'center' }}>상세 문항 피드백</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {evaluations.map((ev, idx) => (
                    <Accordion key={idx} sx={{ backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: '12px !important', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <AccordionSummary expandIcon={<ChevronDown size={20} />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: ev.score >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: ev.score >= 7 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                            {ev.score}
                          </Avatar>
                          <Typography fontWeight="bold">Q{idx + 1}. {ev.question.substring(0, 60)}...</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 4, pb: 4 }}>
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" color="primary.light" gutterBottom>내 답변</Typography>
                          <Typography variant="body1" sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, whiteSpace: 'pre-wrap' }}>{ev.answer}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="secondary.main" gutterBottom>면접관의 피드백</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{ev.feedback}</Typography>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, mb: 4 }}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Sparkles size={20} />}
                sx={{ px: 6, borderRadius: 8, borderColor: 'primary.main', color: 'primary.light' }}
                onClick={() => {
                  setCurrentPage('home');
                  setMessages([]);
                  setEvaluations([]);
                  setFinalReport(null);
                }}
              >
                새로운 면접 시작하기
              </Button>
            </Box>
          </motion.div>
        </Box>
      </div>
    );
  };

  return (
    <ThemeProvider theme={darkTheme}>
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
            {currentPage === 'report' && renderReport()}
          </PageTransition>
        </div>

        <Snackbar
          open={!!errorMsg}
          autoHideDuration={6000}
          onClose={() => setErrorMsg('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setErrorMsg('')} severity="error" variant="filled" sx={{ width: '100%' }}>
            {errorMsg}
          </Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}

export default App;
