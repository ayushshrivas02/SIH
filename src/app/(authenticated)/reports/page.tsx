'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileOutput, Download, Eye, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Report = {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  taskId: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setReports(current => current.map(r => r.id === id ? { ...r, status } : r));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const downloadReport = (report: Report) => {
    const blob = new Blob([`# ${report.title}\n\n${report.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '_')}_${new Date(report.createdAt).toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-zinc-400">View, verify, and download generated AI reports.</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Outputs from Agent workflows and data analyses requiring human verification.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <FileOutput className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400">No reports generated yet. Run an Agent task to generate a report.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="font-medium text-zinc-200">
                      {report.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.status === 'APPROVED' ? 'default' : report.status === 'DRAFT' ? 'secondary' : 'destructive'} className={
                        report.status === 'APPROVED' ? 'bg-green-600/20 text-green-400' : 
                        report.status === 'DRAFT' ? 'bg-yellow-600/20 text-yellow-400' : 
                        'bg-red-600/20 text-red-400'
                      }>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(report.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-700"><Eye className="h-4 w-4" /></Button>}>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{report.title}</DialogTitle>
                            <DialogDescription>Review the AI-generated report before approval.</DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 prose prose-invert max-w-none text-sm whitespace-pre-wrap">
                              {report.content}
                            </div>
                            {report.status === 'DRAFT' && (
                              <div className="mt-4 flex gap-2 justify-end">
                                <Button 
                                  variant="destructive" 
                                  onClick={() => updateStatus(report.id, 'REJECTED')}
                                  disabled={updating === report.id}
                                  className="bg-red-600 hover:bg-red-700">
                                  <X className="mr-2 h-4 w-4" /> Reject
                                </Button>
                                <Button 
                                  onClick={() => updateStatus(report.id, 'APPROVED')}
                                  disabled={updating === report.id}
                                  className="bg-green-600 hover:bg-green-700">
                                  <Check className="mr-2 h-4 w-4" /> Approve
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button variant="ghost" size="icon" onClick={() => downloadReport(report)} className="text-zinc-400 hover:text-white hover:bg-zinc-700">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
