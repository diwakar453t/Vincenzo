import { Card, CardContent, Box, Typography, List, ListItem, ListItemAvatar, ListItemText, Avatar, Link } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import * as Icons from '@mui/icons-material';

interface Activity {
    id: number;
    type: string;
    title: string;
    description: string;
    user_name: string;
    timestamp: string;
    icon: string;
}

interface ActivityFeedProps {
    activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
    const getIcon = (iconName: string) => {
        const Icon = (Icons as any)[iconName] || Icons.Info;
        return <Icon />;
    };

    const getActivityColor = (type: string) => {
        const colors: Record<string, string> = {
            student_added: '#3D5EE1',
            attendance_marked: '#10b981',
            fee_paid: '#f59e0b',
            assignment_submitted: '#8b5cf6',
            grade_received: '#10b981',
            grade_updated: '#3D5EE1',
            attendance_alert: '#ef4444',
            default: '#64748b',
        };
        return colors[type] || colors.default;
    };

    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Recent Activities
                    </Typography>
                    <Link href="#" sx={{ fontSize: '0.875rem', textDecoration: 'none' }}>
                        View All
                    </Link>
                </Box>

                {activities.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No recent activities
                    </Typography>
                ) : (
                    <List sx={{ p: 0 }}>
                        {activities.map((activity, index) => (
                            <ListItem
                                key={activity.id}
                                sx={{
                                    px: 0,
                                    borderBottom: index < activities.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar
                                        sx={{
                                            bgcolor: `${getActivityColor(activity.type)}15`,
                                            color: getActivityColor(activity.type),
                                            width: 40,
                                            height: 40,
                                        }}
                                    >
                                        {getIcon(activity.icon)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {activity.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                                                {activity.description}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
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
