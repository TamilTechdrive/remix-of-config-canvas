import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Shield, Fingerprint, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: 'Welcome back', description: 'Logged in successfully' });
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(160 60% 45% / 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(260 50% 55% / 0.06) 0%, transparent 40%)',
        }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-foreground font-mono">ConfigFlow</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Secure Configuration Intelligence</p>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
                Enterprise-grade<br />
                <span className="text-primary">security</span> built in.
              </h1>
              <p className="text-muted-foreground mt-4 text-base leading-relaxed max-w-md">
                Argon2 hashing, JWT rotation, device fingerprinting, RBAC, encrypted configs, and audit logging — all working together.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Lock, label: 'Argon2id Hashing', desc: '64MB memory cost' },
                { icon: Fingerprint, label: 'Device Tracking', desc: 'Trusted devices' },
                { icon: Shield, label: 'RBAC System', desc: 'Granular permissions' },
                { icon: Server, label: 'AES-256-GCM', desc: 'Encrypted at rest' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <Icon className="w-4 h-4 text-primary mb-2" />
                  <p className="text-xs font-medium text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Protected by multi-layer security architecture
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight font-mono text-foreground">ConfigFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Enter your credentials to access your workspace</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@configflow.dev"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full h-11 pl-10 pr-11 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Create account
              </Link>
            </p>
          </div>

          {/* Security badges */}
          <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> TLS Encrypted</span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> CSRF Protected</span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Device ID</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
