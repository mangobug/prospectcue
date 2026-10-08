import Link from 'next/link';
import { SubmitButton } from './submit-button';
import { signIn, signUp, forgotPassword, resetPassword } from '@/app/actions';
export function AuthForm({
  mode,
  message,
}: {
  mode: 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';
  message?: string;
}) {
  const titles = {
    'sign-in': 'Welcome back',
    'sign-up': 'Create your account',
    'forgot-password': 'Reset your password',
    'reset-password': 'Choose a new password',
  };
  const action = {
    'sign-in': signIn,
    'sign-up': signUp,
    'forgot-password': forgotPassword,
    'reset-password': resetPassword,
  }[mode];
  return (
    <div className="auth-form">
      <div className="eyebrow">Agency workspace</div>
      <h1>{titles[mode]}</h1>
      <p className="muted">
        {mode === 'sign-up'
          ? 'Start organizing your agency’s prospects.'
          : mode === 'sign-in'
            ? 'Sign in to pick up where you left off.'
            : 'A secure link helps you get back to your workspace.'}
      </p>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <form action={action} className="stack">
        {mode === 'sign-up' && (
          <div>
            <label htmlFor="display_name">Your name</label>
            <input
              id="display_name"
              name="display_name"
              required
              maxLength={100}
              autoComplete="name"
            />
          </div>
        )}
        {mode !== 'reset-password' && (
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </div>
        )}
        {mode !== 'forgot-password' && (
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={
                mode === 'sign-in' ? 'current-password' : 'new-password'
              }
            />
            <small className="muted">At least 8 characters</small>
          </div>
        )}
        <SubmitButton>
          {mode === 'sign-in'
            ? 'Sign in'
            : mode === 'sign-up'
              ? 'Create account'
              : mode === 'forgot-password'
                ? 'Send reset link'
                : 'Update password'}
        </SubmitButton>
      </form>
      <div className="auth-links">
        {mode === 'sign-in' ? (
          <>
            <Link href="/sign-up">New here? Create an account →</Link>
            <Link href="/forgot-password">Forgot your password?</Link>
          </>
        ) : (
          <Link href="/sign-in">Back to sign in →</Link>
        )}
      </div>
    </div>
  );
}
