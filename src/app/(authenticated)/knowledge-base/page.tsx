'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, FileText, Trash2, RefreshCw, Cpu, UploadCloud, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useKnowledgeBaseStore } from '@/lib/store/appStore';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { MagicCard } from '@/components/ui/magic-card';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { StatusBadge } from '@/components/ui/status-badge';

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
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
             <Database className="h-8 w-8 text-primary" /> Knowledge Base
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Manage vector embeddings and indexed RAG documents.
          </p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".pdf,.txt,.docx,.csv,.xlsx"
          />
          <ShimmerButton onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-10 text-xs font-bold uppercase tracking-widest px-6 shadow-xl shadow-primary/20 bg-primary">
            {uploading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {uploading ? 'Processing...' : 'Ingest Data'}
          </ShimmerButton>
          <Button variant="outline" onClick={() => fetchDocuments()} className="h-10 text-xs font-bold uppercase tracking-widest bg-black/40 border-white/10 hover:bg-white/5 transition-colors text-white">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 relative z-10">
        <MagicCard gradientColor="hsl(var(--primary) / 0.15)" className="md:col-span-1 bg-card/60 backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col h-full">
          <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
              <Database className="h-4 w-4 text-primary" /> Vector Storage
            </CardTitle>
            <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">On-premise RAG engine status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 flex-1 flex flex-col">
             <div className="flex justify-between items-center pb-3 border-b border-white/5">
               <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Engine</span>
               <span className="text-sm font-semibold text-white/90">Local Vector Store</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-white/5">
               <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Embedding Model</span>
               <span className="text-sm font-semibold text-white/90">Transformers.js</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-white/5">
               <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Documents Indexed</span>
               <span className="text-2xl font-black text-white">{documents.filter(d => d.status === 'READY').length}</span>
             </div>
             <div className="pt-4 mt-auto">
                <Button className="w-full bg-black/40 border border-white/10 text-white/50 cursor-not-allowed hover:bg-black/40" disabled>
                  <Cpu className="mr-2 h-4 w-4" /> Re-index Matrix
                </Button>
             </div>
          </CardContent>
        </MagicCard>

        <Card className="md:col-span-2 bg-card/60 backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col">
          <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
              <FileText className="h-4 w-4 text-cyan-400" /> Indexed Documents
            </CardTitle>
            <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Files processed and available for semantic search.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                 <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
                 <p className="text-xs font-bold uppercase tracking-widest">Loading Index Matrix...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <Database className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No documents indexed yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/5 hover:bg-transparent bg-black/40">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Filename</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Index Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Vector Chunks</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3 text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="font-semibold flex items-center text-white/90 group-hover:text-white py-4">
                        <FileText className="mr-3 h-4 w-4 text-cyan-400" />
                        {doc.filename}
                      </TableCell>
                      <TableCell className="py-4">
                        {doc.status === 'READY' ? <StatusBadge status="online" text="INDEXED" pulse={false} /> : 
                         doc.status === 'ERROR' ? <StatusBadge status="offline" text="ERROR" pulse={false} /> :
                         <StatusBadge status="processing" text={doc.status} />}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono py-4">
                         {doc._count?.chunks || 0} chunks
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button onClick={() => handleDelete(doc.id)} variant="ghost" size="icon" className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
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

      <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
            <Search className="h-4 w-4 text-emerald-400" /> RAG & External Data Test
          </CardTitle>
          <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Select a target database to query. Queries are processed entirely on-premise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col space-y-3 mb-4">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Database</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                className="h-12 w-full md:w-1/2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
              >
                <option value="local" className="bg-zinc-900">Local Document Index (Vector RAG)</option>
                {databases.map((db) => (
                  <option key={db.id} value={db.id} className="bg-zinc-900">
                    {db.name} ({db.type})
                  </option>
                ))}
              </select>
              {selectedDatabase !== 'local' && (
                <Button 
                  variant="outline" 
                  onClick={handleDeleteDatabase}
                  className="h-12 border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Connection
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={ragQuery}
              onChange={(event) => setRagQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && runRagTest()}
              className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-5 py-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-inner placeholder:text-white/30"
              placeholder="Query the secure intelligence matrix..."
              aria-label="RAG test query"
            />
            <ShimmerButton onClick={() => runRagTest()} disabled={ragLoading} className="h-12 px-8 font-bold uppercase tracking-widest text-xs bg-emerald-600 shadow-xl">
              {ragLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {ragLoading ? 'Searching...' : 'Execute'}
            </ShimmerButton>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {demoQuestions.map((question) => (
              <Button key={question} variant="outline" size="sm" className="h-auto whitespace-normal text-left bg-black/40 border-white/10 text-muted-foreground hover:text-white hover:border-white/30 transition-all text-xs py-2 px-3 rounded-lg" onClick={() => runRagTest(question)} disabled={ragLoading}>
                {question}
              </Button>
            ))}
          </div>
          {ragResult && <div className="grid lg:grid-cols-2 gap-6 pt-4">
            <div className="rounded-xl border border-white/5 bg-black/40 shadow-inner p-5 space-y-4 h-full flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"><Database className="h-4 w-4" /> Retrieved Sources</h3>
              <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4">
                {ragResult.sources.length === 0 ? <p className="text-sm text-muted-foreground">No relevant source was retrieved; no answer was generated from documents.</p> : ragResult.sources.map((source) => (
                  <div key={source.chunkId} className="border-l-2 border-primary/50 pl-4 text-sm bg-white/5 p-3 rounded-r-lg">
                    <p className="font-bold text-white/90">{source.documentName}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 mb-2">Page {source.pageNumber} · {source.section}</p>
                    <p className="text-[10px] font-bold text-emerald-400 mb-2">SIMILARITY: {(source.score * 100).toFixed(1)}%</p>
                    <p className="text-xs text-white/70 font-mono leading-relaxed">{source.content}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/40 shadow-inner p-5 h-full flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2"><Cpu className="h-4 w-4" /> Synthesized Output</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90 font-mono overflow-y-auto max-h-[400px] bg-black/20 p-4 rounded-lg border border-white/5">{ragResult.answer}</p>
            </div>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
