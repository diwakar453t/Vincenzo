import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchDashboardStatistics } from '../store/slices/dashboardSlice';
import {
  Box,
  Typography,
  Stack,
  Alert,
  IconButton,
  Collapse,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActions from '../components/dashboard/QuickActions';
import UpcomingEvents from '../components/dashboard/UpcomingEvents';
import AttendanceOverview from '../components/dashboard/AttendanceOverview';

// ── Fallback data shown when backend is unreachable ───────────────────
const FALLBACK_STATISTICS = {
  user_name: 'Admin',
  role: 'admin',
  quick_stats: [
    { title: 'Total Students', value: '—', icon: 'People', color: '#3D5EE1', trend: null },
    { title: 'Total Teachers', value: '—', icon: 'School', color: '#28A745', trend: null },
    { title: 'Classes', value: '—', icon: 'Class', color: '#FFC107', trend: null },
    { title: 'Fee Collected', value: '—', icon: 'CurrencyRupee', color: '#17A2B8', trend: null },
    { title: 'Attendance Today', value: '—', icon: 'CheckCircle', color: '#6F42C1', trend: null },
    { title: 'Pending Fees', value: '—', icon: 'Warning', color: '#DC3545', trend: null },
  ],
  recent_activities: [
    {
      id: 1,
      type: 'info',
      message: 'Connect the backend to see live activity',
      timestamp: new Date().toISOString(),
      user: 'System',
    },
  ],
  upcoming_events: [
    {
      id: 1,
      title: 'Backend offline — data unavailable',
      date: new Date().toISOString(),
      type: 'reminder',
    },
  ],
  attendance_summary: null,
};

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { statistics, loading, error } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStatistics());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchDashboardStatistics());
  };

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Dashboard;
    return <Icon sx={{ fontSize: 40 }} />;
  };

  // Use live data if available, otherwise use fallback
  const data = statistics || FALLBACK_STATISTICS;
  const isOffline = !!error && !statistics;

  return (
    <Box>
      {/* Offline banner — shown subtly, doesn't block the page */}
      <Collapse in={isOffline}>
        <Alert
          severity="warning"
          action={
            <IconButton size="small" onClick={handleRefresh} disabled={loading} color="inherit">
              <Refresh fontSize="small" />
            </IconButton>
          }
          sx={{ mb: 3, borderRadius: 2 }}
        >
          Backend is offline — showing placeholder data. Start the API server to see live stats.
        </Alert>
      </Collapse>

      {/* Welcome Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Welcome, {user?.full_name || data.user_name}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {isOffline
              ? 'Start the backend to load live school data'
              : "Here's what's happening today"}
          </Typography>
        </Box>
        <IconButton onClick={handleRefresh} disabled={loading} color="primary" title="Refresh">
          <Refresh />
        </IconButton>
      </Box>

      {/* Quick Stats Cards */}
      <Stack direction="row" sx={{ mb: 4, flexWrap: 'wrap', gap: 3 }}>
        {data.quick_stats.map((stat, idx) => (
          <StatCard
            key={idx}
            title={stat.title}
            value={stat.value}
            icon={getIcon(stat.icon)}
            color={stat.color}
            trend={stat.trend as any}
          />
        ))}
      </Stack>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <QuickActions role={user?.role || data.role} />
      </Box>

      {/* Dashboard Widgets Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
        <ActivityFeed activities={data.recent_activities as any[]} />
        <UpcomingEvents events={data.upcoming_events as any[]} />
      </Box>

      {/* Attendance Overview (admin and teacher only) */}
      {data.attendance_summary &&
        (user?.role === 'admin' || user?.role === 'teacher') && (
          <Box sx={{ mb: 4 }}>
            <AttendanceOverview data={data.attendance_summary} />
          </Box>
        )}
    </Box>
  );
}
