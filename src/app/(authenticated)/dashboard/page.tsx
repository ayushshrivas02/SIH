'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Database, CheckCircle2, ShieldAlert, Activity,
  Plus, Camera, LineChart, Bot, Server, XCircle, AlertCircle, 
  Settings, User, UploadCloud, Cpu
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
    // 1. Fetch Dashboard Stats
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.metrics) setMetrics(data.metrics);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
      })
      .catch(err => console.error('Failed to load dashboard stats', err))
      .finally(() => setLoadingStats(false));

    // 2. Fetch Models Health
    fetch('/api/models/health')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.providers) setModelsHealth(data.providers);
      })
      .catch(err => console.error('Failed to load models health', err))
      .finally(() => setLoadingModels(false));

    // 3. Fetch Recent Tasks
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRecentTasks(data.slice(0, 5));
        else if (data.tasks) setRecentTasks(data.tasks.slice(0, 5));
      })
      .catch(err => console.error('Failed to load tasks', err))
      .finally(() => setLoadingTasks(false));
  }, []);

  // Helpers for Model Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0"><CheckCircle2 className="mr-1 h-3 w-3" /> OK</Badge>;
      case 'NOT CONFIGURED':
        return <Badge variant="outline" className="text-muted-foreground border-border">N/A</Badge>;
      case 'UNAVAILABLE':
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-0"><XCircle className="mr-1 h-3 w-3" /> Error</Badge>;
      default:
        return <Badge variant="secondary" className="border-0">{status || 'Unknown'}</Badge>;
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0 text-[10px]">DONE</Badge>;
      case 'FAILED': return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-0 text-[10px]">FAILED</Badge>;
      case 'RUNNING': return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border-0 text-[10px] animate-pulse">RUNNING</Badge>;
      case 'PENDING': return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-0 text-[10px]">PENDING</Badge>;
      default: return <Badge variant="secondary" className="text-[10px] border-0">{status}</Badge>;
    }
  }

  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('upload') || actionLower.includes('document')) return <UploadCloud className="h-4 w-4 text-primary" />;
    if (actionLower.includes('agent') || actionLower.includes('task')) return <Bot className="h-4 w-4 text-emerald-500" />;
    if (actionLower.includes('setting') || actionLower.includes('config')) return <Settings className="h-4 w-4 text-yellow-500" />;
    if (actionLower.includes('login') || actionLower.includes('user')) return <User className="h-4 w-4 text-blue-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  }

  const ragProgress = metrics.documents > 0 ? Math.round((metrics.knowledgeBase / metrics.documents) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time overview of your sovereign AI environment.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assistant">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New AI Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Documents</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{loadingStats ? <span className="animate-pulse">--</span> : metrics.documents}</div>
            <p className="text-xs text-muted-foreground mt-2">Total documents in secure storage</p>
          </CardContent>
        </Card>
        
        <Card className="group hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">RAG Knowledge</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
              <Database className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-foreground">{loadingStats ? <span className="animate-pulse">--</span> : metrics.knowledgeBase}</div>
              <span className="text-sm font-medium text-emerald-500 mb-1">{ragProgress}% Indexed</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
               <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${ragProgress}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Agent Executions</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
              <Bot className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{loadingStats ? <span className="animate-pulse">--</span> : metrics.tasks}</div>
            <p className="text-xs text-muted-foreground mt-2">Total workflows executed</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-500 uppercase tracking-wider">Sovereignty Status</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <ShieldAlert className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">SECURE</div>
            <p className="text-xs text-emerald-500/70 mt-2">{metrics.externalCalls} data leaks detected</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Left Column: System Health & Agent Tasks */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* System Health / Models */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  System Health & Models
                </CardTitle>
                <CardDescription>Live connection status for AI engines.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {loadingModels ? (
                  <div className="space-y-4 animate-pulse">
                     {[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-lg"></div>)}
                  </div>
                ) : !modelsHealth ? (
                  <div className="flex items-center justify-center h-32 flex-col gap-2 text-muted-foreground text-sm">
                    <AlertCircle className="h-6 w-6 opacity-50" />
                    <span>Insufficient privileges to view models</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
                       <div>
                         <p className="text-sm font-semibold text-foreground">Main LLM</p>
                         <p className="text-xs text-muted-foreground">{modelsHealth.text?.name || 'Local Server'}</p>
                       </div>
                       {getStatusBadge(modelsHealth.text?.health?.status)}
                    </div>
                    <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
                       <div>
                         <p className="text-sm font-semibold text-foreground">Vision Engine</p>
                         <p className="text-xs text-muted-foreground">{modelsHealth.vision?.name || 'Local Server'}</p>
                       </div>
                       {getStatusBadge(modelsHealth.vision?.health?.status)}
                    </div>
                    <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
                       <div>
                         <p className="text-sm font-semibold text-foreground">Embedding (RAG)</p>
                         <p className="text-xs text-muted-foreground">{modelsHealth.embedding?.name || 'Local Server'}</p>
                       </div>
                       {getStatusBadge(modelsHealth.embedding?.health?.status)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Agent Tasks */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Agent Tasks
                </CardTitle>
                <CardDescription>Latest autonomous executions.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-0 flex-1 overflow-hidden">
                {loadingTasks ? (
                  <div className="p-4 space-y-4 animate-pulse">
                     {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg"></div>)}
                  </div>
                ) : recentTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-40 flex-col gap-2 text-muted-foreground text-sm">
                    <Bot className="h-6 w-6 opacity-50" />
                    <span>No agent tasks executed yet.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentTasks.map(task => (
                      <Link key={task.id} href={`/agents`} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                        <div className="truncate pr-4">
                           <p className="text-sm font-medium text-foreground truncate">{task.goal}</p>
                           <p className="text-xs text-muted-foreground mt-1">Started {new Date(task.createdAt).toLocaleDateString()}</p>
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

          {/* Quick Actions (Moved below) */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Quick Launch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/documents" className="group flex flex-col items-center text-center justify-center p-4 bg-background border border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all">
                  <div className="p-3 bg-muted rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-3">
                    <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Upload Data</span>
                </Link>
                
                <Link href="/vision" className="group flex flex-col items-center text-center justify-center p-4 bg-background border border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all">
                  <div className="p-3 bg-muted rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-3">
                    <Camera className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Analyze Image</span>
                </Link>

                <Link href="/analysis" className="group flex flex-col items-center text-center justify-center p-4 bg-background border border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all">
                  <div className="p-3 bg-muted rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-3">
                    <LineChart className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">View Insights</span>
                </Link>

                <Link href="/agents" className="group flex flex-col items-center text-center justify-center p-4 bg-background border border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all">
                  <div className="p-3 bg-muted rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-3">
                    <Cpu className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Run Agent</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recent Activity Timeline */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle>System Activity</CardTitle>
              <CardDescription>Immutable audit log trail.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 overflow-hidden">
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                {loadingStats && <div className="space-y-6">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse relative z-10">
                      <div className="bg-muted w-10 h-10 rounded-full border-4 border-card shrink-0"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>}
                
                {!loadingStats && recentActivity.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                    <Activity className="h-8 w-8 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground">No recent activity</p>
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
                    <div key={i} className="relative flex items-start space-x-4 group z-10">
                      <div className="bg-card border-2 border-border p-2 rounded-full shrink-0 group-hover:border-primary group-hover:bg-primary/10 transition-colors mt-0">
                        {getActivityIcon(activity.title)}
                      </div>
                      <div className="flex-1 space-y-1.5 pt-1.5 pb-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                          <p className="text-sm font-semibold leading-tight text-foreground pr-2">{activity.title}</p>
                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground whitespace-nowrap">{timeStr}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{activity.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <div className="p-4 border-t border-border mt-auto">
              <Link href="/audit">
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
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
