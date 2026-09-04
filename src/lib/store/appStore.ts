import { create } from 'zustand';

// Assistant Store
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  providerInfo?: string;
  isError?: boolean;
};

interface AssistantState {
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  activeTaskId: string | null;
  setConversationId: (id: string | null) => void;
  setActiveTaskId: (id: string | null) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, content: string) => void;
  setMessages: (messages: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  conversationId: null,
  activeTaskId: null,
  messages: [],
  isLoading: false,
  setConversationId: (id) => set({ conversationId: id }),
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  addMessage: (msg) => set((state) => {
    return { messages: [...state.messages, msg] };
  }),
  updateMessage: (id, content) => set((state) => {
    return { messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)) };
  }),
  setMessages: (messages) => set({ messages }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearMessages: () => set(() => {
    return { messages: [], conversationId: null, activeTaskId: null };
  }),
}));

// Vision Store
interface VisionState {
  imagePreview: string | null;
  imageBase64: string | null;
  analyzePrompt: string;
  analyzeResult: string | null;
  analyzing: boolean;
  editPrompt: string;
  editResult: string | null;
  editing: boolean;
  
  setImagePreview: (val: string | null) => void;
  setImageBase64: (val: string | null) => void;
  setAnalyzePrompt: (val: string) => void;
  setAnalyzeResult: (val: string | null) => void;
  setAnalyzing: (val: boolean) => void;
  
  setEditPrompt: (val: string) => void;
  setEditResult: (val: string | null) => void;
  setEditing: (val: boolean) => void;
  
  clearVisionState: () => void;
}

export const useVisionStore = create<VisionState>((set) => ({
  imagePreview: null,
  imageBase64: null,
  
  analyzePrompt: 'Analyze this industrial image and identify any anomalies or defects.',
  analyzeResult: null,
  analyzing: false,
  
  editPrompt: 'Improve lighting and highlight the visible surface area.',
  editResult: null,
  editing: false,
  
  setImagePreview: (val) => set({ imagePreview: val }),
  setImageBase64: (val) => set({ imageBase64: val }),
  setAnalyzePrompt: (val) => set({ analyzePrompt: val }),
  setAnalyzeResult: (val) => set({ analyzeResult: val }),
  setAnalyzing: (val) => set({ analyzing: val }),
  
  setEditPrompt: (val) => set({ editPrompt: val }),
  setEditResult: (val) => set({ editResult: val }),
  setEditing: (val) => set({ editing: val }),
  
  clearVisionState: () => set({
    imagePreview: null,
    imageBase64: null,
    analyzeResult: null,
    editResult: null,
    analyzing: false,
    editing: false
  })
}));

// Knowledge Base Store
type RagSource = {
  chunkId: string;
  documentName: string;
  pageNumber: number;
  section: string;
  content: string;
  score: number;
};

type RagResult = { answer: string; sources: RagSource[]; grounded: boolean };

interface KnowledgeBaseState {
  ragQuery: string;
  ragResult: RagResult | null;
  selectedDatabase: string;
  setRagQuery: (val: string) => void;
  setRagResult: (val: RagResult | null) => void;
  setSelectedDatabase: (val: string) => void;
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set) => ({
  ragQuery: 'What should be checked during a routine pump inspection?',
  ragResult: null,
  selectedDatabase: 'local',
  setRagQuery: (val) => set({ ragQuery: val }),
  setRagResult: (val) => set({ ragResult: val }),
  setSelectedDatabase: (val) => set({ selectedDatabase: val }),
}));
