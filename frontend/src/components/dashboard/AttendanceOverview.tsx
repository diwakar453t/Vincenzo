import { Card, CardContent, Box, Typography, LinearProgress } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AttendanceSummary {
    total_students: number;
    present: number;
    absent: number;
    leave: number;
    present_percentage: number;
    period: string;
}

interface AttendanceOverviewProps {
    data: AttendanceSummary;
}

export default function AttendanceOverview({ data }: AttendanceOverviewProps) {
    const chartData = [
        { name: 'Present', value: data.present, color: '#10b981' },
        { name: 'Absent', value: data.absent, color: '#ef4444' },
        { name: 'Leave', value: data.leave, color: '#f59e0b' },
    ];

    return (
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Attendance Overview
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    {data.period}
                </Typography>

                {/* Summary Stats */}
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Overall Attendance
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>
                            {data.present_percentage.toFixed(1)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={data.present_percentage}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'rgba(16, 185, 129, 0.1)',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: '#10b981',
                                borderRadius: 4,
                            },
                        }}
                    />
                </Box>

                {/* Pie Chart */}
                <Box sx={{ height: 200, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>

                {/* Detailed Stats */}
                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    {chartData.map((item) => (
                        <Box key={item.name} sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: item.color }}>
                                {item.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {item.name}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}
