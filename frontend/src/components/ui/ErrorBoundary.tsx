import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
    children: ReactNode;
    /** Optional custom fallback — if omitted, the default error card is shown */
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * React class-based error boundary.
 * Catches JS errors anywhere in the child component tree and shows a styled fallback.
 * Wrap around any page or section that may throw.
 */
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // In production, forward to your error tracking service:
        // Sentry.captureException(error, { extra: errorInfo });
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '60vh',
                        p: 3,
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            maxWidth: 480,
                            width: '100%',
                            p: 4,
                            textAlign: 'center',
                            border: '1px solid rgba(220,53,69,0.2)',
                            borderRadius: 3,
                            bgcolor: 'rgba(220,53,69,0.04)',
                        }}
                    >
                        <ErrorOutline
                            sx={{ fontSize: 64, color: '#DC3545', mb: 2, opacity: 0.7 }}
                        />

                        <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
                            Something went wrong
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            {this.state.error?.message || 'An unexpected error occurred on this page.'}
                        </Typography>

                        <Button
                            variant="contained"
                            startIcon={<Refresh />}
                            onClick={this.handleRetry}
                            sx={{
                                background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)',
                                boxShadow: '0 4px 14px rgba(61,94,225,0.35)',
                                '&:hover': { background: 'linear-gradient(135deg, #2A44B8, #3D5EE1)' },
                            }}
                        >
                            Try Again
                        </Button>

                        {import.meta.env.DEV && this.state.errorInfo && (
                            <Box
                                component="pre"
                                sx={{
                                    mt: 3,
                                    p: 2,
                                    bgcolor: '#f8f9fa',
                                    borderRadius: 1,
                                    fontSize: '0.7rem',
                                    textAlign: 'left',
                                    overflow: 'auto',
                                    maxHeight: 200,
                                    color: 'text.secondary',
                                }}
                            >
                                {this.state.error?.stack}
                            </Box>
                        )}
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}
