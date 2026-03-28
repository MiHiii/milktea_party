import { Session, Participant, OrderItem, OrderBatch, CreateSessionRequest } from './types'
import { getOrCreateDeviceId } from './identity'

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

if (!API_URL && typeof window !== 'undefined') {
  console.warn('NEXT_PUBLIC_API_URL is not defined. Falling back to localhost for development.');
}

const BASE_URL = API_URL || 'http://localhost:8080/api';
const BASE_WS = WS_URL || 'ws://localhost:8080/ws';

const DEVICE_ID_KEY = 'milkteaDeviceId'

export async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const deviceId = getOrCreateDeviceId();
  
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceId,
      ...options?.headers,
    },
  });

  // Check if server returned a new Device ID
  const newDeviceId = res.headers.get('X-Device-ID');
  if (newDeviceId && typeof window !== 'undefined') {
    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  const json = await res.json();
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  return json;
}

export const api = {
  sessions: {
    get: (id: string) => fetcher<Session>(`/sessions/${id}`),
    getBySlug: (slug: string) => fetcher<Session>(`/sessions/slug/${slug}`),
    verifyPassword: (slug: string, password: string) => 
      fetcher<{ success: boolean }>(`/sessions/slug/${slug}/verify`, { 
        method: 'POST', 
        body: JSON.stringify({ password }) 
      }),
    create: (data: CreateSessionRequest) => 
      fetcher<{session: Session, participant: Participant}>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Session>) => 
      fetcher<Session>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    listByHost: (hostDeviceId: string) => fetcher<Session[]>(`/sessions?hostDeviceId=${hostDeviceId}`),
    listByIDs: (ids: string[]) => fetcher<Session[]>(`/sessions/batch?ids=${ids.join(',')}`),
    claimHost: (slug: string, adminSecret: string, hostName: string) => 
      fetcher<{ success: boolean }>(`/sessions/slug/${slug}/claim-host`, { 
        method: 'POST', 
        body: JSON.stringify({ adminSecret, hostName }) 
      }),
  },
  participants: {
    getBySession: (sessionId: string) => fetcher<Participant[]>(`/participants/session/${sessionId}`),
    create: (data: Partial<Participant>) => fetcher<Participant>('/participants', { method: 'POST', body: JSON.stringify(data) }),
    heartbeat: (id: string) => fetcher<void>(`/participants/${id}/heartbeat`, { method: 'POST' }),
  },
  orderItems: {
    getBySession: (sessionId: string) => fetcher<OrderItem[]>(`/order-items/session/${sessionId}`),
    create: (data: Partial<OrderItem>) => fetcher<OrderItem>('/order-items', { 
      method: 'POST', 
      body: JSON.stringify(data)
    }),
    update: (id: string, data: Partial<OrderItem>) => fetcher<OrderItem>(`/order-items/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data)
    }),
    delete: (id: string) => fetcher<void>(`/order-items/${id}`, { method: 'DELETE' }),
  },
  orderBatches: {
    getBySession: (sessionId: string) => fetcher<OrderBatch[]>(`/order-batches/session/${sessionId}`),
    create: (data: Partial<OrderBatch>) => fetcher<OrderBatch>('/order-batches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<OrderBatch>) => fetcher<OrderBatch>(`/order-batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetcher<void>(`/order-batches/${id}`, { method: 'DELETE' }),
  }
};

export function createWS(sessionId: string) {
  return new WebSocket(`${BASE_WS}/${sessionId}`);
}
