import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../lib/auth-client';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = account, 2 = organization
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    orgName: '',
    orgSlug: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };
    // Auto-generate slug from org name
    if (name === 'orgName') {
      updates.orgSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    setForm({ ...form, ...updates });
  };

  const handleAccountStep = (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Create user account
      const result = await signUp.email({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      if (result.error) {
        setError(result.error.message ?? 'Failed to create account');
        setLoading(false);
        return;
      }

      // 2. Create organization
      await axios.post(
        `${API}/api/organizations`,
        { name: form.orgName, slug: form.orgSlug },
        { withCredentials: true }
      );

      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-soft outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
  const labelClass = 'text-[13px] font-medium text-body';
  const fieldClass = 'flex flex-col gap-1.5';
  const errorClass =
    'flex items-center gap-2 rounded-md border border-error/25 bg-error/10 px-3.5 py-2.5 text-[13px] text-error';
  const btnClass =
    'flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-on-primary transition hover:bg-primary-active active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60';

  const StepDot = ({ n, label, active }) => (
    <div className={`flex items-center gap-1.5 text-[13px] ${active ? 'font-medium text-primary' : 'text-muted'}`}>
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold ${
          active ? 'bg-primary text-on-primary' : 'bg-surface-strong text-muted'
        }`}
      >
        {n}
      </span>
      <span>{label}</span>
    </div>
  );

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

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          <StepDot n={1} label="Account" active={step >= 1} />
          <div className="h-px flex-1 bg-hairline" />
          <StepDot n={2} label="Workspace" active={step >= 2} />
        </div>

        {step === 1 ? (
          <>
            <h1 className="mb-1.5 text-[22px] font-normal tracking-tight text-ink">Create your account</h1>
            <p className="mb-7 text-sm text-muted">Set up your LeadAI workspace in two steps</p>
            <form onSubmit={handleAccountStep} className="flex flex-col gap-4" id="register-step1-form">
              <div className={fieldClass}>
                <label htmlFor="name" className={labelClass}>Full name</label>
                <input
                  id="name" name="name" type="text" required
                  value={form.name} onChange={handleChange}
                  className={inputClass} placeholder="Gautam Sharma"
                />
              </div>
              <div className={fieldClass}>
                <label htmlFor="email" className={labelClass}>Email address</label>
                <input
                  id="email" name="email" type="email" required
                  value={form.email} onChange={handleChange}
                  className={inputClass} placeholder="you@company.com"
                />
              </div>
              <div className={fieldClass}>
                <label htmlFor="password" className={labelClass}>Password</label>
                <input
                  id="password" name="password" type="password" required
                  value={form.password} onChange={handleChange}
                  className={inputClass} placeholder="Min. 8 characters"
                />
              </div>
              {error && (
                <div className={errorClass} role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}
              <button type="submit" id="register-step1-next" className={`${btnClass} w-full`}>
                Continue →
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-1.5 text-[22px] font-normal tracking-tight text-ink">Create your workspace</h1>
            <p className="mb-7 text-sm text-muted">Your team will use this to access LeadAI</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="register-step2-form">
              <div className={fieldClass}>
                <label htmlFor="orgName" className={labelClass}>Organization name</label>
                <input
                  id="orgName" name="orgName" type="text" required
                  value={form.orgName} onChange={handleChange}
                  className={inputClass} placeholder="Acme Corp"
                />
              </div>
              <div className={fieldClass}>
                <label htmlFor="orgSlug" className={`${labelClass} flex items-center justify-between`}>
                  Workspace URL
                  <span className="text-[11px] font-normal text-muted">leadai.app/{form.orgSlug || '...'}</span>
                </label>
                <input
                  id="orgSlug" name="orgSlug" type="text" required
                  pattern="^[a-z0-9-]+$"
                  value={form.orgSlug} onChange={handleChange}
                  className={inputClass} placeholder="acme-corp"
                />
              </div>
              {error && (
                <div className={errorClass} role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  id="register-step2-back"
                  className="flex h-10 flex-1 items-center justify-center rounded-md border border-hairline-strong bg-surface-card text-sm font-medium text-body transition hover:bg-surface-soft"
                  onClick={() => { setStep(1); setError(''); }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  id="register-step2-submit"
                  className={`${btnClass} flex-1`}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  ) : (
                    'Create workspace'
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        <p className="mt-5 text-center text-[13px] text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-active">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
