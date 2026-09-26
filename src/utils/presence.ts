import { Session } from '../types';

export interface PresenceUser {
  id: string;
  role: 'admin' | 'associate';
  name: string;
  phone?: string;
  lastSeen: number;
  loginTime: number;
}

export async function sendPresenceHeartbeat(session: Session): Promise<boolean> {
  if (!session) return false;
  try {
    const res = await fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: session.id || 'admin',
        role: session.role,
        name: session.name,
        phone: session.phone || '',
      }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function sendPresenceLogout(session: Session): Promise<boolean> {
  if (!session) return false;
  try {
    const res = await fetch('/api/presence/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: session.id || 'admin',
      }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchOnlineUsers(): Promise<PresenceUser[]> {
  try {
    const res = await fetch('/api/presence', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.onlineUsers)) {
        return data.onlineUsers;
      }
    }
  } catch (err) {
    console.warn('Could not fetch presence:', err);
  }
  return [];
}
