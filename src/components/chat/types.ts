export type MemorySuggestion = {
  title: string;
  content: string;
  state?: 'idle' | 'saving' | 'saved';
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  highlights?: string[];
  imageUrl?: string;
  memorySuggestion?: MemorySuggestion | null;
};

export type SelectedImage = {
  dataUrl: string;
  mimeType: string;
};

export type SyncStatus = 'idle' | 'syncing' | 'ready' | 'error';
