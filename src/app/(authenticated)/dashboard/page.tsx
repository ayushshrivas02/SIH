'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Database, 
  CheckCircle2, 
  ShieldAlert, 
  Activity,
  Plus,
  Camera,
  LineChart,
  Bot
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.metrics) setMetrics(data.metrics);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
      })
      .catch(err => console.error('Failed to load dashboard stats', err))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-400">Overview of your sovereign AI environment.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assistant">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> New AI Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Documents</CardTitle>
            <FileText className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.documents}</div>
            <p className="text-xs text-zinc-400">Total documents uploaded</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Knowledge Base</CardTitle>
            <Database className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.knowledgeBase}</div>
            <p className="text-xs text-zinc-400">Indexed for retrieval</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">AI Tasks</CardTitle>
            <Activity className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : metrics.tasks}</div>
            <p className="text-xs text-zinc-400">Tasks executed</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-200">Sovereignty Status</CardTitle>
            <ShieldAlert className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">SECURE</div>
            <p className="text-xs text-zinc-400">{metrics.externalCalls} External API calls</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Quick Actions */}
        <Card className="col-span-full lg:col-span-4 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Launch specialized workflows</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/documents" className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-blue-500 hover:bg-zinc-800/50 transition-colors group">
              <FileText className="h-8 w-8 mb-3 text-zinc-400 group-hover:text-blue-400" />
              <span className="font-medium">Upload Document</span>
              <span className="text-xs text-zinc-500 mt-1">PDF, TXT, CSV</span>
            </Link>
            
            <Link href="/vision" className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-blue-500 hover:bg-zinc-800/50 transition-colors group">
              <Camera className="h-8 w-8 mb-3 text-zinc-400 group-hover:text-blue-400" />
              <span className="font-medium">Analyze Image</span>
              <span className="text-xs text-zinc-500 mt-1">Visual Inspection</span>
            </Link>

            <Link href="/analysis" className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-blue-500 hover:bg-zinc-800/50 transition-colors group">
              <LineChart className="h-8 w-8 mb-3 text-zinc-400 group-hover:text-blue-400" />
              <span className="font-medium">Analyze Dataset</span>
              <span className="text-xs text-zinc-500 mt-1">CSV / Excel Stats</span>
            </Link>

            <Link href="/agents" className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-blue-500 hover:bg-zinc-800/50 transition-colors group">
              <Bot className="h-8 w-8 mb-3 text-zinc-400 group-hover:text-blue-400" />
              <span className="font-medium">Run Agent</span>
              <span className="text-xs text-zinc-500 mt-1">Multi-step planning</span>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-full lg:col-span-3 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest tasks and document updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading && <p className="text-sm text-zinc-500">Loading activity...</p>}
              {!loading && recentActivity.length === 0 && (
                <p className="text-sm text-zinc-500">No recent activity found.</p>
              )}
              {recentActivity.map((activity, i) => {
                // Calculate rough relative time
                const date = new Date(activity.time);
                const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
                let timeStr = 'Just now';
                if (diffSecs > 86400) timeStr = `${Math.floor(diffSecs / 86400)} days ago`;
                else if (diffSecs > 3600) timeStr = `${Math.floor(diffSecs / 3600)} hours ago`;
                else if (diffSecs > 60) timeStr = `${Math.floor(diffSecs / 60)} minutes ago`;

                return (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="bg-zinc-800 p-2 rounded-full shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className="text-sm font-medium leading-none truncate">{activity.title}</p>
                      <div className="flex justify-between items-center text-xs text-zinc-400">
                         <span className="truncate mr-2">{activity.details}</span>
                         <span className="whitespace-nowrap">{timeStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <Link href="/audit">
                <Button variant="outline" className="w-full text-zinc-300 border-zinc-700 bg-transparent hover:bg-zinc-800">
                  View full audit log
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
