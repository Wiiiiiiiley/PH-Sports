import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const featurePaths = new Set(['/', '/dashboard', '/teams', '/training', '/booking', '/requests', '/profile', '/admin']);

export function getLoginDestination(search) {
  const destination = new URLSearchParams(search).get('redirect');
  if (!destination || !destination.startsWith('/') || destination.startsWith('//') || destination.includes('\\')) return '/dashboard';
  return featurePaths.has(destination.split(/[?#]/)[0]) ? destination : '/dashboard';
}

export default function Login() {
  const { user, authError, isLoadingAuth, login, register, checkUserAuth } = useAuth();
  const location = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && !authError) return <Navigate to={getLoginDestination(location.search)} replace />;

  const handleSubmit = async event => {
    event.preventDefault();
    setFormError('');
    if (isRegistering && !name.trim()) { setFormError('Please enter your full name.'); return; }
    if (isRegistering && password !== confirmation) { setFormError('The passwords do not match.'); return; }
    if (isRegistering && (Array.from(password).length < 15 || Array.from(password).length > 128)) {
      setFormError('Choose a password between 15 and 128 characters. A long passphrase works well.');
      return;
    }
    setSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };
      await (isRegistering ? register({ ...credentials, full_name: name.trim() }) : login(credentials));
      setPassword('');
      setConfirmation('');
    } catch (error) {
      setFormError(error.response?.data?.error || 'We could not connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const busy = submitting || isLoadingAuth;
  const errorMessage = formError || (authError?.type === 'auth_error' ? authError.message : '');

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 p-5 sm:p-8">
        <Link to="/home" className="flex items-center gap-2 font-bold" aria-label="PH Sports home">
          <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />PH Sports
        </Link>
        <Link to="/home" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to preview
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col px-5 pb-12 pt-6 sm:pt-10">
        <Card className="border-0 shadow-xl">
          <CardContent className="px-6 pb-7 pt-8 sm:px-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <LockKeyhole className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-center text-2xl font-bold">{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mb-7 mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              {isRegistering ? 'Join PH Sports, then set up your student or coach profile.' : 'Sign in to your teams, training and next game.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={busy}>
              {isRegistering && <div className="space-y-2"><Label htmlFor="full-name">Full name</Label><Input id="full-name" name="name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={busy} /></div>}
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={busy} /></div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative"><Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isRegistering ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} required className="pr-11" disabled={busy} aria-describedby={isRegistering ? 'password-help' : undefined} /><button type="button" className="absolute right-0 top-0 flex h-9 w-10 items-center justify-center rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(previous => !previous)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                {isRegistering && <p id="password-help" className="text-xs leading-relaxed text-muted-foreground">Use 15–128 characters. Try a memorable phrase of several words.</p>}
              </div>
              {isRegistering && <div className="space-y-2"><Label htmlFor="confirmation">Confirm password</Label><Input id="confirmation" name="confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={busy} /></div>}
              {errorMessage && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-relaxed text-red-700">{errorMessage}</div>}
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'}</Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">{isRegistering ? 'Already have an account?' : 'New to PH Sports?'}{' '}<button type="button" disabled={busy} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50" onClick={() => { setIsRegistering(previous => !previous); setPassword(''); setConfirmation(''); setFormError(''); }}>{isRegistering ? 'Sign in' : 'Create an account'}</button></p>
            {authError?.type === 'auth_error' && !submitting && <Button variant="link" className="mt-2 w-full text-xs" onClick={checkUserAuth} disabled={isLoadingAuth}>Check your existing session again</Button>}
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">Your preview is always open. Your personal sporting life stays behind sign-in.</p>
      </main>
    </div>
  );
}
