import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Shield, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordChecks = useMemo(() => [
    { label: 'At least 12 characters', pass: password.length >= 12 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
    { label: 'Passwords match', pass: password.length > 0 && password === confirmPassword },
  ], [password, confirmPassword]);

  const allPassing = passwordChecks.every((c) => c.pass);
  const strength = passwordChecks.filter((c) => c.pass).length;
  const strengthLabel = strength <= 2 ? 'Weak' : strength <= 4 ? 'Fair' : strength <= 5 ? 'Strong' : 'Excellent';
  const strengthColor = strength <= 2 ? 'bg-destructive' : strength <= 4 ? 'bg-node-group' : 'bg-primary';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPassing) { setError('Please fix all password requirements'); return; }
    setError('');
    setIsLoading(true);
    try {
      await register(email, username, password, displayName || undefined);
      toast({ title: 'Account created', description: 'You can now sign in with your credentials' });
      navigate('/login');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed';
      const details = err.response?.data?.details;
      setError(details ? details.map((d: any) => d.message).join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-background to-primary/10" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground font-mono">ConfigFlow</span>
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
              Build with<br />
              <span className="text-accent">confidence</span>.
            </h1>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed max-w-md">
              Your configurations are protected by enterprise-grade security from the moment you create your account.
            </p>

            <div className="mt-8 space-y-3">
              {[
                'Password hashed with Argon2id (64MB memory cost)',
                'Account auto-locks after 5 failed attempts',
                'Every action logged for audit compliance',
                'Role-based access control from day one',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Security-first architecture</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight font-mono text-foreground">ConfigFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Create account</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Set up your secure workspace</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="johndoe" required
                    className="w-full h-10 pl-10 pr-3 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe"
                  className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" required
                  className="w-full h-10 pl-10 pr-3 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" required
                  className="w-full h-10 pl-10 pr-10 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••••" required
                  className="w-full h-10 pl-10 pr-3 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
              </div>
            </div>

            {/* Password strength */}
            {password.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Password Strength</span>
                  <span className={`text-xs font-medium ${strength <= 2 ? 'text-destructive' : strength <= 4 ? 'text-node-group' : 'text-primary'}`}>{strengthLabel}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex gap-0.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < strength ? strengthColor : 'bg-secondary'}`} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {passwordChecks.map(({ label, pass }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[11px]">
                      {pass ? <Check className="w-3 h-3 text-primary shrink-0" /> : <X className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                      <span className={pass ? 'text-foreground/80' : 'text-muted-foreground/50'}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={isLoading || !allPassing}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2 group">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>Create account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
