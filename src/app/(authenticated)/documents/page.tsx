'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, FileText, Trash2, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';
import { AnimatedGridPattern } from '@/components/ui/animated-grid';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { StatusBadge } from '@/components/ui/status-badge';

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
  
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role?.toUpperCase() || 'VIEWER';
  const canModify = userRole === 'ADMIN' || userRole === 'MANAGER';

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
    <div className="space-y-8 relative animate-in fade-in duration-700">
      <AnimatedGridPattern className="opacity-40" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-6 relative z-10 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-lg flex items-center gap-3">
             <FileText className="h-8 w-8 text-primary" /> Document Matrix
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 tracking-widest uppercase">
            Manage and process industrial knowledge artifacts.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchDocuments} className="h-10 text-xs font-bold uppercase tracking-widest bg-black/40 border-white/10 hover:bg-white/5 transition-colors text-white">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {canModify && (
            <div className="relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.txt,.csv,.docx"
              />
              <ShimmerButton className="h-10 px-6 font-bold uppercase tracking-widest text-xs bg-primary shadow-xl shadow-primary/20 w-full pointer-events-none" disabled={uploading}>
                <UploadCloud className="mr-2 h-4 w-4" /> 
                {uploading ? 'Processing...' : 'Upload Artifact'}
              </ShimmerButton>
            </div>
          )}
        </div>
      </div>

      <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-2xl relative z-10">
        <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
          <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
            <FileText className="h-4 w-4 text-cyan-400" /> Uploaded Documents
          </CardTitle>
          <CardDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Documents available for neural RAG and Agent analysis.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
               <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest">Loading Document Matrix...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <FileText className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No documents yet. Upload your first industrial artifact to begin.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/5 hover:bg-transparent bg-black/40">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Filename</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Size</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Chunks</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3">Uploaded</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-semibold flex items-center text-white/90 group-hover:text-white py-4">
                      <FileText className="mr-3 h-4 w-4 text-cyan-400" />
                      {doc.filename}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs py-4">
                      {(doc.size / 1024).toFixed(2)} KB
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs py-4">
                      {doc._count?.chunks || 0}
                    </TableCell>
                    <TableCell className="py-4">
                      {doc.status === 'READY' ? <StatusBadge status="online" text="READY" pulse={false} /> : 
                       doc.status === 'ERROR' ? <StatusBadge status="offline" text="ERROR" pulse={false} /> :
                       <StatusBadge status="processing" text={doc.status} />}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs py-4">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <Button variant="ghost" size="icon" onClick={() => handleView(doc.id)} className="text-muted-foreground hover:text-white hover:bg-white/10 transition-colors mr-2">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canModify && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-3xl border-white/10 shadow-2xl shadow-black/50">
            <DialogHeader className="border-b border-white/5 pb-4">
              <DialogTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs">
                <FileText className="h-4 w-4 text-primary"/> {viewingDoc.filename}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-medium uppercase tracking-widest text-primary/70 mt-1">Raw Document Content Preview</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto mt-4 bg-black/60 p-4 border border-white/5 rounded-xl shadow-inner">
              <pre className="text-xs whitespace-pre-wrap font-mono text-white/80 leading-relaxed">{viewingDoc.content}</pre>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setViewingDoc(null)} className="bg-black/40 border-white/10 text-white hover:bg-white/10 transition-colors uppercase tracking-widest text-xs font-bold">Close Artifact</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
