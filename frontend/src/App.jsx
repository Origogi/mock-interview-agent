import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, createTheme, CssBaseline, Box, Typography, Button, 
  CircularProgress, Container
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Sparkles, CheckCircle2, Server, ServerOff } from 'lucide-react';

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

// A styled function is needed for the hidden input above. Let's import it properly.
import { styled } from '@mui/material/styles';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'connected', 'error', 'checking'

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
      alert("PDF 파일만 업로드 가능합니다.");
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

  const handleUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    
    // Mock API Call
    setTimeout(() => {
      setIsUploading(false);
      alert("이력서 분석 완료! (Page 2 전환 로직 추가 예정)");
    }, 2500);
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
        py: 1, px: 2, borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.05)'
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

      <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {/* Header Section */}
        <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} sx={{ textAlign: 'center', mb: 6 }}>
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

        {/* Upload Container */}
        <Box 
          component={motion.div} 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
        >
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3
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
                  
                  <Button
                    component="label"
                    variant="contained"
                    color="primary"
                    startIcon={<FileText size={20} />}
                    sx={{ mt: 2 }}
                  >
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
                    <Button
                      component="label"
                      variant="outlined"
                      sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    >
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
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
