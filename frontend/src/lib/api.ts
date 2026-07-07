/**
 * EDITH Desktop — Frontend API Client
 *
 * In desktop mode, the backend always runs on http://localhost:3001.
 * If window.edithDesktop is available (Electron preload), we read
 * the URL from there. Otherwise fall back to localhost:3001.
 *
 * Replace your existing frontend/src/lib/api.ts with this file,
 * OR update the BASE_URL line in your existing api.ts.
 */

// Detect desktop mode
const isDesktop = typeof window !== 'undefined' && !!(window as any).edithDesktop;

export const BASE_URL = isDesktop
  ? ((window as any).edithDesktop?.apiBaseUrl ?? 'http://localhost:3001')
  : (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001');

export const API_KEY = isDesktop
  ? ((window as any).edithDesktop?.apiKey ?? 'edith-desktop-key')
  : (import.meta.env.VITE_API_KEY ?? 'edith-desktop-key');

export const BASE = `${BASE_URL}/api/v1`;

// Fallback Mock Database using LocalStorage
const MOCK_DB = {
  get(key: string, defaultVal: any) {
    if (typeof window === 'undefined') return defaultVal;
    try {
      const val = localStorage.getItem(`mock_db_${key}`);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  set(key: string, val: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`mock_db_${key}`, JSON.stringify(val));
    } catch {}
  }
};

function mockRequest(method: string, path: string, body?: any): any {
  console.warn(`⚠️ Standalone Web Mode: Backend connection unavailable. Using mock client storage for: ${method} ${path}`);
  
  const cleanPath = path.split('?')[0];

  if (cleanPath === '/dashboard/summary') {
    return {
      status: 'success',
      data: {
        earnings: { total: 4250, thisMonth: 1850 },
        freelance: { totalJobs: 14, activeJobs: 3, newJobs: 4 },
        dropshipping: { totalStores: 2, activeStores: 1 },
        invoices: { pending: 1, pendingAmount: 300 },
        agents: { totalRuns: 120, errors: 2, avgDurationMs: 450 }
      }
    };
  }

  if (cleanPath === '/dashboard/revenue-chart') {
    return {
      status: 'success',
      data: [
        { date: 'Jun 1', freelance: 400, drop: 200 },
        { date: 'Jun 2', freelance: 600, drop: 400 },
        { date: 'Jun 3', freelance: 900, drop: 500 }
      ]
    };
  }

  if (cleanPath === '/dashboard/activities') {
    return {
      status: 'success',
      data: [
        { id: 'act-001', time: '10m ago', cat: 'freelance', text: 'AI Specialist matches calculated for RAG Consulting job listing.' },
        { id: 'act-002', time: '1h ago', cat: 'dropshipping', text: 'Store synced successfully: "Fitness Swarm Shop".' }
      ]
    };
  }
  
  if (cleanPath === '/platforms/popular') {
    return {
      status: 'success',
      data: [
        { name: 'Upwork', url: 'https://upwork.com', description: 'World\'s largest marketplace matching top professionals.', category: 'General Freelance', iconUrl: '🟢' },
        { name: 'Fiverr', url: 'https://fiverr.com', description: 'Gig-based marketplace specializing in digital services.', category: 'Creative & Digital', iconUrl: '🟢' },
        { name: 'Freelancer', url: 'https://freelancer.com', description: 'IT and engineering contracts workspace.', category: 'Technical & Engineering', iconUrl: '⚪' },
        { name: 'Contra', url: 'https://contra.com', description: 'Commission-free independent workspace.', category: 'Modern Creative', iconUrl: '🟢' },
        { name: 'PeoplePerHour', url: 'https://peopleperhour.com', description: 'Vetted freelance marketplace directory.', category: 'General Freelance', iconUrl: '🟢' }
      ]
    };
  }

  if (cleanPath === '/platforms/search') {
    const q = path.includes('q=') ? decodeURIComponent(path.split('q=')[1].split('&')[0]) : '';
    const all = mockRequest('GET', '/platforms/popular').data;
    return {
      status: 'success',
      data: all.filter((p: any) => p.name.toLowerCase().includes(q.toLowerCase()))
    };
  }

  if (cleanPath === '/platforms/user') {
    const list = MOCK_DB.get('user_platforms', [
      { id: 'platform-upwork', platformName: 'Upwork', platformUrl: 'https://upwork.com', iconUrl: '🟢', status: 'Connected', notificationsCount: 3, messagesCount: 2, isActive: true, lastSynced: 'Just now' },
      { id: 'platform-fiverr', platformName: 'Fiverr', platformUrl: 'https://fiverr.com', iconUrl: '🟢', status: 'Connected', notificationsCount: 1, messagesCount: 0, isActive: true, lastSynced: '5m ago' }
    ]);
    return { status: 'success', data: list };
  }

  if (cleanPath === '/platforms/add') {
    const list = mockRequest('GET', '/platforms/user').data;
    const newPlat = {
      id: 'platform-' + Math.random().toString(36).substring(2, 9),
      platformName: body.name,
      platformUrl: body.url,
      iconUrl: body.iconUrl || '🌐',
      status: 'Connected',
      notificationsCount: Math.floor(Math.random() * 4) + 1,
      messagesCount: Math.floor(Math.random() * 3) + 1,
      isActive: true,
      lastSynced: 'Just now'
    };
    list.push(newPlat);
    MOCK_DB.set('user_platforms', list);
    
    // Also push a mock message from this platform
    const messages = mockRequest('GET', '/platform/messages').data;
    messages.push({
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      type: 'message',
      title: `${body.name} Client: Nohil Bansu`,
      description: `Hi Nohil, we liked your bid. Let's start the project as soon as you can. Please deploy the prototype inside EDITH.\n\n[Me]: Sounds good! I am initializing the environment now.`,
      createdAt: new Date().toISOString()
    });
    MOCK_DB.set('messages', messages);
    
    return { status: 'success', data: newPlat };
  }

  if (cleanPath.startsWith('/platforms/') && cleanPath.endsWith('/settings')) {
    const id = cleanPath.split('/')[2];
    const list = mockRequest('GET', '/platforms/user').data;
    const match = list.find((p: any) => p.id === id);
    if (match) {
      Object.assign(match, body);
      MOCK_DB.set('user_platforms', list);
    }
    return { status: 'success' };
  }

  if (cleanPath.startsWith('/platforms/')) {
    // Delete/Remove platform
    const id = cleanPath.split('/')[2];
    const list = mockRequest('GET', '/platforms/user').data;
    const filtered = list.filter((p: any) => p.id !== id);
    MOCK_DB.set('user_platforms', filtered);
    return { status: 'success' };
  }

  if (cleanPath === '/platform/messages') {
    return {
      status: 'success',
      data: MOCK_DB.get('messages', [
        {
          id: 'msg-001',
          type: 'message',
          title: 'Upwork Client: Nohil Bansu',
          description: "Hi Nohil, we liked your bid. Let's start the project as soon as you can. Please deploy the prototype inside EDITH.\n\n[Me]: Sounds good! I am initializing the environment now.",
          createdAt: new Date().toISOString()
        },
        {
          id: 'msg-002',
          type: 'message',
          title: 'Fiverr Client: Sarah Conner',
          description: "Hello! Can you help resolve this database delay asap? We have an urgent release tonight.\n\n[Me]: Sure, let me run the query analysis immediately.",
          createdAt: new Date().toISOString()
        }
      ])
    };
  }

  if (cleanPath.startsWith('/platform/messages/') && cleanPath.endsWith('/reply')) {
    const id = cleanPath.split('/')[3];
    const list = mockRequest('GET', '/platform/messages').data;
    const match = list.find((m: any) => m.id === id);
    if (match) {
      match.description += `\n\n[Me]: ${body.replyText}`;
      MOCK_DB.set('messages', list);
    }
    return { status: 'success', data: match };
  }

  if (cleanPath === '/freelance/jobs') {
    const list = MOCK_DB.get('jobs', [
      {
        id: 'job-001',
        sourcePlatform: 'upwork',
        externalId: 'mock-9',
        title: 'AI Consulting and RAG Pipeline Design',
        description: 'Consult on setting up an LLM-based RAG pipeline for corporate document search. Architect document indexing, vector stores, and prompt templates.',
        budgetMin: 2000,
        budgetMax: 5000,
        clientRating: 5.0,
        tags: ['AI Consulting', 'Python', 'LLM'],
        aiScore: 92,
        aiInsights: {
          matchScore: 92,
          strengths: ['High budget', 'AI stack matching'],
          concerns: [],
          suggestedBid: 3500,
          estimatedDays: 10,
          summary: 'Perfect fit'
        },
        status: 'new'
      },
      {
        id: 'job-002',
        sourcePlatform: 'upwork',
        externalId: 'mock-10',
        title: 'Shopify Store Builder & Product Importer',
        description: 'Design and build a professional Shopify drop-shipping store from scratch. Install plugins, import trending products, configure checkout, and design a custom banner.',
        budgetMin: 500,
        budgetMax: 1500,
        clientRating: 4.8,
        tags: ['Store Builder', 'Shopify', 'Web Dev'],
        aiScore: 85,
        aiInsights: {
          matchScore: 85,
          strengths: ['Matches e-commerce skills'],
          concerns: [],
          suggestedBid: 1200,
          estimatedDays: 7,
          summary: 'Good fit'
        },
        status: 'new'
      },
      {
        id: 'job-003',
        sourcePlatform: 'fiverr',
        externalId: 'mock-11',
        title: 'Blog Post Wellness Campaign',
        description: 'Write three 800-word blog posts on the benefits of daily meditation and yoga.',
        budgetMin: 150,
        budgetMax: 450,
        clientRating: 4.9,
        tags: ['Content', 'Writing', 'Blog'],
        aiScore: 88,
        aiInsights: {
          matchScore: 88,
          strengths: ['Writing domain match'],
          concerns: [],
          suggestedBid: 300,
          estimatedDays: 4,
          summary: 'Engaging writing'
        },
        status: 'new'
      }
    ]);
    return { status: 'success', data: list };
  }

  return { status: 'success', data: [] };
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('edith_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorMsg = `API error ${res.status}: ${res.statusText}`;
      try {
        const data = await res.json();
        errorMsg = data?.error?.message ?? errorMsg;
      } catch { /* ignore */ }
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes('Failed to fetch') || err.message?.includes('fetch')) {
      return mockRequest(method, path, body) as T;
    }
    throw err;
  }
}

const get  = <T>(path: string)                => request<T>('GET', path);
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
const put  = <T>(path: string, body?: unknown) => request<T>('PUT', path, body);
const del  = <T>(path: string)                => request<T>('DELETE', path);

export const api = {
  dashboard: {
    summary:      ()               => get('/dashboard/summary'),
    revenueChart: (period = '30d') => get(`/dashboard/revenue-chart?period=${period}`),
    activities:   (limit = 50)     => get(`/dashboard/activities?limit=${limit}`),
  },
  freelance: {
    scanJobs:         (body?: unknown)                 => post('/freelance/jobs/scan', body ?? {}),
    listJobs:         (params = '')                    => get(`/freelance/jobs${params}`),
    getJob:           (id: string)                     => get(`/freelance/jobs/${id}`),
    saveJob:          (id: string)                     => post(`/freelance/jobs/${id}/save`),
    dismissJob:       (id: string)                     => post(`/freelance/jobs/${id}/dismiss`),
    generateProposal: (jobId: string, body?: unknown)                  => post(`/freelance/jobs/${jobId}/proposals/generate`, body),
    listProposals:    (status?: string)                => get(`/freelance/proposals${status ? `?status=${status}` : ''}`),
    updateProposal:   (id: string, body: unknown)      => put(`/freelance/proposals/${id}`, body),
    sendProposal:     (id: string, body: unknown)      => post(`/freelance/proposals/${id}/send`, body),
    listActiveJobs:   ()                               => get('/freelance/active-jobs'),
    createActiveJob:  (body: unknown)                  => post('/freelance/active-jobs', body),
    createManualJob:  (body: unknown)                  => post('/freelance/active-jobs/manual', body),
    moveJob:          (id: string, column: string)     => put(`/freelance/active-jobs/${id}/move`, { column }),
    updateActiveJob:  (id: string, body: unknown)      => put(`/freelance/active-jobs/${id}`, body),
    executeJob:       (id: string, body: unknown)      => post(`/freelance/active-jobs/${id}/execute`, body),
    runQC:            (id: string, body?: unknown)     => post(`/freelance/active-jobs/${id}/qc`, body ?? {}),
    deliverJob:       (id: string, body: unknown)      => post(`/freelance/active-jobs/${id}/deliver`, body),
    listCompleted:    (params = '')                    => get(`/freelance/completed${params}`),
  },
  dropshipping: {
    scanProducts:        (body?: unknown)                   => post('/dropshipping/products/scan', body ?? {}),
    listProducts:        (params = '')                      => get(`/dropshipping/products${params}`),
    getProduct:          (id: string)                       => get(`/dropshipping/products/${id}`),
    validateProduct:     (id: string)                       => post(`/dropshipping/products/${id}/validate`),
    getValidationStatus: (id: string)                       => get(`/dropshipping/products/${id}/validation-status`),
    createStore:         (body: unknown)                    => post('/dropshipping/stores', body),
    listStores:          ()                                 => get('/dropshipping/stores'),
    getStore:            (id: string)                       => get(`/dropshipping/stores/${id}`),
    updateStore:         (id: string, body: unknown)        => put(`/dropshipping/stores/${id}/settings`, body),
    killStore:           (id: string)                       => post(`/dropshipping/stores/${id}/kill`),
    listAds:             (storeId: string)                  => get(`/dropshipping/stores/${storeId}/ads`),
    generateAds:         (storeId: string, body: unknown)   => post(`/dropshipping/stores/${storeId}/ads/generate`, body),
    pauseAd:             (storeId: string, adId: string)    => put(`/dropshipping/stores/${storeId}/ads/${adId}/pause`),
    resumeAd:            (storeId: string, adId: string)    => put(`/dropshipping/stores/${storeId}/ads/${adId}/resume`),
    analyticsOverview:   ()                                 => get('/dropshipping/analytics/overview'),
    storeAnalytics:      (id: string, period = '30d')       => get(`/dropshipping/analytics/${id}?period=${period}`),
  },
  payment: {
    generateInvoice:   (body: unknown)       => post('/payment/invoice/generate', body),
    sendInvoice:       (invoiceId: string)   => post('/payment/invoice/send', { invoiceId }),
    getInvoice:        (id: string)          => get(`/payment/invoice/${id}`),
    listInvoices:      (params = '')         => get(`/payment/invoices${params}`),
    markInvoicePaid:   (id: string)          => put(`/payment/invoice/${id}/mark-paid`),
    stripeCheckout:    (body: unknown)       => post('/payment/stripe/checkout', body),
    razorpayOrder:     (body: unknown)       => post('/payment/razorpay/order', body),
    getEarnings:       (period = '30d')      => get(`/payment/earnings?period=${period}`),
    freelanceEarnings: ()                    => get('/payment/earnings/freelance'),
    dsEarnings:        ()                    => get('/payment/earnings/dropshipping'),
    transactions:      (page = 1)           => get(`/payment/transactions?page=${page}`),
    payouts:           ()                    => get('/payment/payouts'),
    requestPayout:     (body: unknown)       => post('/payment/payouts/request', body),
    methods:           ()                    => get('/payment/methods'),
    createMethod:      (body: unknown)       => post('/payment/methods', body),
    reorderMethods:    (body: unknown)       => put('/payment/methods/reorder', body),
    updateMethod:      (id: string, body: unknown) => put(`/payment/methods/${id}`, body),
    deleteMethod:      (id: string)          => del(`/payment/methods/${id}`),
    setDefault:        (body: unknown)       => put('/payment/default-method', body),
  },
  files: {
    list:   (params = '')              => get(`/files${params}`),
    get:    (id: string)               => get(`/files/${id}`),
    getContent: (id: string)           => get(`/files/${id}/content`),
    editWithAI: (id: string, instruction: string) => post(`/files/${id}/edit-ai`, { instruction }),
    delete: (id: string)               => del(`/files/${id}`),
    share:  (id: string, hours = 24)   => post(`/files/${id}/share`, { expiresInHours: hours }),
    upload: async (file: File, folder = 'general') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch(`${BASE}/files/upload`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      return res.json();
    },
  },
  agents: {
    list:   ()                              => get('/agents'),
    get:    (id: string)                    => get(`/agents/${id}`),
    config: (id: string, body: unknown)     => put(`/agents/${id}/config`, body),
    logs:   (id: string, page = 1)          => get(`/agents/${id}/logs?page=${page}`),
    pause:  (id: string)                    => post(`/agents/${id}/pause`),
    resume: (id: string)                    => post(`/agents/${id}/resume`),
  },
  analytics: {
    profitLoss:       (period = '30d') => get(`/analytics/profit-loss?period=${period}`),
    agentPerformance: ()               => get('/analytics/agent-performance'),
    timeSaved:        ()               => get('/analytics/time-saved'),
    projections:      ()               => get('/analytics/projections'),
    exportReport:     (body: unknown)  => post('/analytics/export-report', body),
  },
  marketplace: {
    list:      (params = '')  => get(`/marketplace/plugins${params}`),
    get:       (id: string)   => get(`/marketplace/plugins/${id}`),
    install:   (id: string)   => post(`/marketplace/plugins/${id}/install`),
    uninstall: (id: string)   => del(`/marketplace/plugins/${id}/uninstall`),
    installed: ()             => get('/marketplace/installed'),
    toggle:    (id: string)   => put(`/marketplace/installed/${id}/toggle`),
  },
  referrals: {
    stats:    ()                    => get('/referrals/stats'),
    list:     ()                    => get('/referrals/list'),
    withdraw: (amount: number)     => post('/referrals/withdraw', { amount }),
  },
  chat: {
    sendMessage:   (body: unknown)     => post('/chat/message', body),
    listSessions:  ()                  => get('/chat/sessions'),
    getMessages:   (sessionId: string) => get(`/chat/sessions/${sessionId}/messages`),
    deleteSession: (sessionId: string) => del(`/chat/sessions/${sessionId}`),
  },
  intelligence: { insights: () => get('/intelligence/insights') },
  health:       { check:    () => get('/health') },
  auth: {
    getConfig:       ()              => get('/auth/config'),
    gate1Verify:     (password: string) => post('/auth/gate1', { password }),
    gate2Verify:     (codename: string) => post('/auth/gate2', { codename }),
    googleLogin:     (body: unknown) => post('/auth/google/login', body),
    profile:         ()              => get('/auth/profile'),
    updateProfile:   (body: unknown) => put('/auth/profile', body),
    paymentSettings: (body: unknown) => put('/auth/payment-settings', body),
    completeOnboard: ()              => post('/auth/onboarding/complete'),
    exportData:      ()              => get('/auth/export-data'),
  },
  admin: {
    listUsers:            () => get('/admin/users'),
    getUsersCount:        () => get('/admin/users/count'),
    updateUserStatus:     (userId: string, status: string) => put(`/admin/users/${userId}/status`, { status }),
    updateUserRole:       (userId: string, role: string) => put(`/admin/users/${userId}/role`, { role }),
    deleteUser:           (userId: string) => del(`/admin/users/${userId}`),
    listWhitelist:        () => get('/admin/whitelist'),
    addToWhitelist:       (email: string, role: string) => post('/admin/whitelist', { email, role }),
    removeFromWhitelist:  (email: string) => del(`/admin/whitelist/${email}`),
    getSettings:          () => get('/admin/settings'),
    updateSettings:       (settings: unknown) => put('/admin/settings', settings),
    listNotifications:    () => get('/admin/notifications'),
    markNotificationRead: (id: string) => put(`/admin/notifications/${id}/read`),
  },
  platform: {
    connect:       (body: unknown)                  => post('/platform/connect', body),
    accounts:      ()                               => get('/platform/accounts'),
    update:        (id: string, body: unknown)      => put(`/platform/${id}`, body),
    delete:        (id: string)                     => del(`/platform/${id}`),
    test:          (id: string)                     => post(`/platform/${id}/test`),
    sync:          (id: string)                     => post(`/platform/${id}/sync`),
    notifications: ()                               => get('/platform/notifications'),
    messages:      ()                               => get('/platform/messages'),
    reply:         (id: string, replyText: string)  => post(`/platform/messages/${id}/reply`, { replyText }),
  },
  processor: {
    start:         (jobId: string)                  => post(`/processor/start/${jobId}`),
    status:        (sessionId: string)              => get(`/processor/status/${sessionId}`),
    pause:         (sessionId: string)              => post(`/processor/${sessionId}/pause`),
    resume:        (sessionId: string)              => post(`/processor/${sessionId}/resume`),
    cancel:        (sessionId: string)              => post(`/processor/${sessionId}/cancel`),
    downloadUrl:   (sessionId: string)              => `${BASE}/processor/${sessionId}/download`,
  },
  notifications: {
    subscribe:     (body: unknown)                  => post('/notifications/subscribe', body),
    list:          ()                               => get('/notifications'),
  },
  platforms: {
    search:   (query: string)             => get(`/platforms/search?q=${query}`),
    popular:  ()                          => get('/platforms/popular'),
    list:     ()                          => get('/platforms/user'),
    add:      (body: unknown)             => post('/platforms/add', body),
    remove:   (id: string)                => del(`/platforms/${id}`),
    settings: (id: string, body: unknown) => put(`/platforms/${id}/settings`, body),
  },
  BASE_URL
};

export default api;
