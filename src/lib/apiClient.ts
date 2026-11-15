import { auth } from './firebase';

let inMemoryIdToken: string | null = null;

export function setAuthTokenInMemory(token: string | null) {
  inMemoryIdToken = token;
}

export async function getFreshToken(): Promise<string | null> {
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      inMemoryIdToken = token;
      return token;
    } catch {
      return inMemoryIdToken;
    }
  }
  return inMemoryIdToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  requireAuthHeader = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (requireAuthHeader) {
    const token = await getFreshToken();
    if (!token) {
      throw new Error('Authentication required. Please sign in.');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}
