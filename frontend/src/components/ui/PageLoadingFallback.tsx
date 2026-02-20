import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

/**
 * Full-viewport loading spinner used as the Suspense fallback
 * when a lazily-loaded page chunk is being fetched.
 */
export default function PageLoadingFallback() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 2,
            }}
        >
            <CircularProgress size={48} thickness={4} />
            <Typography variant="body2" color="text.secondary">
                Loading…
            </Typography>
        </Box>
    );
}
