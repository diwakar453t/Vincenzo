import { Button, CircularProgress, type ButtonProps } from '@mui/material';

interface LoadingButtonProps extends ButtonProps {
    /** When true, shows a spinner and disables the button */
    loading?: boolean;
    children: React.ReactNode;
}

/**
 * MUI Button extended with a built-in loading state.
 * Prevents double-submits by disabling the button while loading.
 *
 * Usage:
 *   <LoadingButton
 *     loading={isSubmitting}
 *     variant="contained"
 *     type="submit"
 *   >
 *     Save Student
 *   </LoadingButton>
 */
export default function LoadingButton({
    loading = false,
    disabled,
    children,
    sx,
    ...props
}: LoadingButtonProps) {
    return (
        <Button
            {...props}
            disabled={loading || disabled}
            sx={{
                position: 'relative',
                minWidth: 120,
                ...sx,
            }}
        >
            {loading && (
                <CircularProgress
                    size={18}
                    sx={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'inherit',
                        opacity: 0.8,
                    }}
                />
            )}
            <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
        </Button>
    );
}
