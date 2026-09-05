'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, CheckCircle2, Loader2, TerminalSquare, AlertCircle, X, Download, FileText, Check } from 'lucide-react';
import { useAssistantStore } from '@/lib/store/appStore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AgentWorkspacePanel() {
  const { activeTaskId, setActiveTaskId } = useAssistantStore();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const seenDrafts = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!activeTaskId) return;

    let interval: NodeJS.Timeout | undefined;
    
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${activeTaskId}`);
        if (res.ok) {
          const data = await res.json();
          setTask(data);
          
          if (data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELED') {
            clearInterval(interval);
          }
          
          if (data.reports) {
            const newDrafts = data.reports.filter((r: any) => r.status === 'DRAFT' && !seenDrafts.current.has(r.id));
            if (newDrafts.length > 0) {
              setViewingReport(newDrafts[0]);
              seenDrafts.current.add(newDrafts[0].id);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchTask();
    interval = setInterval(fetchTask, 500);
    
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const handleStopAgent = async () => {
    if (!activeTaskId || !task || (task.status !== 'IN_PROGRESS' && task.status !== 'PENDING')) return;
    try {
      await fetch(`/api/tasks/${activeTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELED' })
      });
      setTask({ ...task, status: 'CANCELED' });
      toast({ title: 'Agent Stopped', description: 'The task execution was canceled.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to stop agent.', variant: 'destructive' });
    }
  };

  const handleReportAction = async (status: string) => {
    if (!viewingReport) return;
    
    try {
       const res = await fetch(`/api/reports/${viewingReport.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
       });
       if (res.ok) {
          toast({ title: `Report ${status}`, description: `Deliverable marked as ${status}.` });
          setViewingReport(null);
          // Update local state proactively
          setTask((prev: any) => ({
             ...prev,
             reports: prev.reports.map((r: any) => r.id === viewingReport.id ? { ...r, status } : r)
          }));
       }
    } catch (e) {
       toast({ title: 'Error', description: 'Failed to update report status.', variant: 'destructive' });
    }
  };

  const downloadReport = (report: any) => {
     const blob = new Blob([report.content], { type: 'text/plain' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = report.title + '.txt'; // Defaulting to txt for raw content
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  if (!activeTaskId) return null;

  return (
    <Card className="w-80 md:w-96 flex-shrink-0 flex flex-col overflow-hidden h-full shadow-none border-y-0 border-r-0 rounded-none ml-4">
      <div className="p-4 border-b border-border flex justify-between items-center bg-card">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold tracking-tight text-foreground">Agent Activity</h2>
        </div>
        <div className="flex items-center gap-2">
          {task && (task.status === 'IN_PROGRESS' || task.status === 'PENDING') && (
            <Button variant="destructive" size="sm" onClick={handleStopAgent} className="h-7 text-xs px-2">
              Stop
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setActiveTaskId(null)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !task ? (
        <div className="flex-1 flex justify-center items-center text-muted-foreground text-sm p-4 text-center">
          Task not found or unable to load.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex justify-between items-center">
            <Badge variant={task.status === 'COMPLETED' ? 'default' : task.status === 'FAILED' ? 'destructive' : 'secondary'} 
                   className={task.status === 'COMPLETED' ? 'bg-green-600/20 text-green-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-600/20 text-blue-400' : ''}>
              {task.status === 'IN_PROGRESS' && <Loader2 className="mr-2 h-3 w-3 animate-spin inline-block" />}
              {task.status}
            </Badge>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <TerminalSquare className="h-4 w-4" /> Execution Log
            </h3>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {(task.steps || []).map((step: any) => (
                <div key={step.id} className="relative flex items-start group">
                  <div className={"flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 z-10 " + (step.status === 'COMPLETED' ? 'bg-emerald-500' : step.status === 'FAILED' ? 'bg-destructive' : 'bg-primary')}>
                    {step.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-background" /> : 
                     step.status === 'FAILED' ? <AlertCircle className="h-4 w-4 text-background" /> :
                     <Loader2 className="h-4 w-4 text-background animate-spin" />}
                  </div>
                  <div className="ml-4 flex-1 bg-card p-3 rounded-md border border-border shadow-sm min-w-0 group-hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-foreground text-sm truncate">{step.action}</div>
                      <time className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{new Date(step.createdAt).toLocaleTimeString()}</time>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-2 rounded mt-2 max-h-32 overflow-y-auto break-words">
                      {step.result || 'Pending...'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Bot className="h-4 w-4" /> Final Output
            </h3>
            
            {task.status === 'IN_PROGRESS' || task.status === 'PENDING' ? (
              <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p className="text-sm">Agent is working...</p>
              </div>
            ) : task.status === 'FAILED' ? (
              <div className="text-destructive font-mono text-xs whitespace-pre-wrap bg-destructive/10 p-3 rounded border border-destructive/20">
                {task.result}
              </div>
            ) : (
              <div className="text-foreground font-mono text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded border border-border max-h-60 overflow-y-auto">
                {task.result}
              </div>
            )}
          </div>
          
          {/* Deliverables Viewer Section */}
          {task.reports && task.reports.length > 0 && (
             <div className="space-y-2 pt-4 border-t border-border">
               <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Generated Deliverables</h3>
               <div className="flex flex-col gap-2">
                 {task.reports.map((report: any) => (
                    <div 
                        key={report.id} 
                        className="flex flex-col p-2 bg-card border border-border rounded hover:border-primary/50 cursor-pointer transition-colors"
                        onClick={() => setViewingReport(report)}
                    >
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground truncate font-medium flex items-center gap-1">
                             <FileText className="h-3 w-3 text-primary" />
                             {report.title}
                          </span>
                          <Badge variant="outline" className={`text-[9px] uppercase ${report.status === 'APPROVED' ? 'text-emerald-500 border-emerald-500/30' : report.status === 'REJECTED' ? 'text-destructive border-destructive/30' : 'text-yellow-500 border-yellow-500/30'}`}>
                             {report.status}
                          </Badge>
                       </div>
                       <span className="text-[10px] text-muted-foreground">Click to verify and download</span>
                    </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      )}

      {/* Report Verification Dialog */}
      {viewingReport && (
         <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
           <DialogContent className="sm:max-w-2xl">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Verify Deliverable: {viewingReport.title}
               </DialogTitle>
               <DialogDescription>
                 Review the generated content. You must approve it before finalizing the workflow.
               </DialogDescription>
             </DialogHeader>
             <div className="my-4 bg-muted/30 border border-border rounded-md p-4 max-h-[60vh] overflow-y-auto font-mono text-sm whitespace-pre-wrap text-foreground">
                {viewingReport.content}
             </div>
             <DialogFooter className="flex justify-between sm:justify-between border-t border-border pt-4">
                <Button variant="outline" onClick={() => downloadReport(viewingReport)}>
                   <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <div className="flex gap-2">
                   <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleReportAction('REJECTED')}>
                      <X className="mr-2 h-4 w-4" /> Reject
                   </Button>
                   <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleReportAction('APPROVED')}>
                      <Check className="mr-2 h-4 w-4" /> Approve
                   </Button>
                </div>
             </DialogFooter>
           </DialogContent>
         </Dialog>
      )}
    </Card>
  );
}
