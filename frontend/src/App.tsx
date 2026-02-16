import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store/store';
import theme from './theme/theme';
import { Box, Typography, Container, Card, CardContent } from '@mui/material';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'background.default',
            }}
          >
            <Container maxWidth="md">
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="h2" color="primary" gutterBottom>
                    🎓 PreSkool ERP
                  </Typography>
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    School/College Management System
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 3 }}>
                    Foundation setup complete! 🚀
                  </Typography>
                  <Box sx={{ mt: 3, textAlign: 'left' }}>
                    <Typography variant="body2" color="text.secondary">
                      ✅ React + TypeScript
                      <br />
                      ✅ Material-UI Theme
                      <br />
                      ✅ Redux Toolkit
                      <br />
                      ✅ Axios API Client
                      <br />
                      ✅ React Router
                      <br />
                      ✅ FastAPI Backend Structure
                      <br />
                      ✅ PostgreSQL + Redis + Keycloak Ready
                      <br />
                      ✅ Docker Compose Configuration
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Container>
          </Box>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
