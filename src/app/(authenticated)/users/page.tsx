'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Trash2, Edit2, ShieldAlert, Key } from 'lucide-react';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { MagicCard } from '@/components/ui/magic-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { StatusBadge } from '@/components/ui/status-badge';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'USER' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save user');
      }

      setIsCreating(false);
      setEditingId(null);
      setFormData({ name: '', email: '', password: '', role: 'USER' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (user: any) => {
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setEditingId(user.id);
    setIsCreating(true);
  };

  const isUserAdmin = (session?.user as any)?.role === 'ADMIN';

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
        <ShieldAlert className="h-16 w-16 mb-4 text-red-500" />
        <h2 className="text-xl font-semibold text-white">Access Denied</h2>
        <p>You need Administrator privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> User Matrix
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Manage platform access, role hierarchies, and security policies.
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => { setIsCreating(true); setEditingId(null); setFormData({ name: '', email: '', password: '', role: 'USER' }); }} className="h-10 text-xs font-bold uppercase tracking-widest bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 transition-colors">
            Authorize New User
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {isCreating && (
        <MagicCard gradientColor="hsl(var(--primary) / 0.15)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl relative z-10">
          <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
               <Key className="h-4 w-4 text-primary" /> {editingId ? 'Modify Access Credentials' : 'Provision New Identity'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Identity Name</Label>
                  <Input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Contact Vector (Email)</Label>
                  <Input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Encryption Key (Password) {editingId && <span className="text-primary/50">(Leave blank to keep unchanged)</span>}</Label>
                  <Input 
                    required={!editingId}
                    type="password" 
                    value={formData.password} 
                    onChange={e => setFormData({ ...formData, password: e.target.value })} 
                    className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg shadow-inner focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Authorization Level</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white font-mono h-10 rounded-lg">
                      <SelectValue placeholder="Select authorization" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                      <SelectItem value="ADMIN" className="font-mono">ADMIN (Level 4)</SelectItem>
                      <SelectItem value="MANAGER" className="font-mono">MANAGER (Level 3)</SelectItem>
                      <SelectItem value="USER" className="font-mono">USER (Level 2)</SelectItem>
                      <SelectItem value="VIEWER" className="font-mono">VIEWER (Level 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <Button variant="ghost" type="button" onClick={() => setIsCreating(false)} className="h-10 text-xs font-bold uppercase tracking-widest bg-black/40 border-white/10 hover:bg-white/5 transition-colors text-white">Abort</Button>
                <ShimmerButton type="submit" className="h-10 px-8 font-bold uppercase tracking-widest text-xs bg-primary shadow-xl">
                  {editingId ? 'Commit Changes' : 'Initialize Identity'}
                </ShimmerButton>
              </div>
            </form>
          </CardContent>
        </MagicCard>
      )}

      <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
            <Users className="h-4 w-4 text-cyan-400" /> Active Identities
          </CardTitle>
          <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">All verified users within the Sovereign AI architecture.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-black/40 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Identity Name</th>
                  <th className="px-6 py-4">Contact Vector</th>
                  <th className="px-6 py-4">Authorization</th>
                  <th className="px-6 py-4">Initialization Date</th>
                  <th className="px-6 py-4 text-right">Directives</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-mono text-xs uppercase tracking-widest animate-pulse">Syncing Identites...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-mono text-xs uppercase tracking-widest">No Identities Found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-white/90 group-hover:text-white">{user.name}</td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest border shadow-inner ${
                          user.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          user.role === 'MANAGER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          user.role === 'USER' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-white/5 text-muted-foreground border-white/10'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} className="text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(user.id)}
                          disabled={(session?.user as any)?.id === user.id}
                          className={`hover:bg-rose-500/10 transition-colors ${(session?.user as any)?.id === user.id ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-rose-400'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </MagicCard>
    </div>
  );
}
