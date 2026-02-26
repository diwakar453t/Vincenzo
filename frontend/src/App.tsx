import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useSelector } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store/store';
import type { RootState } from './store/store';
import theme from './theme/theme';
import PageLoadingFallback from './components/ui/PageLoadingFallback';

// ── Auth pages (small – load immediately on /login) ─────────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
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
    if (role === 'super_admin') return <Navigate to="/super-admin-dashboard" replace />;
    return <Navigate to="/admin-dashboard" replace />;
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

function RoleRedirect() {
  const user = useSelector((state: RootState) => state.auth.user);
  const role = user?.role;
  if (role === 'student') return <Navigate to="/student-dashboard" replace />;
  if (role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
  if (role === 'parent') return <Navigate to="/parent-dashboard" replace />;
  if (role === 'super_admin') return <Navigate to="/super-admin-dashboard" replace />;
  return <Navigate to="/admin-dashboard" replace />;
}

function AppRoutes() {
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
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
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
          <Route index element={<Navigate to="/dashboard" replace />} />
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

          {/* Role-specific Dashboards */}
          <Route path="student-dashboard" element={<StudentDashboardPage />} />
          <Route path="teacher-dashboard" element={<TeacherDashboardPage />} />
          <Route path="parent-dashboard" element={<ParentDashboardPage />} />
          <Route path="admin-dashboard" element={<AdminDashboardPage />} />
          <Route path="super-admin-dashboard" element={<SuperAdminDashboardPage />} />

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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
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
