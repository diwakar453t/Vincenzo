import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import dashboardReducer from './slices/dashboardSlice';
import studentsReducer from './slices/studentsSlice';
import teachersReducer from './slices/teachersSlice';
import classesReducer from './slices/classesSlice';
import subjectsReducer from './slices/subjectsSlice';
import guardiansReducer from './slices/guardiansSlice';
import roomsReducer from './slices/roomsSlice';
import studentDashboardReducer from './slices/studentDashboardSlice';
import teacherDashboardReducer from './slices/teacherDashboardSlice';
import parentDashboardReducer from './slices/parentDashboardSlice';
import syllabusReducer from './slices/syllabusSlice';
import timetableReducer from './slices/timetableSlice';
import examReducer from './slices/examSlice';
import gradeReducer from './slices/gradeSlice';
import departmentReducer from './slices/departmentSlice';
import attendanceReducer from './slices/attendanceSlice';
import leaveReducer from './slices/leaveSlice';
import payrollReducer from './slices/payrollSlice';
import feeReducer from './slices/feeSlice';
import libraryReducer from './slices/librarySlice';
import hostelReducer from './slices/hostelSlice';
import transportReducer from './slices/transportSlice';
import sportsReducer from './slices/sportsSlice';
import reportsReducer from './slices/reportsSlice';
import notificationsReducer from './slices/notificationsSlice';
import searchReducer from './slices/searchSlice';
import filesReducer from './slices/filesSlice';
import settingsReducer from './slices/settingsSlice';
import paymentsReducer from './slices/paymentsSlice';
import pluginsReducer from './slices/pluginsSlice';
import superAdminReducer from './slices/superAdminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    dashboard: dashboardReducer,
    students: studentsReducer,
    teachers: teachersReducer,
    classes: classesReducer,
    subjects: subjectsReducer,
    guardians: guardiansReducer,
    rooms: roomsReducer,
    studentDashboard: studentDashboardReducer,
    teacherDashboard: teacherDashboardReducer,
    parentDashboard: parentDashboardReducer,
    syllabus: syllabusReducer,
    timetable: timetableReducer,
    exams: examReducer,
    grades: gradeReducer,
    departments: departmentReducer,
    attendance: attendanceReducer,
    leaves: leaveReducer,
    payroll: payrollReducer,
    fees: feeReducer,
    library: libraryReducer,
    hostel: hostelReducer,
    transport: transportReducer,
    sports: sportsReducer,
    reports: reportsReducer,
    notifications: notificationsReducer,
    search: searchReducer,
    files: filesReducer,
    settings: settingsReducer,
    payments: paymentsReducer,
    plugins: pluginsReducer,
    superAdmin: superAdminReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
