import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

const RoleRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = allowedRoles.includes(user.role);

  if (!isAllowed) {
    // Redirect to home if they don't have the required role
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;
