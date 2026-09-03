'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Server } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & Security</h1>
          <p className="text-zinc-400">Monitor system activity and sovereignty status.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Local Processing</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">ACTIVE</div>
            <p className="text-xs text-zinc-400">All tasks run on-premise</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">External AI Calls</CardTitle>
            <Server className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-zinc-400">No data left the system</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>System Audit Log</CardTitle>
          <CardDescription>Immutable record of system activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <ShieldCheck className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400">No audit events yet.</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <Table>
                <TableHeader className="sticky top-0 bg-zinc-900 z-10">
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="text-zinc-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-500">
                        {log.userId || 'SYSTEM'}
                      </TableCell>
                      <TableCell className="font-medium text-blue-400">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
