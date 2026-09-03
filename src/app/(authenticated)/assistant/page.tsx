'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Bot, User, Send, Paperclip, Server, AlertCircle, RefreshCw, Download, MessageSquare, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import { useAssistantStore, Message } from '@/lib/store/appStore';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AssistantPage() {
  const { messages, setMessages, addMessage, updateMessage, clearMessages, conversationId, setConversationId } = useAssistantStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<{name: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
  }, [messages, isMounted]);

  const handleClearChat = () => {
    clearMessages();
  };

  const loadConversation = async (id: string) => {
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

  const exportToPDF = async () => {
    if (!chatContainerRef.current || messages.length === 0) return;
    
    try {
      const canvas = await html2canvas(chatContainerRef.current, {
        scale: 2,
        backgroundColor: '#09090b', // zinc-950
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    let activeConversationId = conversationId;
    if (!activeConversationId && messages.length === 0) {
      activeConversationId = await saveMessageToDB(userMessage, null);
    } else {
      await saveMessageToDB(userMessage, activeConversationId);
    }

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        model: selectedModel || undefined
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
           const data = await response.json().catch(() => ({}));
           throw new Error(data.error || 'Unable to get a response from the AI model.');
        }
        
        const providerHeader = response.headers.get('X-Provider');
        const modelHeader = response.headers.get('X-Model');
        const providerInfo = providerHeader && modelHeader ? `via ${providerHeader} (${modelHeader})` : undefined;
        const ragSourcesHeader = response.headers.get('X-RAG-Sources');
        const ragSources = ragSourcesHeader ? JSON.parse(decodeURIComponent(ragSourcesHeader)) as { documentName: string; pageNumber: number; section: string; score: number }[] : [];
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const assistantMsgId = crypto.randomUUID();
        
        addMessage({ 
          id: assistantMsgId, 
          role: 'assistant', 
          content: '',
          providerInfo
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
        
        const sourcesText = ragSources.length ? `\n\n**Retrieved Sources**\n${ragSources.map((source) => `- ${source.documentName} — Page ${source.pageNumber}, ${source.section} (${(source.score * 100).toFixed(1)}% relevance)`).join('\n')}` : '';
        if (sourcesText) {
          accumulatedContent += sourcesText;
          updateMessage(assistantMsgId, accumulatedContent);
        }
        const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: accumulatedContent };
        if (activeConversationId) {
            await saveMessageToDB(assistantMsg, activeConversationId);
        } else {
            // Unlikely to happen due to logic above, but safety fallback
            await saveMessageToDB(assistantMsg, null, true, [userMessage, assistantMsg]);
        }
      })
      .catch((error: Error) => {
        addMessage({ 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: `${error.message}`,
          isError: true
        });
      })
      .finally(() => setIsLoading(false));
  };

  if (!isMounted) return null; // Avoid hydration mismatch
  
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar for History */}
      <Card className="w-64 flex-shrink-0 flex flex-col bg-zinc-900 border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
            <Button onClick={handleClearChat} className="w-full bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="h-4 w-4 mr-2" /> New Chat
            </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
                {conversations.length === 0 && (
                    <div className="text-center text-sm text-zinc-500 mt-4">
                        No recent chats
                    </div>
                )}
                {conversations.map((conv) => (
                    <div 
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-zinc-800 transition-colors ${conversationId === conv.id ? 'bg-zinc-800 border-l-2 border-blue-500' : ''}`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <MessageSquare className="h-4 w-4 shrink-0 text-zinc-400" />
                            <span className="text-sm truncate text-zinc-300">{conv.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={(e) => deleteConversation(conv.id, e)} className="h-6 w-6 text-zinc-500 hover:text-red-400 opacity-0 hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
              <p className="text-zinc-400">Chat with your sovereign local AI model.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF} disabled={messages.length === 0} className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white">
                <Download className="h-4 w-4 mr-2" /> Export PDF
              </Button>
              <div className="mx-2 h-6 w-px bg-zinc-800"></div>
              <Server className="h-4 w-4 text-zinc-400" />
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="auto">🌟 Auto (Orchestrator)</SelectItem>
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

          <Card className="flex-1 flex flex-col bg-zinc-900 border-zinc-800 overflow-hidden min-h-0">
            <ScrollArea className="flex-1">
              <div ref={chatContainerRef} className="p-4 space-y-6">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
                    <Bot className="h-12 w-12 mb-4 text-zinc-700" />
                    <p>Hello! I am your Sovereign AI Assistant.</p>
                    <p className="text-sm mt-2">I am running locally on your infrastructure.</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.isError ? 'bg-red-900/50' : 'bg-blue-600/20'}`}>
                        {message.isError ? <AlertCircle className="h-5 w-5 text-red-500" /> : <Bot className="h-5 w-5 text-blue-500" />}
                      </div>
                    )}
                    
                    <div
                      className={`px-4 py-3 rounded-lg max-w-[80%] flex flex-col gap-1 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.isError
                          ? 'bg-red-950/30 border border-red-900 text-red-400'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed overflow-x-auto">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.providerInfo && (
                        <span className="text-[10px] text-zinc-500 self-end mt-1 italic">
                          {message.providerInfo}
                        </span>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-zinc-300" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 bg-zinc-950 border-t border-zinc-800 mt-auto">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Button type="button" variant="outline" size="icon" className="shrink-0 bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                  <Paperclip className="h-4 w-4 text-zinc-400" />
                </Button>
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask your private AI..."
                  className="flex-1 bg-zinc-900 border-zinc-700 text-white"
                />
                <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
      </div>
    </div>
  );
}
