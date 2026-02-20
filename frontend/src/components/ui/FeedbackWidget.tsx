import React, { useState } from 'react';
import {
    Box,
    Fab,
    Drawer,
    Typography,
    TextField,
    Button,
    Rating,
    ToggleButton,
    ToggleButtonGroup,
    IconButton,
    Alert,
    CircularProgress,
    Chip,
    Tooltip,
} from '@mui/material';
import {
    Feedback as FeedbackIcon,
    Close as CloseIcon,
    BugReport as BugIcon,
    Lightbulb as FeatureIcon,
    ThumbUp as PraiseIcon,
    ChatBubble as GeneralIcon,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';

type FeedbackType = 'bug' | 'feature' | 'general' | 'praise';

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
    { value: 'bug', label: 'Bug', icon: <BugIcon fontSize="small" /> },
    { value: 'feature', label: 'Feature', icon: <FeatureIcon fontSize="small" /> },
    { value: 'praise', label: 'Praise', icon: <PraiseIcon fontSize="small" /> },
    { value: 'general', label: 'General', icon: <GeneralIcon fontSize="small" /> },
];

const MODULE_FROM_PATH = (path: string): string | undefined => {
    const segment = path.split('/').filter(Boolean)[0];
    return segment || undefined;
};

const FeedbackWidget: React.FC = () => {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<FeedbackType>('general');
    const [rating, setRating] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setType('general');
        setRating(null);
        setMessage('');
        setSubmitted(false);
        setError(null);
    };

    const handleOpen = () => { reset(); setOpen(true); };
    const handleClose = () => setOpen(false);

    const handleSubmit = async () => {
        if (!message.trim() || message.trim().length < 5) {
            setError('Please enter at least 5 characters.');
            return;
        }
        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                type,
                module: MODULE_FROM_PATH(location.pathname),
                rating: rating ?? undefined,
                message: message.trim(),
                page_url: location.pathname,
            };

            const response = await fetch('/api/v1/feedback/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.detail ?? `Server error ${response.status}`);
            }

            setSubmitted(true);
            // Auto-close after 2.5 seconds
            setTimeout(() => setOpen(false), 2500);
        } catch (err: any) {
            setError(err.message ?? 'Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <Tooltip title="Send Feedback" placement="left">
                <Fab
                    size="small"
                    onClick={handleOpen}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1200,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        boxShadow: 3,
                    }}
                    aria-label="open feedback"
                >
                    <FeedbackIcon fontSize="small" />
                </Fab>
            </Tooltip>

            {/* Feedback Drawer */}
            <Drawer
                anchor="right"
                open={open}
                onClose={handleClose}
                PaperProps={{ sx: { width: { xs: '100%', sm: 380 }, p: 3 } }}
            >
                {/* Header */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                        Send Feedback
                    </Typography>
                    <IconButton onClick={handleClose} size="small" aria-label="close">
                        <CloseIcon />
                    </IconButton>
                </Box>

                {submitted ? (
                    /* Success state */
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        gap={2}
                        mt={6}
                    >
                        <Typography variant="h4">🙏</Typography>
                        <Typography variant="h6" textAlign="center">
                            Thank you for your feedback!
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            We review all submissions and use them to improve PreSkool ERP.
                        </Typography>
                    </Box>
                ) : (
                    <Box display="flex" flexDirection="column" gap={2.5}>
                        {/* Type selector */}
                        <Box>
                            <Typography variant="body2" color="text.secondary" mb={1}>
                                What kind of feedback?
                            </Typography>
                            <ToggleButtonGroup
                                value={type}
                                exclusive
                                onChange={(_, v) => v && setType(v)}
                                size="small"
                                fullWidth
                            >
                                {TYPE_OPTIONS.map((opt) => (
                                    <ToggleButton key={opt.value} value={opt.value} sx={{ flex: 1, gap: 0.5 }}>
                                        {opt.icon}
                                        <Typography variant="caption">{opt.label}</Typography>
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>

                        {/* Star rating */}
                        <Box>
                            <Typography variant="body2" color="text.secondary" mb={0.5}>
                                How would you rate this page?
                            </Typography>
                            <Rating
                                value={rating}
                                onChange={(_, v) => setRating(v)}
                                size="large"
                            />
                        </Box>

                        {/* Message */}
                        <TextField
                            label="Your feedback"
                            multiline
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={
                                type === 'bug'
                                    ? 'Describe what went wrong and how to reproduce it...'
                                    : type === 'feature'
                                        ? 'Describe the feature you would like to see...'
                                        : 'Share your thoughts...'
                            }
                            inputProps={{ maxLength: 2000 }}
                            helperText={`${message.length}/2000`}
                            fullWidth
                        />

                        {/* Current page chip */}
                        <Box display="flex" gap={1} flexWrap="wrap">
                            <Chip
                                label={`Page: ${location.pathname}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 11 }}
                            />
                            {MODULE_FROM_PATH(location.pathname) && (
                                <Chip
                                    label={`Module: ${MODULE_FROM_PATH(location.pathname)}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontSize: 11 }}
                                />
                            )}
                        </Box>

                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        {/* Submit */}
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={submitting || !message.trim()}
                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                            fullWidth
                            size="large"
                        >
                            {submitting ? 'Submitting…' : 'Send Feedback'}
                        </Button>
                    </Box>
                )}
            </Drawer>
        </>
    );
};

export default FeedbackWidget;
