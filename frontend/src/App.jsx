import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, createTheme, CssBaseline, Box, Typography, Button, 
  CircularProgress, Container, Snackbar, Alert, Paper, Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Sparkles, CheckCircle2, Server, ServerOff, Code2, Briefcase, AlertTriangle, ArrowRight } from 'lucide-react';
import { styled } from '@mui/material/styles';

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
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
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
    borderRadius: 16,
  },
  components: {
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
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // 성공 시 더미 데이터 주입 후 Page 2로 전환
        setSummaryData({
          techStack: ['React', 'Node.js', 'FastAPI', 'AWS'],
          projects: ['대용량 트래픽 처리 서버 구축', 'AI 모의 면접 에이전트 개발'],
          weakPoints: ['데이터베이스 인덱싱 및 캐싱 전략', 'MSA 아키텍처에서의 트랜잭션 관리']
        });
        setCurrentPage('summary');
      } else {
        setErrorMsg(`업로드 실패: ${data.detail}`);
      }
    } catch (error) {
      setErrorMsg(`서버 연결 오류: 백엔드 서버가 실행 중인지 확인해주세요.`);
    } finally {
      setIsUploading(false);
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

  // 랜더링 함수: Page 2 (Summary)
  const renderSummary = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
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
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.05)',
          mb: 5
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Tech Stack */}
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#06b6d4' }}>
              <Code2 size={24} /> 🛠️ 파악된 주요 기술 스택
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
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#a78bfa' }}>
              <Briefcase size={24} /> 🏆 주목할 만한 프로젝트
            </Typography>
            <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {summaryData?.projects.map(proj => (
                <Typography key={proj} variant="body1">▪ {proj}</Typography>
              ))}
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Weak Points */}
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#fbbf24' }}>
              <AlertTriangle size={24} /> ⚠️ 예상되는 집중 질문 포인트
            </Typography>
            <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {summaryData?.weakPoints.map(point => (
                <Typography key={point} variant="body1" color="text.secondary">▪ {point}</Typography>
              ))}
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
          onClick={() => alert("면접 채팅 페이지(Page 3)로 이동 로직 구현 예정")}
        >
          🚀 실전 면접 시작하기
        </Button>
      </Box>
    </motion.div>
  );

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
        py: 1, px: 2, borderRadius: 8,
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

      <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
        <AnimatePresence mode="wait">
          {currentPage === 'home' && <Box key="home">{renderHome()}</Box>}
          {currentPage === 'summary' && <Box key="summary">{renderSummary()}</Box>}
        </AnimatePresence>
      </Container>
    </ThemeProvider>
  );
}

export default App;
