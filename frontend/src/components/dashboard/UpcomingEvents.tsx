import { Card, CardContent, Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import { formatDistanceToNow, format } from 'date-fns';

interface UpcomingEvent {
    id: number;
    title: string;
    event_type: string;
    date: string;
    description?: string;
}

interface UpcomingEventsProps {
    events: UpcomingEvent[];
}

const getEventColor = (type: string): 'primary' | 'secondary' | 'error' | 'warning' | 'success' => {
    const colors: Record<string, 'primary' | 'secondary' | 'error' | 'warning' | 'success'> = {
        exam: 'error',
        event: 'primary',
        meeting: 'secondary',
        assignment: 'warning',
        payment: 'success',
    };
    return colors[type] || 'primary';
};

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Upcoming Events
                </Typography>

                {events.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No upcoming events
                    </Typography>
                ) : (
                    <List sx={{ p: 0 }}>
                        {events.map((event, index) => (
                            <ListItem
                                key={event.id}
                                sx={{
                                    px: 0,
                                    py: 1.5,
                                    borderBottom: index < events.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <Box
                                    sx={{
                                        mr: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: 60,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                                        {format(new Date(event.date), 'dd')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(new Date(event.date), 'MMM')}
                                    </Typography>
                                </Box>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {event.title}
                                            </Typography>
                                            <Chip
                                                label={event.event_type}
                                                size="small"
                                                color={getEventColor(event.event_type)}
                                                sx={{ textTransform: 'capitalize', height: 20 }}
                                            />
                                        </Box>
                                    }
                                    secondary={
                                        <>
                                            {event.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                    {event.description}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
}
