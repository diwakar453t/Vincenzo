import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: React.ReactNode;
}

/**
 * Standardised page header with optional breadcrumbs, title, subtitle, and action slot.
 * Replaces the repetitive header block duplicated across all 39 pages.
 */
export default function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
    const navigate = useNavigate();

    return (
        <Box sx={{ mb: 3 }}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumbs sx={{ mb: 1.5 }}>
                    {breadcrumbs.map((crumb, i) => {
                        const isLast = i === breadcrumbs.length - 1;
                        return isLast ? (
                            <Typography key={i} color="text.primary" fontWeight={500} fontSize="0.875rem">
                                {crumb.label}
                            </Typography>
                        ) : (
                            <Link
                                key={i}
                                color="inherit"
                                href={crumb.path}
                                onClick={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    if (crumb.path) navigate(crumb.path);
                                }}
                                sx={{
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    '&:hover': { textDecoration: 'underline' },
                                }}
                            >
                                {crumb.label}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            )}

            {/* Title row */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={800} color="text.primary" lineHeight={1.2}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                {/* Action buttons slot */}
                {actions && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        {actions}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
