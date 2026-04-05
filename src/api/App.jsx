import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import PublicRoute from '@/components/PublicRoute';

import { useState, useEffect } from 'react';
import { api } from "@/api";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

// Hardcoded admin email
const ADMIN_EMAIL = "admin@sportsync.edu";

const TeacherPendingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
    <Card className="w-full max-w-md border-0 shadow-xl text-center">
      <CardContent className="pt-10 pb-8 px-8">
        <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-5">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Awaiting Approval</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Your teacher account is pending admin approval. You'll be notified once your account is active.
        </p>
        <Button variant="outline" onClick={() => api.auth.logout()}>Sign Out</Button>
      </CardContent>
    </Card>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin, user } = useAuth();
  const [profileComplete, setProfileComplete] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (user) {
      // Auto-assign admin role for hardcoded admin email
      if (user.email === ADMIN_EMAIL && user.role !== "admin") {
        api.auth.updateMe({ role: "admin", profile_complete: true });
      }
      setProfileComplete(!!user.profile_complete);
      setCheckingProfile(false);
    }
  }, [user]);

  if (isLoadingAuth || checkingProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  // Admin bypass: always has full access
  if (user?.email === ADMIN_EMAIL || user?.role === "admin") {
    if (!user?.profile_complete) {
      api.auth.updateMe({ role: "admin", profile_complete: true });
      return <div className="fixed inset-0 flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>;
    }
  }

  // Teacher pending: block login until approved
  if (user?.role === "teacher" && user?.teacher_status === "pending") {
    return <TeacherPendingScreen />;
  }

  if (!profileComplete) {
    return <ProfileSetup onComplete={async () => {
      await api.auth.me();
      setProfileComplete(true);
    }} />;
  }

  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/training" element={<TrainingLog />} />
        <Route path="/booking" element={<VenueBooking />} />
        <Route path="/requests" element={<ManageRequests />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App