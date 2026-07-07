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

const BASE_URL = isDesktop
  ? ((window as any).edithDesktop?.apiBaseUrl ?? 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001');

export const API_KEY = isDesktop
  ? ((window as any).edithDesktop?.apiKey ?? 'edith-desktop-key')
  : (import.meta.env.VITE_API_KEY ?? 'edith-desktop-key');

export const BASE = `${BASE_URL}/api/v1`;

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };

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
    googleLogin:     (idToken: string) => post('/auth/google/login', { idToken }),
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
};

export default api;
