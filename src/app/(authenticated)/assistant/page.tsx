'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Bot, User, Send, Paperclip, Server, AlertCircle, RefreshCw, Download, MessageSquare, Trash2, UploadCloud, BrainCircuit, Loader2, StopCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { useAssistantStore, Message } from '@/lib/store/appStore';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AgentWorkspacePanel from '@/components/agent/AgentWorkspacePanel';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const { messages, setMessages, addMessage, updateMessage, clearMessages, conversationId, setConversationId, activeTaskId, setActiveTaskId } = useAssistantStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<{name: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();

  // Used to track expanded states of citations per message ID
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const toggleCitations = (msgId: string) => {
    setExpandedCitations(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchConversations();
    
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      })
      .catch(err => console.error('Failed to fetch models:', err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.assistant_active_model) {
          setSelectedModel(data.settings.assistant_active_model);
        } else if (data.settings?.default_chat_model) {
          setSelectedModel(data.settings.default_chat_model);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModelChange = (val: string | null) => {
    if (!val) return;
    setSelectedModel(val);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'assistant_active_model', value: val })
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMounted, activeTaskId, isLoading]);

  const handleClearChat = () => {
    if (isLoading) handleStopGeneration();
    clearMessages();
    setActiveTaskId(null);
  };

  const loadConversation = async (id: string) => {
    if (isLoading) handleStopGeneration();
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages(data.messages);
      }
    } catch (e) {
      console.error('Failed to load conversation', e);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (conversationId === id) {
        clearMessages();
      }
      fetchConversations();
    } catch (e) {
      console.error('Failed to delete conversation', e);
    }
  };

  const deleteAllConversations = async () => {
    if (!confirm('Are you sure you want to delete all chat history?')) return;
    try {
      await fetch('/api/conversations', { method: 'DELETE' });
      clearMessages();
      fetchConversations();
      toast({ title: 'History Cleared', description: 'All saved conversations have been deleted.' });
    } catch (e) {
      console.error('Failed to clear history', e);
      toast({ title: 'Error', description: 'Failed to clear history.', variant: 'destructive' });
    }
  };

  const exportToPDF = async () => {
    if (!chatContainerRef.current || messages.length === 0) return;
    
    try {
      const canvas = await html2canvas(chatContainerRef.current, {
        scale: 2,
        backgroundColor: '#09090b', // zinc-950 or base background color
        windowWidth: 1200
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`chat-export-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Export Successful",
        description: "Chat history downloaded as PDF.",
      });
    } catch (error) {
      console.error("PDF Export failed", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF.",
        variant: "destructive"
      });
    }
  };

  const saveMessageToDB = async (msg: Message, currentId: string | null, isInitialSync = false, msgs: Message[] = []) => {
    try {
      if (!currentId) {
        // Create new conversation
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: msg.content.substring(0, 40) + '...',
            initialMessages: isInitialSync ? msgs : [msg]
          })
        });
        if (res.ok) {
          const data = await res.json();
          setConversationId(data.id);
          fetchConversations();
          return data.id;
        }
      } else {
        // Append to existing
        if (!isInitialSync) {
            await fetch(`/api/conversations/${currentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
        }
        return currentId;
      }
    } catch (e) {
      console.error("Failed to sync message to DB", e);
    }
    return null;
  };

  // Drag and Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      toast({ title: 'Uploading Document...', description: `Processing ${file.name}` });

      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          toast({
            title: 'Document Uploaded',
            description: `${file.name} successfully uploaded and processing for knowledge base.`,
          });
          setInput((prev) => prev + `[Uploaded Document: ${file.name}] `);
        } else {
          toast({
            title: 'Upload Failed',
            description: await res.text(),
            variant: 'destructive',
          });
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred during upload.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    
    // Set up AbortController for stream cancellation
    abortControllerRef.current = new AbortController();

    let activeConversationId = conversationId;
    if (!activeConversationId && messages.length === 0) {
      activeConversationId = await saveMessageToDB(userMessage, null);
    } else {
      await saveMessageToDB(userMessage, activeConversationId);
    }

    if (agentMode) {
      // Run as Agent Workflow
      try {
        const res = await fetch('/api/agents/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'custom-agent', input: text, model: selectedModel === 'auto' ? undefined : selectedModel }),
          signal: abortControllerRef.current.signal
        });

        if (res.ok) {
          const data = await res.json();
          setActiveTaskId(data.taskId);
          
          const assistantMsg: Message = { 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: `I have started an autonomous agent workflow for your request. You can monitor its progress in the right panel. Task ID: ${data.taskId}`,
            providerInfo: 'Agent Orchestrator'
          };
          addMessage(assistantMsg);
          if (activeConversationId) await saveMessageToDB(assistantMsg, activeConversationId);
          
        } else {
          throw new Error('Failed to start agent workflow');
        }
      } catch (error: any) {
         if (error.name === 'AbortError') {
           console.log('Agent request aborted');
         } else {
           addMessage({ 
              id: crypto.randomUUID(), 
              role: 'assistant', 
              content: `Failed to start agent: ${error.message}`,
              isError: true
            });
         }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
      return;
    }

    // Standard Chat Workflow
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        model: selectedModel || undefined
      }),
      signal: abortControllerRef.current.signal
    })
      .then(async (response) => {
        if (!response.ok) {
           const data = await response.json().catch(() => ({}));
           throw new Error(data.error || 'Unable to get a response from the AI model.');
        }
        
        const providerHeader = response.headers.get('X-Provider');
        const modelHeader = response.headers.get('X-Model');
        const providerInfo = providerHeader && modelHeader ? `via ${providerHeader} (${modelHeader})` : undefined;
        
        // Parse RAG Sources
        const ragSourcesHeader = response.headers.get('X-RAG-Sources');
        let ragSources = [];
        try {
            if (ragSourcesHeader) {
                ragSources = JSON.parse(decodeURIComponent(ragSourcesHeader)) as { documentName: string; pageNumber: number; section: string; score: number }[];
            }
        } catch (e) {
            console.error("Failed to parse RAG sources", e);
        }
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const assistantMsgId = crypto.randomUUID();
        
        addMessage({ 
          id: assistantMsgId, 
          role: 'assistant', 
          content: '',
          providerInfo,
        });

        let done = false;
        let accumulatedContent = '';
        let lastUpdateTime = Date.now();
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;
            
            if (Date.now() - lastUpdateTime > 50 || done) {
              lastUpdateTime = Date.now();
              updateMessage(assistantMsgId, accumulatedContent);
            }
          }
        }
        
        updateMessage(assistantMsgId, accumulatedContent);
        
        // Format RAG sources cleanly using HTML/Markdown rather than raw text
        if (ragSources.length > 0) {
          const sourcesText = `\n\n<br/>\n\n**📚 Retrieved Knowledge Sources**\n` + 
            ragSources.map((source) => `- **${source.documentName}** (Page ${source.pageNumber}) — Relevance: ${(source.score * 100).toFixed(1)}%`).join('\n');
          accumulatedContent += sourcesText;
          updateMessage(assistantMsgId, accumulatedContent);
        }

        const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: accumulatedContent, providerInfo };
        if (activeConversationId) {
            await saveMessageToDB(assistantMsg, activeConversationId);
        }
      })
      .catch((error: Error) => {
        if (error.name === 'AbortError') {
          console.log('Stream aborted by user');
        } else {
          addMessage({ 
            id: crypto.randomUUID(), 
            role: 'assistant', 
            content: `${error.message}`,
            isError: true
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
        abortControllerRef.current = null;
      });
  };

  if (!isMounted) return null; // Avoid hydration mismatch
  
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 relative">
      {/* Sidebar for History */}
      <Card className="w-64 flex-shrink-0 flex flex-col overflow-hidden shadow-none hidden lg:flex rounded-l-none border-y-0 border-l-0 rounded-r-xl border-border">
        <div className="p-4 border-b border-border flex gap-2">
            <Button onClick={handleClearChat} variant="secondary" className="flex-1 bg-muted/50 hover:bg-muted">
                <RefreshCw className="h-4 w-4 mr-2" /> New Chat
            </Button>
            <Button onClick={deleteAllConversations} variant="outline" title="Delete all history" className="border-destructive/20 text-destructive hover:bg-destructive/10 px-3">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
        <ScrollArea className="flex-1 p-2 min-h-0 bg-background/50">
            <div className="space-y-1">
                {conversations.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground mt-6 px-4">
                        No recent history
                    </div>
                )}
                {conversations.map((conv) => (
                    <div 
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${conversationId === conv.id ? 'bg-primary/5 text-primary border-l-2 border-primary' : 'hover:bg-muted/50 text-foreground'}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <MessageSquare className={`h-4 w-4 shrink-0 ${conversationId === conv.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-sm truncate font-medium">{conv.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={(e) => deleteConversation(conv.id, e)} className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all rounded-xl border ${isDragOver ? 'border-primary bg-primary/5' : 'border-border/50 bg-background shadow-sm'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
          <div className="flex items-center justify-between p-4 shrink-0 border-b border-border bg-card/30 rounded-t-xl backdrop-blur-sm z-10">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                 AI Workbench
                 <Badge variant="outline" className="ml-2 font-normal text-xs tracking-normal bg-background/50 border-primary/20 text-primary hidden sm:inline-flex">Secure</Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Interact with local models and sovereign data.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm transition-colors hover:border-primary/50">
                <button
                  id="agent-mode"
                  type="button"
                  role="switch"
                  aria-checked={agentMode}
                  onClick={() => setAgentMode(!agentMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${agentMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${agentMode ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
                <Label htmlFor="agent-mode" onClick={() => setAgentMode(!agentMode)} className="text-sm font-medium flex items-center gap-1.5 cursor-pointer text-foreground">
                  <BrainCircuit className={`h-4 w-4 ${agentMode ? 'text-primary' : 'text-muted-foreground'}`} /> Agent
                </Label>
              </div>
              
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={messages.length === 0} className="bg-background hover:bg-muted">
                  <Download className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Export</span>
                </Button>
                <div className="flex items-center bg-background border border-border rounded-lg px-2 py-1 shadow-sm hover:border-primary/50 transition-colors">
                  <Server className="h-4 w-4 text-primary mx-2" />
                  <Select value={selectedModel} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-[180px] h-7 border-none bg-transparent focus:ring-0 text-sm font-medium">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="font-semibold text-primary">🌟 Auto (Orchestrator)</SelectItem>
                      {models.length === 0 ? (
                        <SelectItem value="default">Default Model</SelectItem>
                      ) : (
                        models.map(m => (
                          <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex-1 flex flex-col overflow-hidden min-h-0 relative`}>
            {isDragOver && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md rounded-b-xl border-2 border-primary border-dashed m-2">
                <div className="p-4 bg-primary/10 rounded-full mb-4 animate-bounce">
                  <UploadCloud className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Drop files to upload</h2>
                <p className="text-muted-foreground">Documents will be securely indexed into the Knowledge Base.</p>
              </div>
            )}
            
            <ScrollArea className="flex-1 min-h-0 relative">
              <div ref={chatContainerRef} className="p-4 sm:p-6 space-y-8 max-w-4xl mx-auto w-full">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 animate-in fade-in zoom-in duration-500">
                    <div className="p-6 bg-card border border-border rounded-full mb-6 shadow-sm">
                       <Bot className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">Sovereign AI Ready</h2>
                    <p className="max-w-md text-muted-foreground mb-8">
                      Your secure, private AI environment is online. Analyze sensitive documents, query local models, and run autonomous agents safely.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
                      <div className="bg-card hover:bg-muted/50 p-4 rounded-xl border border-border transition-colors shadow-sm">
                        <MessageSquare className="h-6 w-6 mb-3 text-primary" />
                        <h3 className="font-semibold text-foreground mb-1">Chat Safely</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Have conversations completely offline using locally hosted LLMs.</p>
                      </div>
                      <div className="bg-card hover:bg-muted/50 p-4 rounded-xl border border-border transition-colors shadow-sm">
                        <UploadCloud className="h-6 w-6 mb-3 text-emerald-500" />
                        <h3 className="font-semibold text-foreground mb-1">Analyze Documents</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Drag and drop PDFs to add them to your secure Knowledge Base.</p>
                      </div>
                      <div className="bg-card hover:bg-muted/50 p-4 rounded-xl border border-border transition-colors shadow-sm">
                        <BrainCircuit className="h-6 w-6 mb-3 text-blue-500" />
                        <h3 className="font-semibold text-foreground mb-1">Run Agents</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Enable Agent Mode for autonomous, multi-step problem solving.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 group ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    {message.role === 'assistant' && (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${message.isError ? 'bg-destructive/10 border border-destructive/20 text-destructive' : 'bg-card border border-border text-primary'}`}>
                        {message.isError ? <AlertCircle className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                      </div>
                    )}
                    
                    <div
                      className={`px-5 py-4 rounded-2xl max-w-[85%] sm:max-w-[75%] flex flex-col gap-2 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : message.isError
                          ? 'bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-sm'
                          : 'bg-card border border-border text-foreground rounded-tl-sm'
                      }`}
                    >
                      <div className={`prose prose-sm max-w-none leading-relaxed overflow-x-auto ${message.role === 'user' ? 'text-primary-foreground dark:prose-invert prose-p:text-primary-foreground prose-a:text-primary-foreground' : 'text-foreground dark:prose-invert'}`}>
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.providerInfo && (
                        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
                          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 opacity-70">
                            <Server className="h-3 w-3" /> {message.providerInfo}
                          </span>
                        </div>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-sm border border-border">
                        <User className="h-5 w-5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                  <div className="flex gap-4 justify-start animate-in fade-in duration-300">
                    <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </div>
                    <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-card border border-border flex items-center space-x-2 shadow-sm">
                       <span className="text-sm font-medium text-muted-foreground mr-1">Generating</span>
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} className="h-4" />
              </div>
            </ScrollArea>

            <div className="p-4 bg-card/80 backdrop-blur-md border-t border-border mt-auto rounded-b-xl z-10">
              <div className="max-w-4xl mx-auto relative">
                {isLoading && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleStopGeneration}
                      className="rounded-full bg-background/80 backdrop-blur-md border-border shadow-md hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all animate-in fade-in slide-in-from-bottom-2"
                    >
                      <StopCircle className="h-4 w-4 mr-2" /> Stop Generating
                    </Button>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex gap-2 items-end relative">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    title="Attach Document"
                    className="shrink-0 rounded-xl h-12 w-12 relative overflow-hidden group border-border bg-background hover:bg-muted"
                  >
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const evt = { dataTransfer: { files: e.target.files }, preventDefault: () => {} } as any;
                          handleDrop(evt);
                        }
                      }}
                    />
                    <Paperclip className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors relative z-0" />
                  </Button>
                  
                  <div className="flex-1 relative">
                    <Input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={agentMode ? "Describe the complex task for the autonomous agent..." : "Ask your private AI..."}
                      className="w-full bg-background border-border text-foreground rounded-xl px-5 py-3 h-12 shadow-sm focus-visible:ring-primary pr-14"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={isLoading || !input.trim()} 
                    className={`shrink-0 rounded-xl h-12 px-6 transition-all shadow-sm font-semibold ${agentMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary hover:bg-primary/90'}`}
                  >
                    {agentMode ? (
                       <><BrainCircuit className="h-5 w-5 sm:mr-2" /> <span className="hidden sm:inline">Run Agent</span></>
                    ) : (
                       <><Send className="h-5 w-5 sm:mr-2" /> <span className="hidden sm:inline">Send</span></>
                    )}
                  </Button>
                </form>
                <div className="text-center mt-2">
                   <p className="text-[10px] text-muted-foreground">AI responses are generated locally. Your data never leaves this environment.</p>
                </div>
              </div>
            </div>
          </div>
      </div>
      
      {/* Right Panel for Agent Workspace */}
      <AgentWorkspacePanel />
    </div>
  );
}
