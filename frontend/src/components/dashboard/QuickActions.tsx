import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import * as Icons from '@mui/icons-material';

interface QuickAction {
    label: string;
    icon: string;
    path: string;
    color: string;
}

interface QuickActionsProps {
    role: string;
}

export default function QuickActions({ role }: QuickActionsProps) {
    const navigate = useNavigate();

    const getIcon = (iconName: string) => {
        const Icon = (Icons as any)[iconName] || Icons.Apps;
        return <Icon />;
    };

    const getActionsForRole = (userRole: string): QuickAction[] => {
        const actions: Record<string, QuickAction[]> = {
            admin: [
                { label: 'Add Student', icon: 'PersonAdd', path: '/students/add', color: '#3D5EE1' },
                { label: 'Add Teacher', icon: 'PersonAdd', path: '/teachers/add', color: '#10b981' },
                { label: 'Manage Fees', icon: 'AttachMoney', path: '/fees/collection', color: '#f59e0b' },
                { label: 'View Reports', icon: 'Assessment', path: '/reports', color: '#8b5cf6' },
            ],
            teacher: [
                { label: 'Take Attendance', icon: 'CheckCircle', path: '/attendance/students', color: '#10b981' },
                { label: 'Grade Assignments', icon: 'Assignment', path: '/exams', color: '#3D5EE1' },
                { label: 'View Timetable', icon: 'Schedule', path: '/timetable', color: '#f59e0b' },
                { label: 'My Classes', icon: 'Class', path: '/classes', color: '#8b5cf6' },
            ],
            student: [
                { label: 'View Timetable', icon: 'Schedule', path: '/timetable', color: '#3D5EE1' },
                { label: 'Assignments', icon: 'Assignment', path: '/exams', color: '#f59e0b' },
                { label: 'My Grades', icon: 'Grade', path: '/grades', color: '#10b981' },
                { label: 'Library', icon: 'LocalLibrary', path: '/library', color: '#8b5cf6' },
            ],
            parent: [
                { label: 'Pay Fees', icon: 'Payment', path: '/fees/collection', color: '#10b981' },
                { label: 'View Attendance', icon: 'CalendarMonth', path: '/attendance/students', color: '#3D5EE1' },
                { label: 'View Grades', icon: 'Assessment', path: '/grades', color: '#f59e0b' },
                { label: 'Contact Teacher', icon: 'Email', path: '/settings', color: '#8b5cf6' },
            ],
        };
        return actions[userRole] || [];
    };

    const actions = getActionsForRole(role);

    return (
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Quick Actions
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 2,
                }}
            >
                {actions.map((action, index) => (
                    <Button
                        key={index}
                        fullWidth
                        variant="outlined"
                        startIcon={getIcon(action.icon)}
                        onClick={() => navigate(action.path)}
                        sx={{
                            py: 1.5,
                            borderRadius: 2,
                            borderColor: action.color,
                            color: action.color,
                            '&:hover': {
                                borderColor: action.color,
                                bgcolor: `${action.color}10`,
                            },
                        }}
                    >
                        {action.label}
                    </Button>
                ))}
            </Box>
        </Box>
    );
}
