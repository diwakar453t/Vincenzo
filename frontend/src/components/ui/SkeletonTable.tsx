import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Skeleton,
    Paper,
} from '@mui/material';

interface SkeletonTableProps {
    /** Number of skeleton rows to show */
    rows?: number;
    /** Number of columns */
    cols?: number;
    /** Show a Paper wrapper (default true) */
    withPaper?: boolean;
}

/**
 * Drop-in skeleton replacement for a data table during loading state.
 * Shows animated shimmer rows that match the real table's shape.
 */
export default function SkeletonTable({ rows = 5, cols = 5, withPaper = true }: SkeletonTableProps) {
    const table = (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                        {Array.from({ length: cols }).map((_, i) => (
                            <TableCell key={i}>
                                <Skeleton variant="text" width="70%" height={18} />
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        <TableRow key={rowIdx}>
                            {Array.from({ length: cols }).map((_, colIdx) => (
                                <TableCell key={colIdx}>
                                    {colIdx === 0 ? (
                                        /* First column: avatar + text */
                                        <Skeleton
                                            variant="rectangular"
                                            width="80%"
                                            height={20}
                                            sx={{ borderRadius: 1 }}
                                        />
                                    ) : (
                                        <Skeleton variant="text" width={`${50 + Math.random() * 40}%`} />
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    if (!withPaper) return table;

    return (
        <Paper
            sx={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.06)',
                overflow: 'hidden',
            }}
        >
            {table}
        </Paper>
    );
}
