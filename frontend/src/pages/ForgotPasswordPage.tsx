import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Container,
} from '@mui/material';
import { School, Email } from '@mui/icons-material';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('If an account with that email exists, a password reset link has been sent.');
    } catch (err: any) {
      // Always show success-like message for security (don't reveal if email exists)
      setSuccess('If an account with that email exists, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{ borderRadius: 3, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3D5EE1 0%, #6366f1 100%)',
              py: 4,
              px: 3,
              textAlign: 'center',
            }}
          >
            <School sx={{ fontSize: 48, color: 'white', mb: 1 }} />
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
              Forgot Password
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
              Enter your email to reset your password
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {success}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 3 }}
                autoFocus
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #3D5EE1 0%, #6366f1 100%)',
                  boxShadow: '0 4px 15px rgba(61,94,225,0.4)',
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
              </Button>
            </form>

            <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 3 }}>
              Remember your password?{' '}
              <Link href="/login" underline="hover" sx={{ fontWeight: 600 }}>
                Sign In
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
