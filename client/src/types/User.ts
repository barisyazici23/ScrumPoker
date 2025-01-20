export interface User {
  id: string;
  username: string;
  isHost: boolean;
  vote?: number | null;
} 