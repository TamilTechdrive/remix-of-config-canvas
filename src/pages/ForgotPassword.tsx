import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Shield, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast({ title: 'Email sent', description: 'Check your inbox for reset instructions' });
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground font-mono">ConfigFlow</span>
        </div>

        {!sent ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Reset password</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Enter your email and we'll send you a reset link</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all">
                {isLoading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              If an account exists for <span className="text-foreground font-medium">{email}</span>, you'll receive a password reset link.
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border text-center">
          <Link to="/login" className="text-sm text-primary font-medium hover:text-primary/80 transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
