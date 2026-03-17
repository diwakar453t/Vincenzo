import { lazy, Suspense, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store/store';
import type { RootState } from './store/store';
import theme from './theme/theme';
import PageLoadingFallback from './components/ui/PageLoadingFallback';
import api from './services/api';
import type { AppDispatch } from './store/store';
import { setUser } from './store/slices/authSlice';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';

// ── Auth pages (small – load immediately on /login) ─────────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage'));
// RegisterPage removed — self-registration is disabled (login-only system)
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// ── Layout ───────────────────────────────────────────────────────────────────
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));

// ── Dashboard ────────────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentDashboardPage = lazy(() => import(/* @vite-ignore */ './pages/dashboards/StudentDashboardPage'));
const TeacherDashboardPage = lazy(() => import(/* @vite-ignore */ './pages/dashboards/TeacherDashboardPage'));
const ParentDashboardPage = lazy(() => import(/* @vite-ignore */ './pages/dashboards/ParentDashboardPage'));
const AdminDashboardPage = lazy(() => import(/* @vite-ignore */ './pages/dashboards/AdminDashboardPage'));
const SuperAdminDashboardPage = lazy(() => import(/* @vite-ignore */ './pages/dashboards/SuperAdminDashboardPage'));

// ── People management ────────────────────────────────────────────────────────
const StudentsListPage = lazy(() => import('./pages/students/StudentsListPage'));
const AddStudentPage = lazy(() => import('./pages/students/AddStudentPage'));
const EditStudentPage = lazy(() => import('./pages/students/EditStudentPage'));

const TeachersListPage = lazy(() => import('./pages/teachers/TeachersListPage'));
const AddTeacherPage = lazy(() => import('./pages/teachers/AddTeacherPage'));
const EditTeacherPage = lazy(() => import('./pages/teachers/EditTeacherPage'));

const GuardiansListPage = lazy(() => import('./pages/guardians/GuardiansListPage'));
const AddGuardianPage = lazy(() => import('./pages/guardians/AddGuardianPage'));
const EditGuardianPage = lazy(() => import('./pages/guardians/EditGuardianPage'));

const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// ── Academic ─────────────────────────────────────────────────────────────────
const ClassesListPage = lazy(() => import('./pages/classes/ClassesListPage'));
const SubjectsListPage = lazy(() => import('./pages/subjects/SubjectsListPage'));
const RoomsManagementPage = lazy(() => import('./pages/rooms/RoomsManagementPage'));
const SyllabusPage = lazy(() => import('./pages/syllabus/SyllabusPage'));
const TimetablePage = lazy(() => import('./pages/timetable/TimetablePage'));
const ExamsPage = lazy(() => import('./pages/exams/ExamsPage'));
const GradesPage = lazy(() => import('./pages/grades/GradesPage'));

// ── HR / Staff ───────────────────────────────────────────────────────────────
const DepartmentsPage = lazy(() => import('./pages/departments/DepartmentsPage'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));
const LeavePage = lazy(() => import('./pages/leave/LeavePage'));

// ── Finance ──────────────────────────────────────────────────────────────────
const PayrollPage = lazy(() => import('./pages/payroll/PayrollPage'));
const FeesPage = lazy(() => import('./pages/fees/FeesPage'));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'));

// ── Campus services ──────────────────────────────────────────────────────────
const LibraryPage = lazy(() => import('./pages/library/LibraryPage'));
const HostelPage = lazy(() => import('./pages/hostel/HostelPage'));
const TransportPage = lazy(() => import('./pages/transport/TransportPage'));
const SportsPage = lazy(() => import('./pages/sports/SportsPage'));

// ── Platform ─────────────────────────────────────────────────────────────────
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const NotificationCenter = lazy(() => import('./pages/notifications/NotificationCenter'));
const FileManagerPage = lazy(() => import('./pages/files/FileManagerPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const PluginsPage = lazy(() => import('./pages/plugins/PluginsPage'));
const FAQPage = lazy(() => import('./pages/help/FAQPage'));

// ─────────────────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  if (isAuthenticated) {
    const role = user?.role;
    if (role === 'student') return <Navigate to="/student-dashboard" replace />;
    if (role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
    if (role === 'parent') return <Navigate to="/parent-dashboard" replace />;
    if (role === 'super_admin' || role === 'superadmin') return <Navigate to="/super-admin-dashboard" replace />;
    if (role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/profile" replace />;
  }
  return <>{children}</>;
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h2>🚧 {title}</h2>
      <p style={{ color: '#666' }}>This module is coming soon in a future phase.</p>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: '5rem', margin: 0 }}>404</h1>
      <h2>Page Not Found</h2>
      <p style={{ color: '#666' }}>The page you are looking for does not exist.</p>
      <a href="/" style={{ color: '#3D5EE1', textDecoration: 'none', fontWeight: 600 }}>Go Home</a>
    </div>
  );
}

function RoleRedirect() {
  const user = useSelector((state: RootState) => state.auth.user);
  const role = user?.role;
  if (role === 'student') return <Navigate to="/student-dashboard" replace />;
  if (role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
  if (role === 'parent') return <Navigate to="/parent-dashboard" replace />;
  if (role === 'super_admin' || role === 'superadmin') return <Navigate to="/super-admin-dashboard" replace />;
  if (role === 'admin') return <Navigate to="/admin-dashboard" replace />;
  return <Navigate to="/profile" replace />;
}

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // On startup, silently refresh user profile from the API so role/user data
  // stays in sync even if localStorage has stale data.
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/auth/profile')
      .then((res) => { dispatch(setUser(res.data)); })
      .catch(() => { /* token may have expired — the 401 interceptor handles logout */ });
  }, [dispatch, isAuthenticated]);

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Public Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        {/* Register route removed — login-only system */}
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Routes inside Dashboard Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Student Management */}
          <Route path="students" element={<StudentsListPage />} />
          <Route path="students/add" element={<AddStudentPage />} />
          <Route path="students/edit/:id" element={<EditStudentPage />} />
          <Route path="students/promotion" element={<ComingSoon title="Student Promotion" />} />

          {/* Teacher Management */}
          <Route path="teachers" element={<TeachersListPage />} />
          <Route path="teachers/add" element={<AddTeacherPage />} />
          <Route path="teachers/edit/:id" element={<EditTeacherPage />} />

          {/* Classes & Subjects */}
          <Route path="classes" element={<ClassesListPage />} />
          <Route path="subjects" element={<SubjectsListPage />} />

          {/* Role-specific Dashboards — guarded by RoleProtectedRoute */}
          <Route path="student-dashboard" element={<RoleProtectedRoute allowedRoles={['student']}><StudentDashboardPage /></RoleProtectedRoute>} />
          <Route path="teacher-dashboard" element={<RoleProtectedRoute allowedRoles={['teacher']}><TeacherDashboardPage /></RoleProtectedRoute>} />
          <Route path="parent-dashboard" element={<RoleProtectedRoute allowedRoles={['parent']}><ParentDashboardPage /></RoleProtectedRoute>} />
          <Route path="admin-dashboard" element={<RoleProtectedRoute allowedRoles={['admin', 'super_admin', 'superadmin']}><AdminDashboardPage /></RoleProtectedRoute>} />
          <Route path="super-admin-dashboard" element={<RoleProtectedRoute allowedRoles={['super_admin', 'superadmin']}><SuperAdminDashboardPage /></RoleProtectedRoute>} />

          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Guardians */}
          <Route path="guardians" element={<GuardiansListPage />} />
          <Route path="guardians/add" element={<AddGuardianPage />} />
          <Route path="guardians/edit/:id" element={<EditGuardianPage />} />

          {/* Rooms */}
          <Route path="rooms" element={<RoomsManagementPage />} />

          {/* Academic */}
          <Route path="syllabus" element={<SyllabusPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="grades" element={<GradesPage />} />

          {/* HR */}
          <Route path="departments" element={<DepartmentsPage />} />

          {/* Attendance */}
          <Route path="attendance/students" element={<AttendancePage />} />
          <Route path="attendance/staff" element={<AttendancePage />} />

          {/* Leaves */}
          <Route path="leaves" element={<LeavePage />} />

          {/* Finance */}
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="fees/collection" element={<FeesPage />} />
          <Route path="fees/structure" element={<FeesPage />} />

          {/* Other Modules */}
          <Route path="library" element={<LibraryPage />} />
          <Route path="transport" element={<TransportPage />} />
          <Route path="hostel" element={<HostelPage />} />
          <Route path="sports" element={<SportsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationCenter />} />
          <Route path="files" element={<FileManagerPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Help & Documentation */}
          <Route path="faq" element={<FAQPage />} />
          <Route path="help" element={<FAQPage />} />
        </Route>

        {/* Catch-all — show 404 for authenticated users, redirect to login otherwise */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
