'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { MagicCard } from '@/components/ui/magic-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { 
  FileText, Database, CheckCircle2, ShieldAlert, Activity,
  Plus, Camera, LineChart, Bot, Server, XCircle, AlertCircle, 
  Settings, User, UploadCloud, Cpu
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    documents: 0,
    knowledgeBase: 0,
    tasks: 0,
    externalCalls: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [modelsHealth, setModelsHealth] = useState<any>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.metrics) setMetrics(data.metrics);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
      })
      .catch(err => console.error('Failed to load dashboard stats', err))
      .finally(() => setLoadingStats(false));

    fetch('/api/models/health')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.providers) setModelsHealth(data.providers);
      })
      .catch(err => console.error('Failed to load models health', err))
      .finally(() => setLoadingModels(false));

    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRecentTasks(data.slice(0, 5));
        else if (data.tasks) setRecentTasks(data.tasks.slice(0, 5));
      })
      .catch(err => console.error('Failed to load tasks', err))
      .finally(() => setLoadingTasks(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <StatusBadge status="online" text="Connected" />;
      case 'NOT CONFIGURED':
        return <StatusBadge status="warning" text="Not Configured" pulse={false} />;
      case 'UNAVAILABLE':
        return <StatusBadge status="offline" text="Unavailable" />;
      default:
        return <StatusBadge status="processing" text={status || 'Unknown'} pulse={false} />;
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return <StatusBadge status="online" text="Done" pulse={false} />;
      case 'FAILED': return <StatusBadge status="offline" text="Failed" pulse={false} />;
      case 'RUNNING': return <StatusBadge status="processing" text="Running" />;
      case 'PENDING': return <StatusBadge status="warning" text="Pending" pulse={false} />;
      default: return <StatusBadge status="processing" text={status} pulse={false} />;
    }
  }

  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('upload') || actionLower.includes('document')) return <UploadCloud className="h-4 w-4 text-cyan-400" />;
    if (actionLower.includes('agent') || actionLower.includes('task')) return <Bot className="h-4 w-4 text-emerald-400" />;
    if (actionLower.includes('setting') || actionLower.includes('config')) return <Settings className="h-4 w-4 text-amber-400" />;
    if (actionLower.includes('login') || actionLower.includes('user')) return <User className="h-4 w-4 text-blue-400" />;
    return <Activity className="h-4 w-4 text-primary" />;
  }

  const ragProgress = metrics.documents > 0 ? Math.round((metrics.knowledgeBase / metrics.documents) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      <AnimatedGridPattern className="opacity-40" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg">
            Sovereign AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Command Center</span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Confidential intelligence. Local models. Verified outcomes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/assistant">
            <ShimmerButton className="shadow-2xl shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Initialize Mission
            </ShimmerButton>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        <MagicCard gradientColor="hsl(var(--primary) / 0.2)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Documents</CardTitle>
            <FileText className="h-4 w-4 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">{loadingStats ? <span className="animate-pulse">--</span> : metrics.documents}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Files in secure local storage</p>
          </CardContent>
        </MagicCard>
        
        <MagicCard gradientColor="hsl(var(--primary) / 0.2)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Knowledge Matrix</CardTitle>
            <Database className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-black text-white">{loadingStats ? <span className="animate-pulse">--</span> : metrics.knowledgeBase}</div>
              <span className="text-xs font-bold text-cyan-400 mb-1">{ragProgress}% Indexed</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-1 mt-3 overflow-hidden border border-white/5">
               <div className="bg-gradient-to-r from-primary to-cyan-400 h-1 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${ragProgress}%` }}></div>
            </div>
          </CardContent>
        </MagicCard>

        <MagicCard gradientColor="hsl(var(--primary) / 0.2)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Agent Workflows</CardTitle>
            <Bot className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">{loadingStats ? <span className="animate-pulse">--</span> : metrics.tasks}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Total missions executed</p>
          </CardContent>
        </MagicCard>

        <MagicCard className="border-emerald-500/20 bg-emerald-950/10" gradientColor="rgba(16, 185, 129, 0.15)">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Security Status</CardTitle>
            <ShieldAlert className="h-4 w-4 text-emerald-500 animate-pulse drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">SECURE</div>
            <p className="text-xs text-emerald-500/80 mt-2 font-medium">{metrics.externalCalls} external leaks blocked</p>
          </CardContent>
        </MagicCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 relative z-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* System Health / Models */}
            <Card className="flex flex-col bg-card/60 backdrop-blur-md border-border/50">
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-lg font-heading tracking-wide uppercase text-white/90">
                  <Server className="h-5 w-5 text-primary" />
                  Inference Engines
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {loadingModels ? (
                  <div className="space-y-4 animate-pulse">
                     {[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-lg"></div>)}
                  </div>
                ) : !modelsHealth ? (
                  <div className="flex items-center justify-center h-full flex-col gap-3 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 text-rose-500/50" />
                    <span className="text-sm font-medium uppercase tracking-widest">Access Restricted</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { key: 'text', label: 'Primary Language Model', default: 'Local LLM' },
                      { key: 'vision', label: 'Vision Processing Engine', default: 'Local Vision' },
                      { key: 'embedding', label: 'Knowledge Embeddings', default: 'Local Embeddings' }
                    ].map(({ key, label, default: def }) => (
                      <div key={key} className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                         <div>
                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                           <p className="text-sm font-semibold text-white/90 group-hover:text-primary transition-colors">{modelsHealth[key]?.name || def}</p>
                         </div>
                         {getStatusBadge(modelsHealth[key]?.health?.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Agent Tasks */}
            <Card className="flex flex-col bg-card/60 backdrop-blur-md border-border/50">
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-lg font-heading tracking-wide uppercase text-white/90">
                  <Activity className="h-5 w-5 text-primary" />
                  Active Missions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-0 flex-1 overflow-hidden">
                {loadingTasks ? (
                  <div className="p-4 space-y-4 animate-pulse">
                     {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl"></div>)}
                  </div>
                ) : recentTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-full flex-col gap-3 text-muted-foreground">
                    <Bot className="h-8 w-8 text-white/20" />
                    <span className="text-sm font-medium uppercase tracking-widest">No Active Missions</span>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {recentTasks.map(task => (
                      <Link key={task.id} href={`/agents`} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                        <div className="truncate pr-4">
                           <p className="text-sm font-medium text-white/90 group-hover:text-primary transition-colors truncate">{task.goal}</p>
                           <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-1.5">
                             Started {new Date(task.createdAt).toLocaleDateString()}
                           </p>
                        </div>
                        <div className="shrink-0 ml-2">
                           {getTaskStatusBadge(task.status)}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: '/documents', icon: UploadCloud, label: 'Ingest Data', color: 'text-cyan-400', bg: 'group-hover:bg-cyan-400/10 group-hover:border-cyan-400/30' },
              { href: '/vision', icon: Camera, label: 'Vision Analysis', color: 'text-purple-400', bg: 'group-hover:bg-purple-400/10 group-hover:border-purple-400/30' },
              { href: '/analysis', icon: LineChart, label: 'Data Insights', color: 'text-amber-400', bg: 'group-hover:bg-amber-400/10 group-hover:border-amber-400/30' },
              { href: '/agents', icon: Cpu, label: 'Deploy Agent', color: 'text-emerald-400', bg: 'group-hover:bg-emerald-400/10 group-hover:border-emerald-400/30' },
            ].map((action, i) => (
              <Link key={i} href={action.href} className={cn("group flex flex-col items-center justify-center p-6 bg-card/40 backdrop-blur-sm border border-white/5 rounded-xl transition-all duration-300", action.bg)}>
                <div className={cn("mb-4 transition-transform duration-300 group-hover:scale-110", action.color)}>
                  <action.icon className="h-8 w-8 drop-shadow-lg" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity Timeline */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col bg-card/60 backdrop-blur-md border-border/50">
            <CardHeader className="pb-4 border-b border-white/5">
              <CardTitle className="text-lg font-heading tracking-wide uppercase text-white/90">Event Log</CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest mt-1">Immutable System Audit</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-9 w-px bg-gradient-to-b from-primary/50 via-white/10 to-transparent"></div>
              
              <div className="space-y-6 relative z-10">
                {loadingStats && (
                  <div className="space-y-6">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="flex items-center space-x-4 animate-pulse">
                        <div className="bg-white/10 w-10 h-10 rounded-full shrink-0"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-white/10 rounded w-3/4"></div>
                          <div className="h-2 bg-white/5 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!loadingStats && recentActivity.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mb-3 opacity-20" />
                    <span className="text-xs font-bold uppercase tracking-widest">No Events Recorded</span>
                  </div>
                )}

                {recentActivity.map((activity, i) => {
                  const date = new Date(activity.time);
                  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
                  let timeStr = 'Just now';
                  if (diffSecs > 86400) timeStr = `${Math.floor(diffSecs / 86400)}d ago`;
                  else if (diffSecs > 3600) timeStr = `${Math.floor(diffSecs / 3600)}h ago`;
                  else if (diffSecs > 60) timeStr = `${Math.floor(diffSecs / 60)}m ago`;

                  return (
                    <div key={i} className="relative flex items-start space-x-4 group">
                      <div className="bg-black border border-white/10 p-2 rounded-full shrink-0 group-hover:border-primary group-hover:shadow-[0_0_10px_rgba(var(--primary),0.3)] transition-all z-10">
                        {getActivityIcon(activity.title)}
                      </div>
                      <div className="flex-1 space-y-1.5 pt-1.5 pb-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold text-white/90">{activity.title}</p>
                            <span className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{timeStr}</span>
                          </div>
                          <p className="text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2">{activity.details}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <div className="p-4 border-t border-white/5 mt-auto">
              <Link href="/audit">
                <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10">
                  View Full Audit Log
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
