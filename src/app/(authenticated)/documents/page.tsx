'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, FileText, Trash2, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Document = {
  id: string;
  filename: string;
  fileType: string;
  size: number;
  status: string;
  createdAt: string;
  _count?: { chunks: number };
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [viewingDoc, setViewingDoc] = useState<Document & { content?: string } | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
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
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({
          title: 'Document Uploaded',
          description: `${file.name} has been uploaded successfully.`,
        });
        fetchDocuments();
      } else {
        toast({
          title: 'Upload Failed',
          description: await res.text(),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during upload.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Document Deleted', description: 'The document was removed from storage.' });
        fetchDocuments();
      } else {
        toast({ title: 'Delete Failed', description: 'Could not delete the document.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to communicate with server.', variant: 'destructive' });
    }
  };

  const handleView = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingDoc(data);
      } else {
        toast({ title: 'Fetch Failed', description: 'Could not retrieve the document content.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to communicate with server.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-zinc-400">Manage and process industrial documents.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDocuments} className="bg-transparent border-zinc-700 hover:bg-zinc-800">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".pdf,.txt,.csv,.docx"
            />
            <Button className="bg-blue-600 hover:bg-blue-700 w-full" disabled={uploading}>
              <UploadCloud className="mr-2 h-4 w-4" /> 
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>Documents available for RAG and Agent analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <FileText className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400">No documents yet. Upload your first industrial document to begin.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead>Filename</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="font-medium flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-zinc-400" />
                      {doc.filename}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {(doc.size / 1024).toFixed(2)} KB
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {doc._count?.chunks || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={doc.status === 'READY' ? 'default' : 'secondary'} className={
                        doc.status === 'READY' ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 
                        doc.status === 'ERROR' ? 'bg-red-600/20 text-red-400' : 'bg-zinc-800 text-zinc-300'
                      }>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleView(doc.id)} className="text-zinc-400 hover:text-white hover:bg-zinc-700 mr-2">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
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

      {/* Document View Dialog */}
      {viewingDoc && (
        <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> {viewingDoc.filename}</DialogTitle>
              <DialogDescription>Raw Document Content Preview</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto mt-4 bg-zinc-950 p-4 border border-zinc-800 rounded-md">
              <pre className="text-sm whitespace-pre-wrap font-mono text-zinc-300">{viewingDoc.content}</pre>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setViewingDoc(null)} className="border-zinc-700 hover:bg-zinc-800">Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
