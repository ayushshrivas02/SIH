'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Bot, CheckCircle2, Loader2, TerminalSquare, ArrowLeft, AlertCircle, Cpu, Network } from 'lucide-react';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { MagicCard } from '@/components/ui/magic-card';

export default function AgentWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line prefer-const
    let interval: NodeJS.Timeout | undefined;
    
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${params.taskId}`);
        if (res.ok) {
          const data = await res.json();
          setTask(data);
          
          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
    interval = setInterval(fetchTask, 2000);
    
    return () => clearInterval(interval);
  }, [params.taskId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!task) {
    return <div className="text-zinc-500">Task not found.</div>;
  }

  return (
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/agents')} className="bg-black/40 border-white/10 hover:bg-white/10 hover:text-white transition-colors h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
               Agent Workspace
            </h1>
            <p className="text-sm font-medium text-primary/70 mt-2 tracking-widest uppercase">
              Mission: {task.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-full px-4 py-2 shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mission Status</span>
          {task.status === 'COMPLETED' ? <StatusBadge status="online" text="COMPLETED" pulse={false} /> : 
           task.status === 'FAILED' ? <StatusBadge status="offline" text="FAILED" pulse={false} /> :
           <StatusBadge status="processing" text={task.status} />}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 relative z-10">
        {/* Execution Log */}
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-card/60 backdrop-blur-xl border-white/5 shadow-2xl h-full flex flex-col">
            <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
                <TerminalSquare className="h-4 w-4 text-primary" /> Execution Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-white/10 before:to-transparent">
                {(task as any).steps.map((step: any) => (
                  <div key={step.id as string} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active z-10">
                    <div className={"flex items-center justify-center w-10 h-10 rounded-full shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(0,0,0,0.5)] " + (step.status === 'COMPLETED' ? 'bg-emerald-950/80 border-2 border-emerald-500/50' : step.status === 'FAILED' ? 'bg-rose-950/80 border-2 border-rose-500/50' : 'bg-primary/20 border-2 border-primary/50')}>
                      {step.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> : 
                       step.status === 'FAILED' ? <AlertCircle className="h-4 w-4 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" /> :
                       <Loader2 className="h-4 w-4 text-primary animate-spin drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/5 shadow-inner hover:border-white/20 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold text-white/90 group-hover:text-white">{step.action}</div>
                        <time className="text-[10px] uppercase tracking-widest font-bold text-primary/70">{new Date(step.createdAt).toLocaleTimeString()}</time>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-black/40 p-3 rounded-lg mt-2 max-h-40 overflow-y-auto border border-white/5 shadow-inner">
                        {step.result || 'Awaiting telemetry...'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MagicCard gradientColor="hsl(var(--primary) / 0.15)" className="bg-card/60 backdrop-blur-xl border-white/5 h-full flex flex-col shadow-2xl">
            <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
                <Network className="h-4 w-4 text-primary" /> Output Artifact
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest text-primary/70 mt-1">Final workflow result.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              {task.status === 'IN_PROGRESS' || task.status === 'PENDING' ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                  <Cpu className="h-12 w-12 text-primary/30 animate-pulse mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Neural Engine Processing...</p>
                </div>
              ) : task.status === 'FAILED' ? (
                <div className="text-rose-400 font-mono text-xs whitespace-pre-wrap leading-relaxed bg-black/40 p-4 rounded-xl border border-rose-500/20 shadow-inner">
                  {task.result}
                </div>
              ) : (
                <div className="text-white/80 font-mono text-xs leading-relaxed whitespace-pre-wrap bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner overflow-y-auto max-h-[60vh]">
                  {task.result}
                </div>
              )}
            </CardContent>
          </MagicCard>
        </div>
      </div>
    </div>
  );
}
