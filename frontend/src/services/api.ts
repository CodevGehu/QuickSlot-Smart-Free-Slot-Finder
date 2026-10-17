const API_BASE = '/api';

let csrfToken = '';

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export function getCsrfToken(): string {
  return csrfToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (csrfToken && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  // Include credentials for HttpOnly cookie session
  options.credentials = 'include';
  options.headers = headers;

  const response = await fetch(url, options);
  
  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errData.message || JSON.stringify(errData);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const data = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.csrf_token) setCsrfToken(data.csrf_token);
    return data;
  },
  getMe: () => request<any>('/auth/me'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  listDemoUsers: () => request<any[]>('/auth/users'),
  switchDemoRole: async (role: string) => {
    const data = await request<any>(`/auth/switch-demo-role?role=${role}`, { method: 'POST' });
    if (data.csrf_token) setCsrfToken(data.csrf_token);
    return data;
  },

  // Availability (Module A)
  searchAvailability: (params: Record<string, any>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    return request<any>(`/availability?${query.toString()}`);
  },

  // Teachers (Module B)
  searchTeachers: (q: string) => request<any[]>(`/teachers/search?q=${encodeURIComponent(q)}`),
  getTeacherSchedule: (teacherId: string, dayOfWeek?: number, targetDate?: string) => {
    const q = new URLSearchParams();
    if (dayOfWeek) q.append('day_of_week', String(dayOfWeek));
    if (targetDate) q.append('target_date', targetDate);
    return request<any>(`/teachers/${teacherId}/schedule?${q.toString()}`);
  },

  // Requests & Bookings (Module C)
  submitBookingRequest: (payload: any, idempotencyKey?: string) => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return request<any>('/requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  },
  getMyRequests: () => request<any[]>('/requests/mine'),
  withdrawRequest: (id: string) => request<any>(`/requests/${id}/withdraw`, { method: 'POST' }),
  getMyBookings: () => request<any[]>('/bookings/mine'),
  cancelBooking: (id: string, reason: string) => request<any>(`/bookings/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancellation_reason: reason })
  }),

  // Allocation Faculty Inbox (Module C)
  getAllocationInbox: () => request<any[]>('/allocation/inbox'),
  approveRequest: (id: string, notes?: string, idempotencyKey?: string) => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return request<any>(`/allocation/requests/${id}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes })
    });
  },
  rejectRequest: (id: string, reason: string) => request<any>(`/allocation/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejection_reason: reason })
  }),

  // Timetable Management (Module D)
  uploadTimetable: (formData: FormData) => request<any>('/timetable/upload', {
    method: 'POST',
    body: formData
  }),
  getImportJobStatus: (id: string) => request<any>(`/timetable/jobs/${id}`),
  listTimetableVersions: () => request<any[]>('/timetable/versions'),
  getVersionEntries: (versionId: string, skip = 0, limit = 100) => request<any>(`/timetable/versions/${versionId}/entries?skip=${skip}&limit=${limit}`),
  previewConflicts: (versionId: string) => request<any>(`/timetable/versions/${versionId}/preview-conflicts`, { method: 'POST' }),
  publishVersion: (versionId: string, effectiveFrom?: string, effectiveUntil?: string) => request<any>(`/timetable/versions/${versionId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ effective_from: effectiveFrom, effective_until: effectiveUntil })
  }),

  // Admin (Module D)
  getOverviewSummary: () => request<any>('/admin/overview-summary'),
  getAdminStats: () => request<any>('/admin/stats'),
  listVenues: () => request<any[]>('/admin/venues'),
  createVenue: (payload: any) => request<any>('/admin/venues', { method: 'POST', body: JSON.stringify(payload) }),
  listVenueTypes: () => request<any[]>('/admin/venue-types'),
  listAllocationAssignments: () => request<any[]>('/admin/allocation-assignments'),
  createAllocationAssignment: (payload: any) => request<any>('/admin/allocation-assignments', { method: 'POST', body: JSON.stringify(payload) }),
  listAuditLogs: () => request<any[]>('/admin/audit-logs'),

  // OS & DBMS Demonstrations
  runFCFS: (jobs?: any[]) => request<any>('/demo/fcfs', { method: 'POST', body: JSON.stringify(jobs || null) }),
  runDeadlock: (mode: 'deadlock' | 'prevent') => request<any>('/demo/deadlock', { method: 'POST', body: JSON.stringify({ mode }) }),
  runSync: (numThreads: number, increments: number, useMutex: boolean) => request<any>('/demo/sync', {
    method: 'POST',
    body: JSON.stringify({ num_threads: numThreads, increments_per_thread: increments, use_mutex: useMutex })
  }),
  runConcurrencyRace: (numCompeting: number) => request<any>(`/demo/concurrency-race?num_competing=${numCompeting}`, { method: 'POST' })
};
