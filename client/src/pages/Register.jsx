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

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L25 8V20L14 26L3 20V8L14 2Z" fill="url(#grad2)" />
              <defs>
                <linearGradient id="grad2" x1="3" y1="2" x2="25" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7C3AED" />
                  <stop offset="1" stopColor="#2563EB" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="auth-logo-text">LeadAI</span>
        </div>

        {/* Step indicator */}
        <div className="auth-steps">
          <div className={`auth-step ${step >= 1 ? 'auth-step--active' : ''}`}>
            <span className="auth-step-num">1</span>
            <span>Account</span>
          </div>
          <div className="auth-step-line" />
          <div className={`auth-step ${step >= 2 ? 'auth-step--active' : ''}`}>
            <span className="auth-step-num">2</span>
            <span>Workspace</span>
          </div>
        </div>

        {step === 1 ? (
          <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Set up your LeadAI workspace in two steps</p>
            <form onSubmit={handleAccountStep} className="auth-form" id="register-step1-form">
              <div className="auth-field">
                <label htmlFor="name" className="auth-label">Full name</label>
                <input
                  id="name" name="name" type="text" required
                  value={form.name} onChange={handleChange}
                  className="auth-input" placeholder="Gautam Sharma"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="email" className="auth-label">Email address</label>
                <input
                  id="email" name="email" type="email" required
                  value={form.email} onChange={handleChange}
                  className="auth-input" placeholder="you@company.com"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="password" className="auth-label">Password</label>
                <input
                  id="password" name="password" type="password" required
                  value={form.password} onChange={handleChange}
                  className="auth-input" placeholder="Min. 8 characters"
                />
              </div>
              {error && (
                <div className="auth-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#F87171" strokeWidth="1.5"/>
                    <path d="M8 5v3M8 10.5v.5" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}
              <button type="submit" id="register-step1-next" className="auth-btn">
                Continue →
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">Create your workspace</h1>
            <p className="auth-subtitle">Your team will use this to access LeadAI</p>
            <form onSubmit={handleSubmit} className="auth-form" id="register-step2-form">
              <div className="auth-field">
                <label htmlFor="orgName" className="auth-label">Organization name</label>
                <input
                  id="orgName" name="orgName" type="text" required
                  value={form.orgName} onChange={handleChange}
                  className="auth-input" placeholder="Acme Corp"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="orgSlug" className="auth-label">
                  Workspace URL
                  <span className="auth-label-hint">leadai.app/{form.orgSlug || '...'}</span>
                </label>
                <input
                  id="orgSlug" name="orgSlug" type="text" required
                  pattern="^[a-z0-9-]+$"
                  value={form.orgSlug} onChange={handleChange}
                  className="auth-input" placeholder="acme-corp"
                />
              </div>
              {error && (
                <div className="auth-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#F87171" strokeWidth="1.5"/>
                    <path d="M8 5v3M8 10.5v.5" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}
              <div className="auth-btn-row">
                <button
                  type="button"
                  id="register-step2-back"
                  className="auth-btn auth-btn--outline"
                  onClick={() => { setStep(1); setError(''); }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  id="register-step2-submit"
                  className="auth-btn"
                  disabled={loading}
                >
                  {loading ? <span className="auth-btn-spinner" /> : 'Create workspace'}
                </button>
              </div>
            </form>
          </>
        )}

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
