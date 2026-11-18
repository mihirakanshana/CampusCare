import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  loginWithEmail,
  loginWithGoogle,
  mapAuthError,
  registerStudentWithEmail,
  requestPasswordReset,
} from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { BrandLogo } from '../components/BrandLogo';

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen uf-ambient-canvas flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#52635D] hover:text-[#064E3B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to UniFix
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-bold text-[#064E3B] font-display"
          >
            <BrandLogo size="sm" />
            UniFix
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-3xl p-6 sm:p-8"
        >
          <h1 className="text-2xl font-bold text-[#064E3B] font-display">
            {title}
          </h1>
          <p className="text-sm text-[#52635D] mt-1.5">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/student', {
        replace: true,
      });
    }
  }, [profile, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const userProfile = await loginWithEmail(email, password);
      showToast('Welcome back', `Signed in as ${userProfile.fullName}`, 'success');
      navigate(userProfile.role === 'admin' ? '/admin' : '/student', {
        replace: true,
      });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      const userProfile = await loginWithGoogle();
      showToast('Signed in', `Welcome, ${userProfile.fullName}`, 'success');
      navigate(userProfile.role === 'admin' ? '/admin' : '/student', {
        replace: true,
      });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to UniFix"
      subtitle="Access your student reporting workspace or administrator console."
    >
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed break-words">{error}</span>
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={handleGoogleLogin}
        className="w-full py-2.5 px-4 rounded-xl border border-emerald-950/15 bg-white/85 hover:bg-white text-sm font-semibold text-[#064E3B] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-[#64748B]">
        <div className="flex-1 h-px bg-emerald-950/10" />
        <span>or sign in with university email</span>
        <div className="flex-1 h-px bg-emerald-950/10" />
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
            University Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-[#064E3B]">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#059669] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign In
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#52635D]">
        New student on campus?{' '}
        <Link to="/register" className="font-semibold text-[#059669] hover:underline">
          Create a student account
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    studentId: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/student', {
        replace: true,
      });
    }
  }, [profile, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid university email address.');
      return;
    }
    if (form.studentId.trim().length < 3) {
      setError('Please enter your official Student ID.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const userProfile = await registerStudentWithEmail({
        fullName: form.fullName,
        email: form.email,
        studentId: form.studentId,
        password: form.password,
      });
      showToast(
        'Account created',
        'Your student profile has been registered in UniFix.',
        'success'
      );
      navigate(userProfile.role === 'admin' ? '/admin' : '/student', {
        replace: true,
      });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setSubmitting(true);
    try {
      const userProfile = await loginWithGoogle();
      showToast('Account ready', `Welcome, ${userProfile.fullName}`, 'success');
      navigate(userProfile.role === 'admin' ? '/admin' : '/student', {
        replace: true,
      });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Student Registration"
      subtitle="Create your UniFix account to submit and track campus maintenance reports."
    >
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed break-words">{error}</span>
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={handleGoogleSignUp}
        className="w-full py-2.5 px-4 rounded-xl border border-emerald-950/15 bg-white/85 hover:bg-white text-sm font-semibold text-[#064E3B] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
        Register with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-[#64748B]">
        <div className="flex-1 h-px bg-emerald-950/10" />
        <span>or register with email & Student ID</span>
        <div className="flex-1 h-px bg-emerald-950/10" />
      </div>

      <form onSubmit={handleRegister} className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-[#064E3B] mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            placeholder="Jordan Taylor"
            className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1">
              University Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="j.taylor@university.edu"
              className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1">
              Student ID
            </label>
            <input
              type="text"
              required
              value={form.studentId}
              onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
              placeholder="STU-2026-0412"
              className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Min. 6 characters"
              className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((p) => ({ ...p, confirmPassword: e.target.value }))
              }
              placeholder="Repeat password"
              className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
            />
          </div>
        </div>

        <p className="text-[11px] text-[#52635D]">
          New accounts receive the Student role automatically. Administrator access is
          provisioned strictly by authorized campus administrators.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Student Account
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#52635D]">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[#059669] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your university email address to receive a Firebase password reset link."
    >
      {sent ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-10 h-10 text-[#059669] mx-auto" />
          <h2 className="mt-3 text-base font-bold text-[#064E3B] font-display">
            Reset email sent
          </h2>
          <p className="mt-1.5 text-xs text-[#52635D] leading-relaxed">
            Check the inbox for <span className="font-medium text-[#064E3B]">{email}</span>{' '}
            for instructions to reset your password.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block px-5 py-2.5 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857]"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
              University Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="glass-input w-full px-3.5 py-2.5 text-sm rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Send Password Reset Link
          </button>
          <p className="text-center text-xs text-[#52635D]">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-[#059669] hover:underline">
              Back to Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
