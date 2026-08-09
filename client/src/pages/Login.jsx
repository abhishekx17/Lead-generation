import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '../lib/auth-client';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn.email({
        email: form.email,
        password: form.password,
      });
      if (result.error) {
        setError(result.error.message ?? 'Invalid credentials');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-soft outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-[420px] rounded-lg border border-hairline bg-surface-card px-10 py-9">
        <div className="mb-7 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-on-primary">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L25 8V20L14 26L3 20V8L14 2Z" fill="currentColor" />
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight text-ink">LeadAI</span>
        </div>

        <h1 className="mb-1.5 text-[22px] font-normal tracking-tight text-ink">Welcome back</h1>
        <p className="mb-7 text-sm text-muted">Sign in to your workspace</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="login-form">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-body">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className={inputClass}
              placeholder="you@company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-body">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-error/25 bg-error/10 px-3.5 py-2.5 text-[13px] text-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            id="login-submit"
            className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-on-primary transition hover:bg-primary-active active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:text-primary-active">Create workspace</Link>
        </p>
      </div>
    </div>
  );
}
