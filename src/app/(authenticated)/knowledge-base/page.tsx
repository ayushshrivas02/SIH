'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, FileText, Trash2, RefreshCw, Cpu, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-zinc-400">Manage vector embeddings and indexed RAG documents.</p>
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
          <Button variant="outline" onClick={() => fetchDocuments()} className="bg-transparent border-zinc-700 hover:bg-zinc-800">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Vector Storage</CardTitle>
            <CardDescription>On-premise RAG engine status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
               <span className="text-zinc-400">Engine</span>
               <span className="text-zinc-200">Local Vector Store</span>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
               <span className="text-zinc-400">Embedding Model</span>
               <span className="text-zinc-200">Transformers.js</span>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
               <span className="text-zinc-400">Documents Indexed</span>
               <span className="text-zinc-200">{documents.filter(d => d.status === 'READY').length}</span>
             </div>
             <div className="pt-4 flex items-center justify-center">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled>
                  <Cpu className="mr-2 h-4 w-4" /> Re-index All
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Indexed Documents</CardTitle>
            <CardDescription>Files processed and available for semantic search.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-zinc-500">Loading index...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <Database className="h-12 w-12 text-zinc-600 mb-4" />
                <p className="text-zinc-400">No documents indexed yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead>Filename</TableHead>
                    <TableHead>Index Status</TableHead>
                    <TableHead>Vector Chunks</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="font-medium flex items-center">
                        <FileText className="mr-2 h-4 w-4 text-zinc-400" />
                        {doc.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'READY' ? 'default' : doc.status === 'ERROR' ? 'destructive' : 'secondary'} className={
                          doc.status === 'READY' ? 'bg-green-600/20 text-green-400' : 
                          doc.status === 'ERROR' ? '' :
                          'bg-yellow-600/20 text-yellow-400'
                        }>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400">
                         {doc._count?.chunks || 0} chunks
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleDelete(doc.id)} variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
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
    </div>
  );
}
