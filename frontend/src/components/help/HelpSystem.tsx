import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Fab,
    Drawer,
    Box,
    Typography,
    IconButton,
    Divider,
    TextField,
    List,
    ListItemButton,
    ListItemText,
    InputAdornment,
    Chip,
    Link,
} from '@mui/material';
import { HelpOutline, Close, Search, OpenInNew } from '@mui/icons-material';
import { helpContent, type HelpTopic } from './helpContent';

export default function HelpSystem() {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Find the best matching topic for the current route
    const currentPath = location.pathname;
    const currentTopic: HelpTopic =
        helpContent[currentPath] ||
        helpContent[Object.keys(helpContent).find((key) => currentPath.startsWith(key)) || ''] ||
        helpContent['/dashboard'];

    // Search across all topics
    const allTopics: HelpTopic[] = Object.values(helpContent) as HelpTopic[];
    const searchResults: HelpTopic[] = searchQuery.trim()
        ? allTopics.filter(
            (topic: HelpTopic) =>
                topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                topic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                topic.steps.some((step: string) => step.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : [];

    const displayTopic = searchResults.length === 1 ? searchResults[0] : currentTopic;

    return (
        <>
            {/* Floating Help Button */}
            <Fab
                color="primary"
                size="medium"
                onClick={() => setOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1200,
                    boxShadow: '0 4px 20px rgba(61,94,225,0.4)',
                    '&:hover': { transform: 'scale(1.08)' },
                    transition: 'transform 0.2s',
                }}
                aria-label="Open help panel"
            >
                <HelpOutline sx={{ fontSize: 26 }} />
            </Fab>

            {/* Help Drawer */}
            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100vw', sm: 400 },
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <HelpOutline />
                    <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                        Help Center
                    </Typography>
                    <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }} size="small">
                        <Close />
                    </IconButton>
                </Box>

                {/* Search */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search help topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {/* Search Results */}
                {searchQuery.trim() && searchResults.length > 0 && searchResults.length > 1 && (
                    <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            {searchResults.length} results
                        </Typography>
                        <List dense disablePadding>
                            {searchResults.map((topic, i) => (
                                <ListItemButton
                                    key={i}
                                    sx={{ borderRadius: 1, py: 0.3 }}
                                    onClick={() => setSearchQuery(topic.title)}
                                >
                                    <ListItemText
                                        primary={topic.title}
                                        primaryTypographyProps={{ fontSize: '0.8125rem' }}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>
                )}

                {searchQuery.trim() && searchResults.length === 0 && (
                    <Box sx={{ px: 3, py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            No results for "{searchQuery}". Try a different keyword.
                        </Typography>
                    </Box>
                )}

                {/* Topic Content */}
                <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
                    {/* Current Page Tag */}
                    {!searchQuery && (
                        <Chip
                            label={`Current page: ${currentTopic.title}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mb: 2, fontSize: '0.75rem' }}
                        />
                    )}

                    {/* Title */}
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {displayTopic.title}
                    </Typography>

                    {/* Description */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {displayTopic.description}
                    </Typography>

                    <Divider sx={{ mb: 2 }} />

                    {/* Steps */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        📋 How to use this page
                    </Typography>
                    <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                        {displayTopic.steps.map((step: string, i: number) => (
                            <Box
                                component="li"
                                key={i}
                                sx={{ mb: 0.75, fontSize: '0.875rem', lineHeight: 1.5, color: 'text.primary' }}
                            >
                                {step}
                            </Box>
                        ))}
                    </Box>

                    {/* Tips */}
                    {displayTopic.tips && displayTopic.tips.length > 0 && (
                        <Box
                            sx={{
                                mt: 2,
                                p: 2,
                                bgcolor: 'rgba(61,94,225,0.06)',
                                borderRadius: 2,
                                borderLeft: '3px solid',
                                borderColor: 'primary.main',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75, color: 'primary.main' }}>
                                💡 Tips
                            </Typography>
                            {displayTopic.tips.map((tip: string, i: number) => (
                                <Typography key={i} variant="body2" sx={{ mb: 0.5, fontSize: '0.8125rem' }}>
                                    • {tip}
                                </Typography>
                            ))}
                        </Box>
                    )}
                </Box>

                {/* Footer Links */}
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex',
                        gap: 2,
                    }}
                >
                    <Link href="/faq" target="_blank" rel="noopener" sx={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        FAQ <OpenInNew sx={{ fontSize: 12 }} />
                    </Link>
                    <Link href="/help" target="_blank" rel="noopener" sx={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Full Manual <OpenInNew sx={{ fontSize: 12 }} />
                    </Link>
                </Box>
            </Drawer>
        </>
    );
}
