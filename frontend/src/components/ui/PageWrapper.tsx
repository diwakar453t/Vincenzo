import { type ReactNode } from 'react';
import { Box } from '@mui/material';
import ErrorBoundary from './ErrorBoundary';

interface PageWrapperProps {
    children: ReactNode;
}

/**
 * Thin wrapper that provides:
 * 1. An `ErrorBoundary` to catch any unhandled errors in the page
 * 2. A `.page-enter` CSS class for the smooth fade-in + slide-up animation
 *    on every page mount (defined in index.css)
 *
 * Usage: wrap your page's root return element:
 *   return (
 *     <PageWrapper>
 *       <Box> ... </Box>
 *     </PageWrapper>
 *   );
 */
export default function PageWrapper({ children }: PageWrapperProps) {
    return (
        <ErrorBoundary>
            <Box className="page-enter" sx={{ minHeight: '60vh' }}>
                {children}
            </Box>
        </ErrorBoundary>
    );
}
