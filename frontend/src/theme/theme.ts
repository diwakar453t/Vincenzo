import { createTheme } from '@mui/material/styles';

// PreSkool ERP Theme
export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#3D5EE1',
            light: '#6B82F0',
            dark: '#2A44B8',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#6C757D',
            light: '#868E96',
            dark: '#495057',
        },
        success: {
            main: '#28A745',
        },
        warning: {
            main: '#FFC107',
        },
        error: {
            main: '#DC3545',
        },
        background: {
            default: '#F8F9FA',
            paper: '#FFFFFF',
        },
        text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Inter", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 700,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 600,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 500,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 500,
        },
        body1: {
            fontSize: '1rem',
        },
        body2: {
            fontSize: '0.875rem',
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 16px',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#FFFFFF',
                    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                },
            },
        },
    },
});

export default theme;
