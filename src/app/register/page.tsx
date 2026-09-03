'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        toast({
          title: 'Registration Successful',
          description: 'You can now log in.',
        });
        router.push('/login');
      } else {
        const error = await res.text();
        toast({
          title: 'Registration Failed',
          description: error || 'Could not register user',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600/20 p-3 rounded-full">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Sovereign AI Workbench</CardTitle>
          <CardDescription className="text-zinc-400">
            Create an account to access the environment
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Jane Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="engineer@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
            <div className="text-sm text-center text-zinc-500">
              Already have an account? <a href="/login" className="text-blue-500 hover:underline">Log in</a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
