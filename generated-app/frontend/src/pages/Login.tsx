import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Trees, Leaf, LogIn } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated, error: authError, clearError, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    clearError();
    setLocalError('');
  }, [email, password, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      const msg = err?.data?.error?.message || err?.message || 'Login failed. Please try again.';
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen flex font-[DM_Sans,sans-serif]" style={{ background: 'var(--background)' }}>
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(145deg, #1B4332 0%, #2D6A4F 40%, #40916C 100%)',
        }}
      >
        {/* Animated background leaves */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute opacity-[0.07] text-white"
              style={{
                top: `${15 + i * 14}%`,
                left: `${10 + (i % 3) * 30}%`,
                animation: `float ${4 + i * 0.8}s ease-in-out infinite`,
                animationDelay: `${i * 0.6}s`,
              }}
            >
              <Leaf size={40 + i * 12} strokeWidth={1} />
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Trees className="text-[#D4A373]" size={32} />
            <span className="text-2xl font-semibold text-white font-[Space_Grotesk,sans-serif] tracking-tight">
              Canopy
            </span>
          </div>
          <p className="text-white/60 text-sm mt-1">Project Management</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h2
            className="text-4xl font-light text-white leading-tight font-[Space_Grotesk,sans-serif]"
            style={{ animationDelay: '0.3s' }}
          >
            Organize your work
            <br />
            <span className="text-[#D4A373] font-medium">under one canopy.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-md">
            Track issues, manage sprints, and collaborate with your team
            in a beautiful, intuitive workspace.
          </p>
        </div>

        <div className="relative z-10 text-white/40 text-xs">
          &copy; 2026 Canopy. Built with care.
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
          }
        `}</style>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Trees style={{ color: 'var(--primary)' }} size={28} />
            <span className="text-xl font-semibold font-[Space_Grotesk,sans-serif]" style={{ color: 'var(--foreground)' }}>
              Canopy
            </span>
          </div>

          <div className="mb-8">
            <h1
              className="text-2xl font-semibold font-[Space_Grotesk,sans-serif] mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Welcome back
            </h1>
            <p style={{ color: 'var(--muted-foreground)' }} className="text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {displayError && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 duration-300"
              style={{
                background: 'rgba(188, 108, 37, 0.1)',
                border: '1px solid rgba(188, 108, 37, 0.3)',
                color: 'var(--destructive)',
              }}
            >
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-200
                  border focus:ring-2 focus:ring-offset-1"
                style={{
                  background: 'var(--input-background, var(--card))',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  // @ts-ignore
                  '--tw-ring-color': 'var(--ring)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all duration-200
                    border focus:ring-2 focus:ring-offset-1"
                  style={{
                    background: 'var(--input-background, var(--card))',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)',
                    // @ts-ignore
                    '--tw-ring-color': 'var(--ring)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--muted-foreground)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium hover:underline transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
