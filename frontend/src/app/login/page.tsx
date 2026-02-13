'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Compass, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      localStorage.setItem('token', response.data.access_token);
      toast.success('Login Successful');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login Failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.45_0.18_25_/_0.05),transparent_70%)]" />

      <Card className="w-full max-w-[420px] border-primary/30 z-10 shadow-2xl bg-card">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/30">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary uppercase">
            ServiceNow
          </CardTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">
            Incident Management Portal
          </p>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Email Address</label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="bg-black/40 border-primary/20 focus:border-primary/60 text-foreground h-12 rounded-sm"
                placeholder="user@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/80 ml-1">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="bg-black/40 border-primary/20 focus:border-primary/60 text-foreground h-12 rounded-sm"
                placeholder="••••••••"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8">
            <Button 
              type="submit" 
              className="w-full h-12 flex items-center justify-center gap-2 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 transition-transform group-hover:scale-110" />
                  Sign In
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Ornate Corner Accents */}
      <div className="hidden sm:block absolute top-10 left-10 w-24 h-24 border-t-2 border-l-2 border-primary/20 rounded-tl-3xl pointer-events-none" />
      <div className="hidden sm:block absolute bottom-10 right-10 w-24 h-24 border-b-2 border-r-2 border-primary/20 rounded-br-3xl pointer-events-none" />
    </div>
  );
}
