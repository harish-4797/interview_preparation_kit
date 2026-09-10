import { Kit, PracticeSessionProgress, CardPracticeState } from '../types/kit';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('trao_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trao_auth_token');
      localStorage.removeItem('trao_user');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP error ${res.status}`);
  }
  return data as T;
}

export const api = {
  async register(email: string, password: string, name: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    return handleResponse<{ token: string; user: { id: string; email: string; name: string } }>(res);
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ token: string; user: { id: string; email: string; name: string } }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ user: { id: string; email: string; name: string } }>(res);
  },

  async generateKit(jd: string, company_url: string, days: number) {
    const res = await fetch(`${API_BASE}/kits/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jd, company_url, days }),
    });
    return handleResponse<{ id: string; kit: Kit; warnings: string[]; executionTimeMs: number }>(res);
  },

  async listKits() {
    const res = await fetch(`${API_BASE}/kits`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      kits: Array<{
        id: string;
        company: string;
        role: string;
        days: number;
        questionCount: number;
        flashcardCount: number;
        createdAt: string;
      }>;
    }>(res);
  },

  async getKit(id: string) {
    const res = await fetch(`${API_BASE}/kits/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ id: string; kit: Kit; practiceStates: Record<string, CardPracticeState> }>(res);
  },

  async updateKit(id: string, kit: Kit) {
    const res = await fetch(`${API_BASE}/kits/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ kit }),
    });
    return handleResponse<{ id: string; kit: Kit }>(res);
  },

  async regenerateSection(id: string, section: string) {
    const res = await fetch(`${API_BASE}/kits/${id}/regenerate-section`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ section }),
    });
    return handleResponse<{ id: string; kit: Kit; message: string }>(res);
  },

  async deleteKit(id: string) {
    const res = await fetch(`${API_BASE}/kits/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async recordCardReview(kitId: string, cardId: string, rating: 1 | 2 | 3) {
    const res = await fetch(`${API_BASE}/practice/${kitId}/record`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ cardId, rating }),
    });
    return handleResponse<{
      message: string;
      progress: PracticeSessionProgress;
      cardState: CardPracticeState;
    }>(res);
  },

  async getPracticeQueue(kitId: string) {
    const res = await fetch(`${API_BASE}/practice/${kitId}/queue`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      queue: any[];
      progress: PracticeSessionProgress;
      states: Record<string, CardPracticeState>;
    }>(res);
  },

  async evaluateMockAnswer(kitId: string, questionId: string, userAnswer: string) {
    const res = await fetch(`${API_BASE}/kits/${kitId}/mock-interview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ questionId, userAnswer }),
    });
    return handleResponse<{
      questionId: string;
      evaluation: {
        score: number;
        verdict: string;
        feedback: string;
        key_tips: string[];
      };
    }>(res);
  },
};
