import { LogIn, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthStatusScreen({ error, onRetry, isLoading = false }) {
  const needsSignIn = !error || error.type === 'auth_required';
  const Icon = needsSignIn ? LogIn : AlertCircle;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <Card className="w-full max-w-md border-0 shadow-xl text-center">
        <CardContent className="pt-10 pb-8 px-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {needsSignIn ? 'Sign in to PH Sports' : 'Unable to load your account'}
          </h1>
          {needsSignIn && (
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to join your teams, record training and book a venue.
            </p>
          )}
          <p role="alert" className="text-muted-foreground text-sm mb-6">
            {error?.message || 'Open your PH Sports sign-in link to continue. Contact your administrator if you need access.'}
          </p>
          <Button onClick={onRetry} disabled={isLoading}>
            {isLoading ? 'Checking your account...' : 'Try again'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
