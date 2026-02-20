import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    trend?: string;
}

export default function StatCard({ title, value, icon, color, trend }: StatCardProps) {
    const getTrendIcon = () => {
        if (!trend) return null;
        const isPositive = trend.startsWith('+');
        return isPositive ? (
            <TrendingUp sx={{ fontSize: 16, color: '#10b981' }} />
        ) : (
            <TrendingDown sx={{ fontSize: 16, color: '#ef4444' }} />
        );
    };

    const getTrendColor = () => {
        if (!trend) return 'text.secondary';
        return trend.startsWith('+') ? '#10b981' : '#ef4444';
    };

    return (
        <Card
            sx={{
                flex: '1 1 200px',
                minWidth: 200,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                },
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 0.5 }}>
                            {value}
                        </Typography>
                        {trend && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getTrendIcon()}
                                <Typography variant="caption" sx={{ color: getTrendColor(), fontWeight: 600 }}>
                                    {trend}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Avatar
                        sx={{
                            bgcolor: `${color}15`,
                            color: color,
                            width: 56,
                            height: 56,
                        }}
                    >
                        {icon}
                    </Avatar>
                </Box>
            </CardContent>
        </Card>
    );
}
