import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchDashboardStatistics } from '../store/slices/dashboardSlice';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActions from '../components/dashboard/QuickActions';
import UpcomingEvents from '../components/dashboard/UpcomingEvents';
import AttendanceOverview from '../components/dashboard/AttendanceOverview';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { statistics, loading, error } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    // Fetch dashboard data on mount
    dispatch(fetchDashboardStatistics());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchDashboardStatistics());
  };

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Dashboard;
    return <Icon sx={{ fontSize: 40 }} />;
  };

  if (loading && !statistics) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Unable to load dashboard data. Please try again later.
        </Typography>
      </Box>
    );
  }

  if (!statistics) {
    return (
      <Box>
        <Typography variant="body1" color="text.secondary">
          No dashboard data available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Welcome, {user?.full_name || statistics.user_name}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Here's what's happening today
          </Typography>
        </Box>
        <IconButton onClick={handleRefresh} disabled={loading} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {/* Quick Stats Cards */}
      <Stack direction="row" sx={{ mb: 4, flexWrap: 'wrap', gap: 3 }}>
        {statistics.quick_stats.map((stat, idx) => (
          <StatCard
            key={idx}
            title={stat.title}
            value={stat.value}
            icon={getIcon(stat.icon)}
            color={stat.color}
            trend={stat.trend}
          />
        ))}
      </Stack>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <QuickActions role={user?.role || statistics.role} />
      </Box>

      {/* Dashboard Widgets Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Recent Activities */}
        <ActivityFeed activities={statistics.recent_activities} />

        {/* Upcoming Events */}
        <UpcomingEvents events={statistics.upcoming_events} />
      </Box>

      {/* Attendance Overview (only for admin and teacher roles) */}
      {statistics.attendance_summary && (user?.role === 'admin' || user?.role === 'teacher') && (
        <Box sx={{ mb: 4 }}>
          <AttendanceOverview data={statistics.attendance_summary} />
        </Box>
      )}
    </Box>
  );
}
