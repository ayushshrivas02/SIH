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
  messages: Message[];
  isLoading: boolean;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, content: string) => void;
  setMessages: (messages: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [],
  isLoading: false,
  addMessage: (msg) => set((state) => {
    const newMessages = [...state.messages, msg];
    if (typeof window !== 'undefined') {
      localStorage.setItem('assistant_chat_messages', JSON.stringify(newMessages));
    }
    return { messages: newMessages };
  }),
  updateMessage: (id, content) => set((state) => {
    const newMessages = state.messages.map((m) => (m.id === id ? { ...m, content } : m));
    if (typeof window !== 'undefined') {
      localStorage.setItem('assistant_chat_messages', JSON.stringify(newMessages));
    }
    return { messages: newMessages };
  }),
  setMessages: (messages) => set({ messages }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearMessages: () => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('assistant_chat_messages');
    }
    return { messages: [] };
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
