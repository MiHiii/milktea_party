import { Session, Participant, OrderItem, OrderBatch } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

export async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  sessions: {
    get: (id: string) => fetcher<Session>(`/sessions/${id}`),
    getBySlug: (slug: string) => fetcher<Session>(`/sessions/slug/${slug}`),
    create: (data: Partial<Session> & { hostName: string }) => 
      fetcher<{session: Session, participant: Participant}>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Session>) => 
      fetcher<Session>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    listByHost: (hostDeviceId: string) => fetcher<Session[]>(`/sessions?hostDeviceId=${hostDeviceId}`),
    listByIDs: (ids: string[]) => fetcher<Session[]>(`/sessions/batch?ids=${ids.join(',')}`),
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
  return new WebSocket(`${WS_URL}/${sessionId}`);
}
