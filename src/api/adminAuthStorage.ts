import { ADMIN_ROLES, type User } from '../types';

const SESSION_KEY = 'javarista-admin-session';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const adminAuthStorage = {
  saveSession(accessToken: string, refreshToken: string, user: User): void {
    const session: StoredSession = { accessToken, refreshToken, user };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  getAccessToken(): string | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const session: StoredSession = JSON.parse(raw);
      return session.accessToken ?? null;
    } catch {
      return null;
    }
  },

  getUser(): User | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const session: StoredSession = JSON.parse(raw);
      return session.user ?? null;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  isAdmin(): boolean {
    const role = this.getUser()?.role;
    return role != null && ADMIN_ROLES.includes(role);
  },
};
