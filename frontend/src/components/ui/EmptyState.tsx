import { Box, Typography, Button } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface EmptyStateProps {
    /** MUI icon component to display large at top */
    icon: React.ReactElement<React.ComponentProps<SvgIconComponent>>;
    title: string;
    description?: string;
    /** Optional CTA button */
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * Consistent empty-state block for tables and grids.
 * Renders a centred icon, title, optional description, and optional action button.
 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                px: 3,
                textAlign: 'center',
            }}
        >
            {/* Large icon */}
            <Box
                sx={{
                    mb: 2,
                    opacity: 0.35,
                    '& svg': { fontSize: 72 },
                }}
            >
                {icon}
            </Box>

            <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
                {title}
            </Typography>

            {description && (
                <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 320, mb: 3 }}>
                    {description}
                </Typography>
            )}

            {action && (
                <Button
                    variant="contained"
                    onClick={action.onClick}
                    sx={{
                        background: 'linear-gradient(135deg, #3D5EE1, #6B82F0)',
                        boxShadow: '0 4px 14px rgba(61,94,225,0.35)',
                        borderRadius: 2,
                        '&:hover': { background: 'linear-gradient(135deg, #2A44B8, #3D5EE1)' },
                    }}
                >
                    {action.label}
                </Button>
            )}
        </Box>
    );
}
