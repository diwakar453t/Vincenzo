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
  InputAdornment,
  IconButton,
  Divider,
  Container,
} from '@mui/material';
import { Visibility, VisibilityOff, School } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/slices/authSlice';
import api from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      dispatch(loginSuccess({ user, token: access_token }));

      // Role-based redirect
      const role = user?.role;
      if (role === 'student') navigate('/student-dashboard');
      else if (role === 'teacher') navigate('/teacher-dashboard');
      else if (role === 'parent') navigate('/parent-dashboard');
      else if (role === 'super_admin') navigate('/super-admin-dashboard');
      else navigate('/admin-dashboard'); // admin default
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
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
          sx={{
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
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
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
              PreSkool ERP
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
              School/College Management System
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to continue to your dashboard
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 2 }}
                autoFocus
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Link href="/forgot-password" underline="hover" sx={{ fontSize: '0.875rem' }}>
                  Forgot Password?
                </Link>
              </Box>

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
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(61,94,225,0.6)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </form>

            <Divider sx={{ my: 3 }}>or</Divider>

            <Typography variant="body2" align="center" color="text.secondary">
              Don't have an account?{' '}
              <Link href="/register" underline="hover" sx={{ fontWeight: 600 }}>
                Sign Up
              </Link>
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="body2" align="center" sx={{ mt: 3, color: 'rgba(255,255,255,0.7)' }}>
          © 2026 PreSkool ERP. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
