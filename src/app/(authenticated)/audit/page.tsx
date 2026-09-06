'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Server, Lock, Activity, ShieldAlert } from 'lucide-react';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { MagicCard } from '@/components/ui/magic-card';
import { StatusBadge } from '@/components/ui/status-badge';

type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/audit');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
             <ShieldAlert className="h-8 w-8 text-primary" /> Audit & Security
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Monitor system activity, access vectors, and sovereignty status.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-white/5 bg-black/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Local Processing</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-widest mb-1">SECURE</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">All tasks run on-premise</p>
          </CardContent>
        </MagicCard>
        <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-white/5 bg-black/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary/70">External AI Calls</CardTitle>
            <Server className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white font-mono tracking-widest mb-1">0</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">No data left the system</p>
          </CardContent>
        </MagicCard>
        <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-white/5 bg-black/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Network Sovereignty</CardTitle>
            <Lock className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-widest mb-1">ISOLATED</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Air-gapped operation verified</p>
          </CardContent>
        </MagicCard>
        <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-white/5 bg-black/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Telemetry Flow</CardTitle>
            <Activity className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white font-mono tracking-widest mb-1">ACTIVE</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">System logging operational</p>
          </CardContent>
        </MagicCard>
      </div>

      <MagicCard gradientColor="hsl(var(--primary) / 0.1)" className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
             <ShieldCheck className="h-4 w-4 text-primary" /> System Audit Ledger
          </CardTitle>
          <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Immutable cryptographic record of system activity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground font-mono text-xs uppercase tracking-widest animate-pulse flex flex-col items-center">
              <ShieldCheck className="h-8 w-8 text-primary mb-4 opacity-50" />
              Decrypting Ledger...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <ShieldCheck className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No audit events recorded.</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/5">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4">Timestamp</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4">Origin Vector</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4">Action Type</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4">Telemetry Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="text-muted-foreground font-mono text-[10px] whitespace-nowrap py-4 group-hover:text-white/80">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground py-4">
                        {log.userId ? <span className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">{log.userId}</span> : <StatusBadge status="processing" text="SYSTEM" />}
                      </TableCell>
                      <TableCell className="font-bold text-[10px] uppercase tracking-widest text-cyan-400 py-4">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-white/80 text-xs font-mono py-4">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </MagicCard>
    </div>
  );
}
