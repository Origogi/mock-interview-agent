import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, CircularProgress, Chip } from '@mui/material';

function App() {
  const [status, setStatus] = useState('Connecting to Backend...');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Fetch status from FastAPI Backend
    fetch('http://localhost:8000/')
      .then(response => response.json())
      .then(data => {
        setStatus(data.status);
        setIsConnected(true);
      })
      .catch(error => {
        setStatus('Failed to connect to backend: ' + error.message);
        setIsConnected(false);
      });
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 10, textAlign: 'center' }}>
      <Typography variant="h3" gutterBottom fontWeight="bold" color="primary">
        Tech-Interviewer AI 🤖
      </Typography>
      
      <Paper elevation={3} sx={{ p: 5, mt: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom>
          System Status Check
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {!isConnected && status.includes('Connecting') && <CircularProgress size={24} />}
          <Chip 
            label={status} 
            color={isConnected ? 'success' : 'error'} 
            variant="outlined" 
            sx={{ fontSize: '1.1rem', py: 2.5, px: 2 }} 
          />
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mt: 4 }}>
          React Frontend is running successfully on Vite! ⚡️
        </Typography>
      </Paper>
    </Container>
  );
}

export default App;
