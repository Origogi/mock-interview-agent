import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider, createTheme, Box, Typography, Button,
  CircularProgress, Snackbar, Alert, Paper, Divider, Avatar,
  Grid, LinearProgress, TextField, IconButton, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, Code2, Briefcase, AlertTriangle, ArrowRight,
  User, Building, TrendingUp, Send, ChevronDown, StopCircle, Bot,
  FileX, MoreHorizontal,
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import HomePage from './pages/HomePage.jsx';
import TopBar from './components/TopBar.jsx';
import PageTransition from './components/PageTransition.jsx';

const loadingMessages = [
  "🧹 면접장을 깔끔하게 청소하는 중...",
  "☕ 간단한 다과와 마실 물을 준비하는 중...",
  "👔 면접관이 넥타이를 고쳐 매는 중...",
  "📝 지원서의 핵심 역량에 형광펜을 칠하는 중...",
  "🤔 날카롭고 예리한 꼬리 질문을 고민하는 중...",
];

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
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Page 3 States
  const [messages, setMessages] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentQuestionCount, setCurrentQuestionCount] = useState(1);
  const maxQuestions = 5;
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let interval;
    if (isUploading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    } else {
      setLoadingMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

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

  // ===== Page 2 (Summary) =====
  const renderSummary = () => {
    if (isUploading) {
      return (
        <div className="screen">
          <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 8 }}>
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 6 }}>
                <Box sx={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #a78bfa' }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #06b6d4' }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                      boxShadow: '0 0 40px rgba(124, 58, 237, 0.8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Sparkles size={32} color="white" />
                  </motion.div>
                </Box>
                <Box sx={{ textAlign: 'center', height: '100px' }}>
                  <Typography variant="h4" fontWeight="600" color="primary.light" gutterBottom sx={{ mb: 3 }}>
                    AI가 이력서를 꼼꼼히 분석하고 있습니다...
                  </Typography>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={loadingMsgIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Typography variant="h6" color="text.secondary">
                        {loadingMessages[loadingMsgIdx]}
                      </Typography>
                    </motion.div>
                  </AnimatePresence>
                </Box>
              </Box>
            </motion.div>
          </Box>
        </div>
      );
    }

    return (
      <div className="screen">
        <Box sx={{ maxWidth: 900, mx: 'auto', px: 4, py: 8 }}>
          <motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, color: 'primary.light' }}>
                <CheckCircle2 size={36} />
                면접관이 이력서 분석을 완료했습니다!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                아래의 요약 정보를 확인하고 실전 면접을 준비해 주세요.
              </Typography>
            </Box>

            <Paper sx={{ p: 4, backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', mb: 5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {summaryData?.bio && (
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#f8fafc' }}>
                      <User size={24} color="#a78bfa" /> 프로필 요약
                    </Typography>
                    <Box sx={{ pl: 4, pr: 2 }}>
                      <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, borderLeft: '3px solid #a78bfa', pl: 2.5 }}>
                        {summaryData.bio}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {summaryData?.bio && <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />}

                {summaryData?.workExperience?.length > 0 && (
                  <>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#10b981' }}>
                        <Building size={24} /> 주요 회사 이력
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pl: 4 }}>
                        {summaryData.workExperience.map((work, idx) => (
                          <Box key={idx} sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid #10b981' }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.8rem' }}>{work.period}</Typography>
                            <Typography variant="subtitle1" fontWeight="bold" color="#f8fafc" sx={{ lineHeight: 1.2, mb: 0.5 }}>{work.company}</Typography>
                            <Typography variant="body2" color="#10b981" fontWeight="500">{work.role}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  </>
                )}

                <Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#06b6d4' }}>
                    <Code2 size={24} /> 파악된 주요 기술 스택
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pl: 4 }}>
                    {summaryData?.techStack.map((tech) => (
                      <Box key={tech} sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                        {tech}
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#a78bfa' }}>
                    <Briefcase size={24} /> 주목할 만한 프로젝트
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 4 }}>
                    {summaryData?.projects.map((proj, idx) => (
                      <Box key={idx} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="#f8fafc" gutterBottom>{proj.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{proj.description}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {proj.technologies?.map((tech) => (
                            <Box key={tech} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
                              {tech}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#3b82f6' }}>
                      <TrendingUp size={24} /> 지원자 강점
                    </Typography>
                    <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {summaryData?.strengths?.map((point, idx) => (
                        <Typography key={idx} variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>▪ {point}</Typography>
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#fbbf24' }}>
                      <AlertTriangle size={24} /> 지원자 약점 및 집중 질문
                    </Typography>
                    <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {summaryData?.weakPoints?.map((point, idx) => (
                        <Typography key={idx} variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>▪ {point}</Typography>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  px: 6, py: 2, fontSize: '1.2rem', borderRadius: 8,
                  background: 'linear-gradient(45deg, #7c3aed 0%, #06b6d4 100%)',
                  color: 'white',
                  '&:hover': { transform: 'scale(1.05)' },
                  transition: 'transform 0.2s',
                }}
                endIcon={<ArrowRight />}
                onClick={async () => { await startInterview(summaryData); }}
              >
                🚀 실전 면접 시작하기
              </Button>
            </Box>
          </motion.div>
        </Box>
      </div>
    );
  };

  // ===== Page 3 (Interview) =====
  const renderInterview = () => (
    <div className="screen">
      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 4, py: 4 }}>
        <motion.div key="interview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ width: '100%' }}>
          <Box sx={{ display: 'flex', gap: 3, width: '100%', minWidth: '860px', height: '80vh', mt: 1 }}>
            <Box sx={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
              <Paper sx={{ p: 3, backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp size={20} color="#a78bfa" /> 면접 진행률
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="bold">
                    {currentQuestionCount} / {maxQuestions}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(currentQuestionCount / maxQuestions) * 100}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)' } }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<StopCircle size={18} />}
                  sx={{ mt: 3, borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                  onClick={() => alert('면접 조기 종료 및 결과 보기 (Page 4 이동)')}
                >
                  조기 종료 및 결과 보기
                </Button>
              </Paper>

              <Paper sx={{ p: 3, flex: 1, overflowY: 'auto', backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle2 size={20} color="#10b981" /> 실시간 평가 내역
                </Typography>
                {evaluations.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, opacity: 0.5 }}>
                    <FileX size={48} />
                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
                      아직 평가 내역이 없습니다.<br />첫 답변을 입력해 주세요.
                    </Typography>
                  </Box>
                ) : (
                  evaluations.map((ev, idx) => (
                    <Accordion key={idx} sx={{ backgroundColor: 'rgba(255,255,255,0.03)', mb: 1, '&:before': { display: 'none' }, borderRadius: '8px !important' }}>
                      <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                        <Typography variant="subtitle2">Q{idx + 1}. {ev.question.substring(0, 20)}...</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="primary.light" sx={{ mb: 1 }}>점수: {ev.score}/10</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{ev.feedback}</Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Paper>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
              <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <Avatar sx={{ backgroundColor: '#7c3aed' }}><Bot size={24} /></Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">시니어 엔지니어 면접관</Typography>
                    <Typography variant="body2" color="text.secondary">Tech-Interviewer AI</Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', p: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">상태:</Typography>
                    <Typography variant="h5" sx={{ lineHeight: 1 }}>🤔</Typography>
                  </Box>
                </Box>

                <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {messages.map((msg, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                      <Avatar sx={{ backgroundColor: msg.role === 'ai' ? '#7c3aed' : '#06b6d4', width: 36, height: 36 }}>
                        {msg.role === 'ai' ? <Bot size={20} /> : <User size={20} />}
                      </Avatar>
                      <Box sx={{
                        maxWidth: '75%', px: 3, py: 2, borderRadius: '20px',
                        backgroundColor: msg.role === 'ai' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        border: '1px solid',
                        borderColor: msg.role === 'ai' ? 'rgba(124, 58, 237, 0.3)' : 'rgba(6, 182, 212, 0.3)',
                        borderTopLeftRadius: msg.role === 'ai' ? '4px' : '20px',
                        borderTopRightRadius: msg.role === 'user' ? '4px' : '20px',
                      }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</Typography>
                      </Box>
                    </Box>
                  ))}
                  {isAiTyping && (
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Avatar sx={{ backgroundColor: '#7c3aed', width: 36, height: 36 }}>
                        <Bot size={20} />
                      </Avatar>
                      <Box sx={{ px: 3, py: 2, borderRadius: '20px', backgroundColor: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', borderTopLeftRadius: '4px' }}>
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <MoreHorizontal size={24} color="#a78bfa" />
                        </motion.div>
                      </Box>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="답변을 입력하세요... (Tab: 들여쓰기, Shift+Enter: 줄바꿈, Enter: 전송)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendAnswer(chatInput);
                      }
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        setChatInput((prev) => prev + '    ');
                      }
                    }}
                    variant="outlined"
                    InputProps={{
                      sx: {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 3,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#06b6d4' },
                      },
                      endAdornment: (
                        <IconButton color="primary" onClick={() => sendAnswer(chatInput)}>
                          <Send size={20} />
                        </IconButton>
                      ),
                    }}
                  />
                </Box>
              </Paper>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </div>
  );

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
            {currentPage === 'summary' && renderSummary()}
            {currentPage === 'interview' && renderInterview()}
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
