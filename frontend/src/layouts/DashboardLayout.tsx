import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import NotificationDropdown from '../components/notifications/NotificationDropdown';
import GlobalSearch from '../components/search/GlobalSearch';
import HelpSystem from '../components/help/HelpSystem';
import ButtonBase from '@mui/material/ButtonBase';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Divider,
  Collapse,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  School,
  PersonOutline,
  MenuBook,
  CalendarMonth,
  Assignment,
  Assessment,
  LocalLibrary,
  DirectionsBus,
  Hotel,
  SportsBasketball,
  AttachMoney,
  Payment,
  Extension,
  Settings,
  ExitToApp,
  ChevronLeft,
  ExpandLess,
  ExpandMore,
  Person,
  AdminPanelSettings,
  SupervisorAccount,
  Business,
  Security,
  Flag,
  MonitorHeart,
  Grade,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
}

function getNavItems(role?: string): NavItem[] {
  if (role === 'student') {
    return [
      { label: 'My Dashboard', icon: <Dashboard />, path: '/student-dashboard' },
      {
        label: 'Academics',
        icon: <MenuBook />,
        children: [
          { label: 'Timetable', path: '/timetable' },
          { label: 'Subjects', path: '/subjects' },
          { label: 'Syllabus', path: '/syllabus' },
          { label: 'Study Materials', path: '/student-dashboard' },
        ],
      },
      {
        label: 'Exams & Results',
        icon: <Assignment />,
        children: [
          { label: 'Exam Schedule', path: '/exams' },
          { label: 'My Results', path: '/grades' },
        ],
      },
      { label: 'Attendance', icon: <CalendarMonth />, path: '/attendance/students' },
      {
        label: 'Fees',
        icon: <AttachMoney />,
        children: [
          { label: 'Fee Status', path: '/fees' },
          { label: 'Payment History', path: '/payments' },
        ],
      },
      { label: 'Library', icon: <LocalLibrary />, path: '/library' },
      { label: 'Notifications', icon: <Assessment />, path: '/notifications' },
      { label: 'My Profile', icon: <Person />, path: '/profile' },
    ];
  }

  if (role === 'teacher') {
    return [
      { label: 'My Dashboard', icon: <Dashboard />, path: '/teacher-dashboard' },
      {
        label: 'My Classes',
        icon: <School />,
        children: [
          { label: 'Class List', path: '/classes' },
          { label: 'Students', path: '/students' },
          { label: 'Timetable', path: '/timetable' },
        ],
      },
      {
        label: 'Academics',
        icon: <MenuBook />,
        children: [
          { label: 'Subjects', path: '/subjects' },
          { label: 'Syllabus', path: '/syllabus' },
          { label: 'Study Materials', path: '/files' },
        ],
      },
      {
        label: 'Attendance',
        icon: <CalendarMonth />,
        children: [
          { label: 'Mark Attendance', path: '/attendance/students' },
          { label: 'My Attendance', path: '/attendance/staff' },
        ],
      },
      {
        label: 'Exams & Grades',
        icon: <Grade />,
        children: [
          { label: 'Exams', path: '/exams' },
          { label: 'Enter Marks', path: '/grades' },
        ],
      },
      { label: 'Leave', icon: <Assignment />, path: '/leaves' },
      { label: 'Notifications', icon: <Assessment />, path: '/notifications' },
      { label: 'My Profile', icon: <Person />, path: '/profile' },
    ];
  }

  if (role === 'parent') {
    return [
      { label: 'My Dashboard', icon: <Dashboard />, path: '/parent-dashboard' },
      { label: 'My Child', icon: <People />, path: '/students' },
      { label: 'Timetable', icon: <CalendarMonth />, path: '/timetable' },
      { label: 'Attendance', icon: <CalendarMonth />, path: '/attendance/students' },
      {
        label: 'Fees',
        icon: <AttachMoney />,
        children: [
          { label: 'Fee Status', path: '/fees' },
          { label: 'Payments', path: '/payments' },
        ],
      },
      { label: 'Notifications', icon: <Assessment />, path: '/notifications' },
      { label: 'My Profile', icon: <Person />, path: '/profile' },
    ];
  }

  if (role === 'super_admin') {
    return [
      { label: 'Super Admin', icon: <AdminPanelSettings />, path: '/super-admin-dashboard' },
      { label: 'Admin Panel', icon: <SupervisorAccount />, path: '/admin-dashboard' },
      {
        label: 'Institutions',
        icon: <Business />,
        children: [
          { label: 'All Institutions', path: '/super-admin-dashboard' },
          { label: 'Domain Management', path: '/settings' },
        ],
      },
      {
        label: 'Users',
        icon: <People />,
        children: [
          { label: 'All Students', path: '/students' },
          { label: 'All Teachers', path: '/teachers' },
          { label: 'Guardians', path: '/guardians' },
        ],
      },
      {
        label: 'Academics',
        icon: <MenuBook />,
        children: [
          { label: 'Classes', path: '/classes' },
          { label: 'Subjects', path: '/subjects' },
          { label: 'Timetable', path: '/timetable' },
          { label: 'Departments', path: '/departments' },
        ],
      },
      {
        label: 'Finance',
        icon: <AttachMoney />,
        children: [
          { label: 'Fees', path: '/fees' },
          { label: 'Payroll', path: '/payroll' },
          { label: 'Payments', path: '/payments' },
        ],
      },
      { label: 'Security & Audit', icon: <Security />, path: '/super-admin-dashboard' },
      { label: 'Feature Flags', icon: <Flag />, path: '/super-admin-dashboard' },
      { label: 'Infrastructure', icon: <MonitorHeart />, path: '/super-admin-dashboard' },
      { label: 'Reports', icon: <Assessment />, path: '/reports' },
      { label: 'Plugins', icon: <Extension />, path: '/plugins' },
      { label: 'Settings', icon: <Settings />, path: '/settings' },
    ];
  }

  // Default: Admin
  return [
    { label: 'Dashboard', icon: <Dashboard />, path: '/admin-dashboard' },
    {
      label: 'Students',
      icon: <People />,
      children: [
        { label: 'All Students', path: '/students' },
        { label: 'Add Student', path: '/students/add' },
        { label: 'Promotion', path: '/students/promotion' },
      ],
    },
    {
      label: 'Teachers',
      icon: <School />,
      children: [
        { label: 'All Teachers', path: '/teachers' },
        { label: 'Add Teacher', path: '/teachers/add' },
      ],
    },
    {
      label: 'Guardians',
      icon: <PersonOutline />,
      children: [
        { label: 'All Guardians', path: '/guardians' },
        { label: 'Add Guardian', path: '/guardians/add' },
      ],
    },
    {
      label: 'Academics',
      icon: <MenuBook />,
      children: [
        { label: 'Classes', path: '/classes' },
        { label: 'Subjects', path: '/subjects' },
        { label: 'Departments', path: '/departments' },
        { label: 'Syllabus', path: '/syllabus' },
        { label: 'Time Table', path: '/timetable' },
      ],
    },
    {
      label: 'Exams',
      icon: <Assignment />,
      children: [
        { label: 'Schedule', path: '/exams' },
        { label: 'Grades', path: '/grades' },
      ],
    },
    {
      label: 'Attendance',
      icon: <CalendarMonth />,
      children: [
        { label: 'Student Attendance', path: '/attendance/students' },
        { label: 'Staff Attendance', path: '/attendance/staff' },
      ],
    },
    {
      label: 'Fees',
      icon: <AttachMoney />,
      children: [
        { label: 'Fee Collection', path: '/fees/collection' },
        { label: 'Fee Structure', path: '/fees/structure' },
      ],
    },
    { label: 'Library', icon: <LocalLibrary />, path: '/library' },
    { label: 'Transport', icon: <DirectionsBus />, path: '/transport' },
    { label: 'Hostel', icon: <Hotel />, path: '/hostel' },
    { label: 'Sports', icon: <SportsBasketball />, path: '/sports' },
    { label: 'Reports', icon: <Assessment />, path: '/reports' },
    { label: 'Payments', icon: <Payment />, path: '/payments' },
    { label: 'Leave', icon: <Assignment />, path: '/leaves' },
    { label: 'Payroll', icon: <Payment />, path: '/payroll' },
    { label: 'Plugins', icon: <Extension />, path: '/plugins' },
    { label: 'Settings', icon: <Settings />, path: '/settings' },
  ];
}

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const navItems = useMemo(() => getNavItems(user?.role), [user?.role]);

  // Fix: handleLogout no longer duplicates token removal — dispatch(logout())
  // already clears both localStorage and sessionStorage in authSlice.
  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  // Fix: sync drawer state when viewport crosses the mobile breakpoint
  // (e.g. user resizes browser window from desktop to mobile width)
  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const handleNavClick = useCallback((item: NavItem) => {
    if (item.children) {
      setExpandedItem((prev) => (prev === item.label ? null : item.label));
    } else if (item.path) {
      navigate(item.path);
      if (isMobile) {
        setDrawerOpen(false);
        setExpandedItem(null); // Fix: collapse open sub-menu when navigating on mobile
      }
    }
  }, [isMobile, navigate]);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);
  const isGroupActive = useCallback((item: NavItem) =>
    item.children?.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/')) || false,
    [location.pathname]);

  // Fix: memoize drawerContent so it only re-renders when its actual
  // dependencies change, not on every parent state update.
  const drawerContent = useMemo(() => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo Area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <School sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          PreSkool
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ ml: 'auto' }} aria-label="Close navigation">
            <ChevronLeft />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
        {navItems.map((item) => (
          <Box key={item.label}>
            <ListItem disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                onClick={() => handleNavClick(item)}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  px: 2,
                  bgcolor:
                    (item.path && isActive(item.path)) || isGroupActive(item)
                      ? 'primary.main'
                      : 'transparent',
                  color:
                    (item.path && isActive(item.path)) || isGroupActive(item)
                      ? 'white'
                      : 'text.primary',
                  '&:hover': {
                    bgcolor:
                      (item.path && isActive(item.path)) || isGroupActive(item)
                        ? 'primary.dark'
                        : 'rgba(61,94,225,0.08)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                />
                {item.children && (expandedItem === item.label ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </ListItem>
            {item.children && (
              <Collapse in={expandedItem === item.label} timeout="auto" unmountOnExit>
                <List disablePadding sx={{ pl: 2 }}>
                  {item.children.map((child) => (
                    <ListItem key={child.path} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          navigate(child.path);
                          if (isMobile) {
                            setDrawerOpen(false);
                            setExpandedItem(null);
                          }
                        }}
                        sx={{
                          borderRadius: 2,
                          minHeight: 38,
                          pl: 3,
                          bgcolor: isActive(child.path) ? 'rgba(61,94,225,0.12)' : 'transparent',
                          color: isActive(child.path) ? 'primary.main' : 'text.secondary',
                          '&:hover': { bgcolor: 'rgba(61,94,225,0.08)' },
                        }}
                      >
                        <ListItemText
                          primary={child.label}
                          primaryTypographyProps={{ fontSize: '0.8125rem' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center' }}
        >
          &copy; 2026 PreSkool ERP
        </Typography>
      </Box>
    </Box>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [navItems, expandedItem, isMobile, location.pathname, handleNavClick, isActive, isGroupActive, navigate]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f6fa' }}>
      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin 0.2s',
        }}
      >
        {/* Top Header */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'white',
            color: 'text.primary',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton onClick={() => setDrawerOpen(!drawerOpen)} edge="start">
              <MenuIcon />
            </IconButton>

            <GlobalSearch />

            <Box sx={{ flex: 1 }} />

            <NotificationDropdown />

            {/* Fix: ButtonBase gives this a semantic role, keyboard focus,
                and accessible name — plain Box is not interactive for a11y */}
            <ButtonBase
              onClick={(e) => setAnchorEl(e.currentTarget)}
              aria-label={`Open account menu for ${user?.full_name || 'User'}`}
              aria-haspopup="true"
              aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
              aria-expanded={Boolean(anchorEl)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
              }}
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.full_name || 'User'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: 'capitalize' }}
                >
                  {user?.role || 'admin'}
                </Typography>
              </Box>
            </ButtonBase>

            <Menu
              id="account-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/profile');
                }}
              >
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                My Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/settings');
                }}
              >
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  handleLogout();
                }}
              >
                <ListItemIcon>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      {/* In-App Help System — floating ? button on every page */}
      <HelpSystem />
    </Box>
  );
}
