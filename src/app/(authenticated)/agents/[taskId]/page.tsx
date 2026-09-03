'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, CheckCircle2, Loader2, TerminalSquare, ArrowLeft, AlertCircle } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/agents')} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Workspace</h1>
          <p className="text-zinc-400">{task.title}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={task.status === 'COMPLETED' ? 'default' : task.status === 'FAILED' ? 'destructive' : 'secondary'} 
                 className={task.status === 'COMPLETED' ? 'bg-green-600/20 text-green-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-600/20 text-blue-400' : ''}>
            {task.status === 'IN_PROGRESS' && <Loader2 className="mr-2 h-3 w-3 animate-spin inline-block" />}
            {task.status}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Execution Log */}
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TerminalSquare className="h-5 w-5 text-zinc-400" /> Execution Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {(task as any).steps.map((step: any) => (
                  <div key={step.id as string} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={"flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow " + (step.status === 'COMPLETED' ? 'bg-green-500' : step.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500')}>
                      {step.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 text-zinc-900" /> : 
                       step.status === 'FAILED' ? <AlertCircle className="h-5 w-5 text-zinc-900" /> :
                       <Loader2 className="h-5 w-5 text-zinc-900 animate-spin" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-zinc-950 p-4 rounded border border-zinc-800 shadow">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-zinc-200">{step.action}</div>
                        <time className="text-xs text-zinc-500">{new Date(step.createdAt).toLocaleTimeString()}</time>
                      </div>
                      <div className="text-sm text-zinc-400 whitespace-pre-wrap font-mono bg-zinc-900 p-2 rounded mt-2 max-h-40 overflow-y-auto">
                        {step.result || 'Pending...'}
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
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-blue-400" /> Final Output</CardTitle>
              <CardDescription>The final result of the agent workflow.</CardDescription>
            </CardHeader>
            <CardContent>
              {task.status === 'IN_PROGRESS' || task.status === 'PENDING' ? (
                <div className="text-center py-8 text-zinc-500 flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p>Agent is working...</p>
                </div>
              ) : task.status === 'FAILED' ? (
                <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">{task.result}</div>
              ) : (
                <div className="text-zinc-300 font-mono text-sm whitespace-pre-wrap bg-zinc-950 p-4 rounded-md border border-zinc-800 overflow-y-auto max-h-[60vh]">
                  {task.result}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
