import React, { useState, useEffect, useRef } from 'react';
import { 
  ThemeProvider, createTheme, CssBaseline, Box, Typography, Button, 
  CircularProgress, Container, Snackbar, Alert, Paper, Divider, Avatar,
  Grid, LinearProgress, TextField, IconButton, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Sparkles, CheckCircle2, Server, ServerOff, Code2, Briefcase, AlertTriangle, ArrowRight, User, Loader2, Building, TrendingUp, Send, ChevronDown, StopCircle, Bot, FileX, MoreHorizontal } from 'lucide-react';
import { styled } from '@mui/material/styles';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

// Witty loading messages
const loadingMessages = [
  "🧹 면접장을 깔끔하게 청소하는 중...",
  "☕ 간단한 다과와 마실 물을 준비하는 중...",
  "👔 면접관이 넥타이를 고쳐 매는 중...",
  "📝 지원서의 핵심 역량에 형광펜을 칠하는 중...",
  "🤔 날카롭고 예리한 꼬리 질문을 고민하는 중...",
];

// Create a premium dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c3aed', // Vibrant purple
      light: '#a78bfa',
      dark: '#5b21b6',
    },
    secondary: {
      main: '#06b6d4', // Cyan
    },
    background: {
      default: '#0f172a', // Slate 900
      paper: 'rgba(30, 41, 59, 0.7)', // Transparent Slate 800
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    }
  },
  typography: {
    fontFamily: '"Pretendard Variable", "Pretendard", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 400,
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        #root {
          width: 100%;
          margin: 0;
          padding: 0;
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 28px',
          fontSize: '1.05rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 8px 20px -6px rgba(124, 58, 237, 0.5)',
          }
        }
      }
    }
  }
});

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'summary'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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

  // Scroll to bottom of chat
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
        if (response.ok) {
          setServerStatus('connected');
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        setServerStatus('error');
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else if (file) {
      setErrorMsg("PDF 파일만 업로드 가능합니다.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setCurrentPage('summary'); // 즉시 Page 2로 이동하여 로딩 화면 노출
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

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
          weakPoints: parsed.weaknesses || parsed.focus_points || ['이력서를 바탕으로 심층 면접 질문을 준비 중입니다.']
        });
        // 상태 유지 (isUploading이 false가 되면 요약 화면 표시됨)
      } else {
        setErrorMsg(`업로드 실패: ${data.detail}`);
        setCurrentPage('home'); // 실패 시 다시 홈으로
      }
    } catch (error) {
      setErrorMsg(`서버 연결 오류: 백엔드 서버가 실행 중인지 확인해주세요.`);
      setCurrentPage('home'); // 실패 시 다시 홈으로
    } finally {
      setIsUploading(false);
    }
  };

  // 면접 시작: 백엔드에 첫 질문 요청
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
    } catch (e) {
      setErrorMsg('서버 연결 오류: 첫 질문을 받아오지 못했습니다.');
    } finally {
      setIsAiTyping(false);
    }
  };

  // 답변 전송: 백엔드에 사용자 답변을 보내고 다음 질문 수신
  const sendAnswer = async (answer) => {
    if (!answer.trim() || !threadId || isAiTyping) return;
    setMessages(prev => [...prev, { role: 'user', content: answer }]);
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
        setMessages(prev => [...prev, { role: 'ai', content: '면접이 모두 완료되었습니다! 결과를 집계하는 중...' }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: data.question }]);
      }
    } catch (e) {
      setErrorMsg('서버 연결 오류: 답변 전송에 실패했습니다.');
    } finally {
      setIsAiTyping(false);
    }
  };

  // 랜더링 함수: Page 1 (Home)
  const renderHome = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" gutterBottom sx={{ 
          background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2
        }}>
          <Sparkles size={40} color="#a78bfa" />
          Tech-Interviewer AI
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
          당신의 이력서를 분석하여 실제 기술 면접처럼 날카로운 꼬리 질문을 던집니다.
        </Typography>
      </Box>

      <Box 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          p: { xs: 4, md: 8 },
          textAlign: 'center',
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : selectedFile ? 'secondary.main' : 'rgba(148, 163, 184, 0.2)',
          borderRadius: 4,
          transition: 'all 0.3s ease',
          boxShadow: isDragOver ? '0 0 30px rgba(124, 58, 237, 0.2)' : '0 10px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
        }}
      >
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
            >
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                <Box sx={{ p: 3, borderRadius: '50%', backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'primary.light' }}>
                  <UploadCloud size={48} />
                </Box>
              </motion.div>
              <Typography variant="h6" fontWeight="600">이력서 PDF 파일을 드래그하여 놓으세요</Typography>
              <Typography variant="body2" color="text.secondary">또는 아래 버튼을 클릭하여 직접 선택하세요 (최대 5MB)</Typography>
              
              <Button component="label" variant="contained" color="primary" startIcon={<FileText size={20} />} sx={{ mt: 2 }}>
                내 PC에서 이력서 찾기
                <VisuallyHiddenInput type="file" accept="application/pdf" onChange={handleFileChange} />
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="file-selected"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}
            >
              <Box sx={{ p: 2, borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'secondary.main' }}>
                <CheckCircle2 size={48} />
              </Box>
              
              <Box sx={{ p: 2, px: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileText size={20} color="#a78bfa" />
                  {selectedFile.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button component="label" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  다시 선택
                  <VisuallyHiddenInput type="file" accept="application/pdf" onChange={handleFileChange} />
                </Button>

                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleUpload}
                  disabled={isUploading}
                  sx={{ 
                    background: 'linear-gradient(45deg, #7c3aed 0%, #06b6d4 100%)',
                    color: 'white',
                    '&:hover': { opacity: 0.9 }
                  }}
                >
                  {isUploading ? (
                    <>
                      <CircularProgress size={20} color="inherit" sx={{ mr: 1.5 }} />
                      이력서 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} style={{ marginRight: '8px' }} />
                      AI 분석 시작하기
                    </>
                  )}
                </Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </motion.div>
  );

  // 랜더링 함수: Page 2 (Summary / Loading)
  const renderSummary = () => {
    if (isUploading) {
      return (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 6 }}>
            {/* Custom AI Core Loader */}
            <Box sx={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #a78bfa' }}
              />
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #06b6d4' }}
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ 
                  width: 64, height: 64, borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                  boxShadow: '0 0 40px rgba(124, 58, 237, 0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
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
      );
    }

    return (
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

      <Paper 
        sx={{ 
          p: 4, 
          backgroundColor: 'background.paper', 
          backdropFilter: 'blur(16px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.05)',
          mb: 5
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Bio */}
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

          {/* Work Experience */}
          {summaryData?.workExperience?.length > 0 && (
            <>
              <Box>
                <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#10b981' }}>
                  <Building size={24} /> 주요 회사 이력
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pl: 4 }}>
                  {summaryData.workExperience.map((work, idx) => (
                    <Box key={idx} sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid #10b981' }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.8rem' }}>
                        {work.period}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight="bold" color="#f8fafc" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                        {work.company}
                      </Typography>
                      <Typography variant="body2" color="#10b981" fontWeight="500">
                        {work.role}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            </>
          )}

          {/* Tech Stack */}
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#06b6d4' }}>
              <Code2 size={24} /> 파악된 주요 기술 스택
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pl: 4 }}>
              {summaryData?.techStack.map(tech => (
                <Box key={tech} sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                  {tech}
                </Box>
              ))}
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Projects */}
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, color: '#a78bfa' }}>
              <Briefcase size={24} /> 주목할 만한 프로젝트
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 4 }}>
              {summaryData?.projects.map((proj, idx) => (
                <Box key={idx} sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#f8fafc" gutterBottom>
                    {proj.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {proj.description}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {proj.technologies?.map(tech => (
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

          {/* Strengths & Weaknesses (Grid Layout) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
            {/* Strengths */}
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

            {/* Weak Points */}
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
            transition: 'transform 0.2s'
          }}
          endIcon={<ArrowRight />}
          onClick={async () => {
            await startInterview(summaryData);
          }}
        >
          🚀 실전 면접 시작하기
        </Button>
      </Box>
    </motion.div>
    );
  };

  // 랜더링 함수: Page 3 (Interview Chat)
  const renderInterview = () => {
    return (
      <motion.div key="interview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 3, width: '100%', minWidth: '860px', height: '80vh', mt: 1 }}>
          {/* Left Panel: Dashboard */}
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
                onClick={() => alert("면접 조기 종료 및 결과 보기 (Page 4 이동)")}
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
                    아직 평가 내역이 없습니다.<br/>첫 답변을 입력해 주세요.
                  </Typography>
                </Box>
              ) : (
                evaluations.map((ev, idx) => (
                  <Accordion key={idx} sx={{ backgroundColor: 'rgba(255,255,255,0.03)', mb: 1, '&:before': { display: 'none' }, borderRadius: '8px !important' }}>
                    <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                      <Typography variant="subtitle2">Q{idx+1}. {ev.question.substring(0, 20)}...</Typography>
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

          {/* Right Panel: Chat Room */}
          <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', backdropFilter: 'blur(16px)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              
              {/* Chat Header */}
              <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Avatar sx={{ backgroundColor: '#7c3aed' }}><Bot size={24} /></Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">시니어 엔지니어 면접관</Typography>
                  <Typography variant="body2" color="text.secondary">Tech-Interviewer AI</Typography>
                </Box>
                {/* Interviewer Reaction Avatar/Emoji Placeholder */}
                <Box sx={{ ml: 'auto', p: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">상태:</Typography>
                  <Typography variant="h5" sx={{ lineHeight: 1 }}>🤔</Typography>
                </Box>
              </Box>

              {/* Chat Messages */}
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

              {/* Chat Input */}
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
                      setChatInput(prev => prev + "    ");
                    }
                  }}
                  variant="outlined"
                  InputProps={{
                    sx: { 
                      backgroundColor: 'rgba(255,255,255,0.08)', 
                      borderRadius: 3,
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&.Mui-focused fieldset': { borderColor: '#06b6d4' }
                    },
                    endAdornment: (
                      <IconButton 
                        color="primary" 
                        onClick={() => sendAnswer(chatInput)}
                      >
                        <Send size={20} />
                      </IconButton>
                    )
                  }}
                />
              </Box>
            </Paper>
          </Box>
        </Box>
      </motion.div>
    );
  // 랜더링 함수: Page 4 (Final Report)
  const renderReport = () => {
    const chartData = [
      { subject: 'CS Fundamentals', A: finalReport?.scores?.cs_fundamentals || 50, fullMark: 100 },
      { subject: 'Framework Usage', A: finalReport?.scores?.framework_usage || 50, fullMark: 100 },
      { subject: 'Problem Solving', A: finalReport?.scores?.problem_solving || 50, fullMark: 100 },
      { subject: 'Communication', A: finalReport?.scores?.communication || 50, fullMark: 100 },
    ];

    return (
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
                    <Radar
                      name="지원자"
                      dataKey="A"
                      stroke="#7c3aed"
                      fill="#7c3aed"
                      fillOpacity={0.6}
                    />
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
                      <Typography fontWeight="bold">Q{idx+1}. {ev.question.substring(0, 60)}...</Typography>
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
              setSelectedFile(null);
              setFinalReport(null);
            }}
          >
            새로운 면접 시작하기
          </Button>
        </Box>
      </motion.div>
    );
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      {/* Animated Background Mesh Gradient */}
      <Box sx={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1,
        background: 'radial-gradient(circle at 15% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), #0f172a',
      }} />

      {/* Server Status Indicator (Top Right) */}
      <Box sx={{ 
        position: 'absolute', top: 24, right: 32, 
        display: 'flex', alignItems: 'center', gap: 1.5,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(8px)',
        py: 1, px: 2, borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10
      }}>
        {serverStatus === 'connected' ? (
          <>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            </motion.div>
            <Server size={18} color="#10b981" />
            <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>API Connected</Typography>
          </>
        ) : serverStatus === 'error' ? (
          <>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
            <ServerOff size={18} color="#ef4444" />
            <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 600 }}>API Offline</Typography>
          </>
        ) : (
          <>
            <CircularProgress size={14} color="secondary" />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>Checking API...</Typography>
          </>
        )}
      </Box>

      {/* Error Snackbar Popup */}
      <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setErrorMsg('')} severity="error" variant="filled" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>

      {currentPage === 'interview' ? (
        <Box sx={{ width: '100%', minWidth: '900px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4, px: 4 }}>
          <AnimatePresence mode="wait">
            {currentPage === 'interview' && <Box key="interview" sx={{ width: '100%' }}>{renderInterview()}</Box>}
            {currentPage === 'report' && <Box key="report" sx={{ width: '100%', maxWidth: '1200px', mx: 'auto' }}>{renderReport()}</Box>}
          </AnimatePresence>
        </Box>
      ) : (
        <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
          <AnimatePresence mode="wait">
            {currentPage === 'home' && <Box key="home">{renderHome()}</Box>}
            {currentPage === 'summary' && <Box key="summary">{renderSummary()}</Box>}
          </AnimatePresence>
        </Container>
      )}
    </ThemeProvider>
  );
}

export default App;
