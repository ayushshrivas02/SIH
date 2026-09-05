'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, FileText, Trash2, RefreshCw, Cpu, UploadCloud, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useKnowledgeBaseStore } from '@/lib/store/appStore';

type Document = {
  id: string;
  filename: string;
  fileType: string;
  size: number;
  status: string;
  createdAt: string;
  _count?: {
    chunks: number;
  };
};

type RagSource = {
  chunkId: string;
  documentName: string;
  pageNumber: number;
  section: string;
  content: string;
  score: number;
};

type RagResult = { answer: string; sources: RagSource[]; grounded: boolean };

const demoQuestions = [
  'What should be checked during a routine pump inspection?',
  'What PPE is required during maintenance?',
  'What can cause high cooling-system temperature?',
  'How often should routine pump inspection be performed?',
];

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const { ragQuery, ragResult, selectedDatabase, setRagQuery, setRagResult, setSelectedDatabase } = useKnowledgeBaseStore();
  const [ragLoading, setRagLoading] = useState(false);
  const [databases, setDatabases] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/data-sources');
      if (res.ok) {
        const data = await res.json();
        setDatabases(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDatabase = async () => {
    if (selectedDatabase === 'local') return;
    if (!confirm('Are you sure you want to delete this database?')) return;
    
    try {
      const res = await fetch(`/api/data-sources/${selectedDatabase}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Database Deleted', description: 'The database has been removed.' });
        setSelectedDatabase('local');
        fetchDatabases();
      } else {
        toast({ title: 'Error', description: 'Failed to delete database.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchDatabases();
    // Poll every 3 seconds if any document is processing
    const interval = setInterval(() => {
      setDocuments((prevDocs) => {
        const needsPolling = prevDocs.some(d => ['UPLOADED', 'EXTRACTING', 'INDEXING'].includes(d.status));
        if (needsPolling) {
          fetchDocuments();
        }
        return prevDocs;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({
          title: 'Document Uploaded',
          description: 'Document has been uploaded and is being processed.',
        });
        fetchDocuments();
      } else {
        const errorText = await res.text();
        toast({
          title: 'Upload Failed',
          description: errorText || 'Failed to upload document.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast({
          title: 'Document Deleted',
          description: 'The document and its vector embeddings have been removed.',
        });
        fetchDocuments();
      } else {
        toast({
          title: 'Delete Failed',
          description: 'Failed to delete the document.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Delete Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const runRagTest = async (query = ragQuery) => {
    setRagQuery(query);
    setRagLoading(true);
    setRagResult(null);
    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, databaseId: selectedDatabase }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Local RAG query failed.');
      setRagResult(data);
    } catch (error: any) {
      toast({ title: 'RAG Test Failed', description: error.message, variant: 'destructive' });
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Manage vector embeddings and indexed RAG documents.</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".pdf,.txt,.docx,.csv,.xlsx"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
          <Button variant="outline" onClick={() => fetchDocuments()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Vector Storage</CardTitle>
            <CardDescription>On-premise RAG engine status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center pb-2 border-b border-border">
               <span className="text-muted-foreground">Engine</span>
               <span className="text-foreground">Local Vector Store</span>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-border">
               <span className="text-muted-foreground">Embedding Model</span>
               <span className="text-foreground">Transformers.js</span>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-border">
               <span className="text-muted-foreground">Documents Indexed</span>
               <span className="text-foreground">{documents.filter(d => d.status === 'READY').length}</span>
             </div>
             <div className="pt-4 flex items-center justify-center">
                <Button className="w-full" disabled>
                  <Cpu className="mr-2 h-4 w-4" /> Re-index All
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Indexed Documents</CardTitle>
            <CardDescription>Files processed and available for semantic search.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading index...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No documents indexed yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Filename</TableHead>
                    <TableHead>Index Status</TableHead>
                    <TableHead>Vector Chunks</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium flex items-center text-foreground">
                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                        {doc.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'READY' ? 'default' : doc.status === 'ERROR' ? 'destructive' : 'secondary'} className={
                          doc.status === 'READY' ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 
                          doc.status === 'ERROR' ? '' :
                          'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                        }>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                         {doc._count?.chunks || 0} chunks
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleDelete(doc.id)} variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RAG & External Data Test</CardTitle>
          <CardDescription>Select a target database to query. Queries are processed entirely on-premise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col space-y-2 mb-4">
            <label className="text-sm font-medium text-foreground">Target Database</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                className="h-10 w-full md:w-1/2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="local">Local Document Index (Vector RAG)</option>
                {databases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.name} ({db.type})
                  </option>
                ))}
              </select>
              {selectedDatabase !== 'local' && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteDatabase}
                  className="h-10"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Database
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={ragQuery}
              onChange={(event) => setRagQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && runRagTest()}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
              aria-label="RAG test query"
            />
            <Button onClick={() => runRagTest()} disabled={ragLoading}>
              {ragLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {ragLoading ? 'Searching locally...' : 'Run RAG Test'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {demoQuestions.map((question) => (
              <Button key={question} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => runRagTest(question)} disabled={ragLoading}>
                {question}
              </Button>
            ))}
          </div>
          {ragResult && <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Retrieved Sources</h3>
              {ragResult.sources.length === 0 ? <p className="text-sm text-muted-foreground">No relevant source was retrieved; no answer was generated from documents.</p> : ragResult.sources.map((source) => (
                <div key={source.chunkId} className="border-l-2 border-primary pl-3 text-sm">
                  <p className="font-medium text-foreground">{source.documentName}</p>
                  <p className="text-muted-foreground">Page {source.pageNumber} · {source.section}</p>
                  <p className="text-emerald-500">Similarity/Relevance: {(source.score * 100).toFixed(1)}%</p>
                  <p className="mt-1 text-foreground/80">{source.content}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground mb-3">Final Answer</h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{ragResult.answer}</p>
            </div>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
