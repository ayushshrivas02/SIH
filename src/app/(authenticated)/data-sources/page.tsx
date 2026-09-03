'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Network, Server, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DatabaseConnection = {
  id: string;
  name: string;
  type: string;
  uri: string;
  status: string;
  createdAt: string;
};

export default function DataSourcesPage() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New connection state
  const [name, setName] = useState('');
  const [type, setType] = useState('POSTGRES');
  const [uri, setUri] = useState('');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean; error?: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data-sources');
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleTestConnection = async () => {
    if (!type || !uri) {
      toast({ title: 'Missing fields', description: 'Please enter a URI.', variant: 'destructive' });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch('/api/data-sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, uri }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true });
        toast({ title: 'Connection Successful', description: 'Successfully connected to database.' });
      } else {
        setTestResult({ error: data.error || 'Connection failed' });
        toast({ title: 'Connection Failed', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      setTestResult({ error: 'Network error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!name || !type || !uri) {
      toast({ title: 'Missing fields', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, uri }),
      });
      
      if (res.ok) {
        toast({ title: 'Saved Successfully', description: 'Database connection added.' });
        setName('');
        setUri('');
        setTestResult(null);
        fetchConnections();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
          <p className="text-zinc-400">Connect company databases for fast retrieval and dynamic RAG.</p>
        </div>
        <Button variant="outline" onClick={fetchConnections} className="bg-transparent border-zinc-700 hover:bg-zinc-800">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="connections" className="data-[state=active]:bg-zinc-800">
            <Network className="mr-2 h-4 w-4" /> Active Connections
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-zinc-800">
            <Plus className="mr-2 h-4 w-4" /> Add New Source
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections" className="mt-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Connected Databases</CardTitle>
              <CardDescription>Secure data sources synced with your local agent network.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading connections...</div>
              ) : connections.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <Database className="h-12 w-12 text-zinc-600 mb-4" />
                  <p className="text-zinc-400">No database connections added yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Connection URI</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((conn) => (
                      <TableRow key={conn.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="font-medium flex items-center">
                          <HardDrive className="mr-2 h-4 w-4 text-blue-400" />
                          {conn.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-zinc-950 border-zinc-700 text-zinc-300">
                            {conn.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-500 font-mono text-xs">
                           {conn.uri}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-600/20 text-green-400 hover:bg-green-600/30">
                            {conn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="add" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Database Configuration</CardTitle>
                <CardDescription>Provide credentials to establish a secure, local connection.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300">Connection Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g., Production Analytics DB" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-zinc-100" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-zinc-300">Database Type</Label>
                  <Select value={type} onValueChange={(val: any) => setType(val)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                      <SelectItem value="POSTGRES">PostgreSQL</SelectItem>
                      <SelectItem value="MYSQL">MySQL</SelectItem>
                      <SelectItem value="MONGODB">MongoDB</SelectItem>
                      <SelectItem value="SQLSERVER">SQL Server</SelectItem>
                      <SelectItem value="REST_API">REST API Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uri" className="text-zinc-300">Connection String (URI)</Label>
                  <Input 
                    id="uri" 
                    placeholder="e.g., postgres://user:pass@localhost:5432/dbname" 
                    value={uri}
                    onChange={(e) => setUri(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-zinc-100 font-mono text-sm" 
                  />
                  <p className="text-xs text-zinc-500 mt-1">Credentials are securely stored and encrypted locally.</p>
                </div>
              </CardContent>
              <CardFooter className="flex gap-4 border-t border-zinc-800 pt-6">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTesting || !uri}
                  className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button 
                  onClick={handleSaveConnection}
                  disabled={isSaving || !name || !uri}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? 'Saving...' : 'Save Connection'}
                </Button>
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <Card className="bg-zinc-950/50 border-zinc-800/50 border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5 text-zinc-400" /> Connection Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResult === null && !isTesting && (
                    <div className="text-zinc-500 text-sm">Fill in the connection details and click "Test Connection" to verify connectivity.</div>
                  )}
                  {isTesting && (
                    <div className="flex items-center text-blue-400 space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span>Negotiating handshake...</span>
                    </div>
                  )}
                  {testResult?.success && (
                    <div className="flex items-start text-green-400 bg-green-950/30 p-4 rounded-md border border-green-900/50">
                      <CheckCircle2 className="h-5 w-5 mr-3 shrink-0" />
                      <div>
                        <h4 className="font-medium">Connection Successful</h4>
                        <p className="text-sm opacity-80 mt-1">The local agent cluster successfully established a connection with this data source.</p>
                      </div>
                    </div>
                  )}
                  {testResult?.error && (
                    <div className="flex items-start text-red-400 bg-red-950/30 p-4 rounded-md border border-red-900/50">
                      <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
                      <div>
                        <h4 className="font-medium">Connection Failed</h4>
                        <p className="text-sm opacity-80 mt-1">{testResult.error}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm text-zinc-400 uppercase tracking-wider">How it works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-400 space-y-4">
                  <p>
                    Connecting a company database allows the Sovereign AI Agent to perform <strong>dynamic Text-to-SQL</strong> generation and retrieve real-time data for its analysis.
                  </p>
                  <p>
                    All queries are executed locally, and data never leaves your environment. Ensure the provided credentials have read-only access to prevent accidental mutations by the AI.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
