import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface RoleProtectedRouteProps {
    /** Roles allowed to access this route. */
    allowedRoles: string[];
    children: React.ReactNode;
}

/**
 * Wraps a route so that only users with one of `allowedRoles` can access it.
 * Unauthenticated users are sent to /login.
 * Authenticated users with the wrong role are sent to their home dashboard.
 */
export default function RoleProtectedRoute({ allowedRoles, children }: RoleProtectedRouteProps) {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const user = useSelector((state: RootState) => state.auth.user);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const role = user?.role ?? '';
    if (!allowedRoles.includes(role)) {
        // Redirect to the user's own dashboard instead of a generic 403
        if (role === 'student') return <Navigate to="/student-dashboard" replace />;
        if (role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
        if (role === 'parent') return <Navigate to="/parent-dashboard" replace />;
        if (role === 'super_admin' || role === 'superadmin') return <Navigate to="/super-admin-dashboard" replace />;
        return <Navigate to="/admin-dashboard" replace />;
    }

    return <>{children}</>;
}
