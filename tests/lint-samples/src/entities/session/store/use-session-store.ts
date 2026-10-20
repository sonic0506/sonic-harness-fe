import { create } from 'zustand';

type Session = { userId: string; name: string };
type SessionState = { session: Session | null; signIn: (s: Session) => void; signOut: () => void };

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  signIn: (session) => set({ session }),
  signOut: () => set({ session: null }),
}));
