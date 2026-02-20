import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import {
    fetchNotifications, markAsRead, markAllRead, deleteNotification,
    fetchUnreadCount,
} from '../../store/slices/notificationsSlice';
import {
    IconButton, Badge, Popover, Box, Typography, List, ListItem,
    ListItemText, ListItemIcon, Chip, Button, Divider, Tooltip,
} from '@mui/material';
import {
    Notifications, NotificationsActive, Info, Warning, Error as ErrorIcon,
    CheckCircle, Campaign, Schedule, PriorityHigh, DoneAll, Delete,
    ArrowForward,
} from '@mui/icons-material';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    info: <Info sx={{ color: '#3D5EE1' }} />,
    success: <CheckCircle sx={{ color: '#51CF66' }} />,
    warning: <Warning sx={{ color: '#FCC419' }} />,
    error: <ErrorIcon sx={{ color: '#DC3545' }} />,
    announcement: <Campaign sx={{ color: '#9B59B6' }} />,
    reminder: <Schedule sx={{ color: '#FF6B35' }} />,
    alert: <PriorityHigh sx={{ color: '#DC3545' }} />,
};

const PRIORITY_COLORS: Record<string, string> = {
    low: '#888', medium: '#3D5EE1', high: '#FCC419', urgent: '#DC3545',
};

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationDropdown() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { notifications, unreadCount } = useSelector((s: RootState) => s.notifications);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    useEffect(() => {
        dispatch(fetchUnreadCount());
        const interval = setInterval(() => dispatch(fetchUnreadCount()), 30000);
        return () => clearInterval(interval);
    }, [dispatch]);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
        dispatch(fetchNotifications({ limit: 10 }));
    };

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton onClick={handleOpen} sx={{ color: 'inherit' }}>
                    <Badge badgeContent={unreadCount} color="error" max={99}>
                        {unreadCount > 0 ? <NotificationsActive /> : <Notifications />}
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 380, maxHeight: 500, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } } }}
            >
                {/* Header */}
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={700}>Notifications</Typography>
                        {unreadCount > 0 && <Chip label={unreadCount} size="small" color="error" sx={{ height: 20, fontSize: 11 }} />}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {unreadCount > 0 && (
                            <Tooltip title="Mark all read"><IconButton size="small" onClick={() => dispatch(markAllRead())} sx={{ color: '#3D5EE1' }}><DoneAll fontSize="small" /></IconButton></Tooltip>
                        )}
                    </Box>
                </Box>

                {/* Notification list */}
                {notifications.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No notifications</Typography>
                    </Box>
                ) : (
                    <List sx={{ py: 0, maxHeight: 350, overflow: 'auto' }}>
                        {notifications.slice(0, 10).map((n, i) => (
                            <Box key={n.id}>
                                <ListItem
                                    sx={{
                                        py: 1.5, px: 2, cursor: 'pointer',
                                        bgcolor: n.is_read ? 'transparent' : 'rgba(61,94,225,0.04)',
                                        '&:hover': { bgcolor: 'rgba(61,94,225,0.08)' },
                                        borderLeft: n.is_read ? 'none' : `3px solid ${PRIORITY_COLORS[n.priority] || '#3D5EE1'}`,
                                    }}
                                    onClick={() => {
                                        if (!n.is_read) dispatch(markAsRead(n.id));
                                        if (n.link) { setAnchorEl(null); navigate(n.link); }
                                    }}
                                    secondaryAction={
                                        <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); dispatch(deleteNotification(n.id)); }}>
                                            <Delete fontSize="small" sx={{ color: 'text.disabled', '&:hover': { color: '#DC3545' } }} />
                                        </IconButton>
                                    }
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        {TYPE_ICONS[n.notification_type] || <Info sx={{ color: '#888' }} />}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={n.is_read ? 400 : 700} noWrap>{n.title}</Typography>}
                                        secondary={
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.message}</Typography>
                                                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>{timeAgo(n.created_at)}</Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                                {i < notifications.length - 1 && <Divider />}
                            </Box>
                        ))}
                    </List>
                )}

                {/* Footer */}
                <Box sx={{ p: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
                    <Button size="small" endIcon={<ArrowForward />} onClick={() => { setAnchorEl(null); navigate('/dashboard/notifications'); }}
                        sx={{ color: '#3D5EE1', fontWeight: 700, textTransform: 'none' }}>View All Notifications</Button>
                </Box>
            </Popover>
        </>
    );
}
