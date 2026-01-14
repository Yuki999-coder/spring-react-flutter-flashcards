import { Deck } from './deck';

export interface Folder {
  id: number;
  name: string;
  description: string | null;
  userId: number;
  deckCount: number;
  decks?: Deck[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
}

export interface UpdateFolderRequest {
  name: string;
  description?: string;
}
