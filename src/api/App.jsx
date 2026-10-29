import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import ProfileSetup from '@/pages/ProfileSetup';
import Dashboard from '@/pages/Dashboard';
import Teams from '@/pages/Teams';
import TrainingLog from '@/pages/TrainingLog';
import VenueBooking from '@/pages/VenueBooking';
import ManageRequests from '@/pages/ManageRequests';
import StudentProfile from '@/pages/StudentProfile';
import AdminDashboard from '@/pages/AdminDashboard';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const TeacherPendingScreen = () => {
  const { user, logout } = useAuth();
  return (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
    <Card className="w-full max-w-md border-0 shadow-xl text-center">
      <CardContent className="pt-10 pb-8 px-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-5">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">{user?.teacher_status === 'rejected' ? 'Registration not approved' : 'Awaiting Approval'}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {user?.teacher_status === 'rejected' ? 'Your teacher application was not approved. Contact your administrator for help.' : 'Your teacher account is pending admin approval. Check back after your administrator has reviewed it.'}
        </p>
        <Button variant="outline" onClick={logout}>Sign Out</Button>
      </CardContent>
    </Card>
  </div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, user, checkUserAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div role="status" className="fixed inset-0 flex flex-col gap-3 items-center justify-center bg-background">
        <div aria-hidden="true" className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading your account...</p>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  if (authError || !user) {
    const destination = location.pathname + location.search + location.hash;
    return <Navigate to={`/login?redirect=${encodeURIComponent(destination)}`} replace />;
  }

  const isAdmin = user.role === 'admin';

  // Teacher pending: block login until approved
  if (user?.role === "teacher" && user?.teacher_status !== "approved") {
    return <TeacherPendingScreen />;
  }

  if (!isAdmin && !user.profile_complete) {
    return <ProfileSetup onComplete={checkUserAuth} />;
  }

  return <Outlet />;
};

const RequireRole = ({ roles, children }) => {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<AuthenticatedApp />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/training" element={<TrainingLog />} />
          <Route path="/booking" element={<VenueBooking />} />
          <Route path="/requests" element={<RequireRole roles={['teacher', 'admin']}><ManageRequests /></RequireRole>} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
