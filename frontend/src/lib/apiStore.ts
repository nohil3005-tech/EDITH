/**
 * EDITH API Store Actions
 * Store-aware API calls that sync backend data into Zustand.
 * Components use the local Zustand store for display (instant, offline-capable).
 * These functions fetch from backend and merge results back into store.
 */

import { toast } from 'sonner';
import api, { BASE, API_KEY } from './api';
import { useEdith } from './store';

const getHeuristicAccuracy = (title: string, tags: string[]) => {
  const t = (title || '').toLowerCase();
  const tg = (tags || []).map(x => x.toLowerCase());
  const isContent = t.includes('content') || t.includes('writ') || t.includes('copy') || t.includes('blog') || tg.includes('content') || tg.includes('writing');
  const isData = t.includes('data') || t.includes('excel') || t.includes('spreadsheet') || tg.includes('data') || tg.includes('automation');
  const isSEO = t.includes('seo') || t.includes('search') || t.includes('rank') || tg.includes('seo') || tg.includes('marketing');
  const isDesign = t.includes('design') || t.includes('logo') || t.includes('graphic') || t.includes('figma') || tg.includes('design') || tg.includes('branding');
  const isWebDev = t.includes('web') || t.includes('dev') || t.includes('code') || t.includes('program') || t.includes('shopify') || tg.includes('web dev') || tg.includes('react');
  if (isContent) return { score: 95, explanation: 'Excellent fit for Content Swarm agent; text generation, SEO copywriting, and tone alignment have extremely high reliability.' };
  if (isData) return { score: 92, explanation: 'Data Swarm excels at clean structured records operations, B2B parsing, and Excel formatting automation.' };
  if (isSEO) return { score: 90, explanation: 'SEO Swarm performs structured website checks, metadata optimization plans, and keyword roadmap formatting.' };
  if (isDesign) return { score: 88, explanation: 'Design Swarm operates logo vectors, layout drafts, and custom SVG constructions with high formatting compliance.' };
  if (isWebDev) return { score: 84, explanation: 'WebDev Swarm delivers boilerplate scripts, React styles, and Shopify settings. Complex custom API endpoints may require user code checks.' };
  return { score: 80, explanation: 'General task is suited for virtual assistant nodes. Complex logic execution can vary and requires operator preview.' };
};

/** Run a backend job scan and add results to local store */
export async function runBackendJobScan(
  options?: { platforms?: string[]; domains?: string[] },
): Promise<{ newJobs: number }> {
  const result = await api.freelance.scanJobs(options) as any;
  const data = result?.data;

  if (data?.jobs?.length) {
    const store = useEdith.getState();
    // Map backend job format → local store Job format
    const newLocalJobs = data.jobs.map((j: any, idx: number) => {
      const platformRaw = j.sourcePlatform ?? 'upwork';
      let platformFormatted = platformRaw.charAt(0).toUpperCase() + platformRaw.slice(1);
      if (platformRaw === 'peopleperhour') {
        platformFormatted = 'PeoplePerHour';
      } else if (platformRaw === 'freelancer') {
        platformFormatted = 'Freelancer';
      }
      const heuristic = getHeuristicAccuracy(j.title, j.tags || []);
      return {
        // Use a numeric hash for local id (store uses numeric ids)
        id: Date.now() + idx,
        title: j.title ?? 'Untitled',
        category: (j.tags?.[0] ?? 'Content').replace(/^\w/, (c: string) => c.toUpperCase()),
        budget: `$${j.budgetMin ?? 0}–$${j.budgetMax ?? 0}`,
        rating: j.clientRating ?? 4.5,
        days: 7,
        score: Math.round(j.aiScore ?? 70),
        desc: (j.description ?? '').slice(0, 200),
        tags: (j.tags ?? []).slice(0, 4).map((t: string) => `#${t}`),
        insight: (j.aiInsights as any)?.summary ?? 'AI analysis complete.',
        accuracy: Math.round((j.aiInsights as any)?.accuracyScore ?? heuristic.score),
        accuracyDetails: (j.aiInsights as any)?.accuracyExplanation ?? heuristic.explanation,
        platform: platformFormatted,
        // Store the backend UUID for API calls
        _backendId: j.id,
      };
    });
    store.addJobs(newLocalJobs as any);
    store.logActivity(`Backend scan: ${data.newJobs} new jobs found`, 'freelance');
  }

  return { newJobs: data?.newJobs ?? 0 };
}

/** Run a backend product scan */
export async function runBackendProductScan(
  options?: { sources?: string[] },
): Promise<{ newProducts: number }> {
  const result = await api.dropshipping.scanProducts(options) as any;
  const data = result?.data;
  if (data?.newProducts > 0) {
    useEdith.getState().logActivity(
      `Backend scan: ${data.newProducts} trending products discovered`,
      'drop',
    );
    toast.success(`Found ${data.newProducts} new trending products!`);
  }
  return { newProducts: data?.newProducts ?? 0 };
}

/** Generate a proposal via backend AI and add draft to local store */
export async function generateBackendProposal(
  jobId: string,
  jobTitle: string,
  tone: string = 'professional',
  cvOption: string = 'full'
): Promise<void> {
  const result = await api.freelance.generateProposal(jobId, { tone, cvOption }) as any;
  const data = result?.data;
  if (!data) return;

  const store = useEdith.getState();
  const job = store.jobs.find((j) => j._backendId === jobId);
  const platform = job?.platform ?? 'Upwork';

  store.addProposal({
    id: data.id ?? crypto.randomUUID(),
    jobId: 0, // placeholder — links via title
    client: 'Client',
    job: jobTitle,
    budget: `$${data.bidAmount ?? 0}`,
    platform,
    preview: (data.draftText ?? '').slice(0, 90),
    body: data.draftText ?? '',
    status: 'draft',
    createdAt: new Date().toISOString(),
  });

  store.logActivity(`AI proposal generated: ${jobTitle}`, 'freelance');
  toast.success('Proposal drafted — review before sending');
}

/** Validate a dropshipping product via the 5-step backend pipeline */
export async function validateBackendProduct(
  productId: string,
  productName: string,
): Promise<void> {
  await api.dropshipping.validateProduct(productId);
  useEdith.getState().logActivity(`Validation pipeline started: ${productName}`, 'drop');
  toast.success(`Validating "${productName}" — 5-step AI pipeline running`);
}

/** Check backend health */
export async function checkBackendHealth(): Promise<{
  healthy: boolean;
  checks: Record<string, unknown>;
}> {
  try {
    const result = await api.health.check() as any;
    return {
      healthy: result?.data?.status === 'healthy',
      checks: result?.data?.checks ?? {},
    };
  } catch {
    return { healthy: false, checks: {} };
  }
}

/** Sync recent backend activity into Zustand activity feed */
export async function syncDashboardActivity(): Promise<void> {
  try {
    const result = await api.dashboard.activities(10) as any;
    const rows: any[] = result?.data ?? [];
    const store = useEdith.getState();
    rows.slice(0, 5).forEach((row: any) => {
      store.logActivity(
        row.description,
        row.type?.includes('drop') ? 'drop' : 'freelance',
      );
    });
  } catch { /* silent — UI already has local activity */ }
}

/** Sync agent statuses from backend */
export async function syncAgentsFromBackend(): Promise<void> {
  try {
    const result = await api.agents.list() as any;
    const backendAgents: any[] = result?.data ?? [];
    const store = useEdith.getState();

    backendAgents.forEach((ba: any) => {
      const local = store.agents.find(
        (a) => a.name.toLowerCase().replace(/\s+/g, '-') === ba.id,
      );
      if (local && ba.status === 'paused' && !local.paused) {
        store.toggleAgent(local.name);
      }
    });
  } catch { /* silent */ }
}

/** Fetch AI cross-learning insights */
export async function getAIInsights(): Promise<unknown> {
  const result = await api.intelligence.insights() as any;
  return result?.data;
}

/** Sync freelance data (jobs, proposals, active jobs, completed jobs) from SQLite backend to Zustand store */
export async function syncFreelanceData(): Promise<void> {
  try {
    const store = useEdith.getState();

    // 1. Fetch scanned jobs from backend database
    const jobsRes = await api.freelance.listJobs('?limit=100') as any;
    let syncedJobs = [...store.jobs];
    if (jobsRes?.data && Array.isArray(jobsRes.data)) {
      syncedJobs = jobsRes.data.map((j: any, idx: number) => {
        const platformRaw = j.sourcePlatform ?? 'upwork';
        let platformFormatted = platformRaw.charAt(0).toUpperCase() + platformRaw.slice(1);
        if (platformRaw === 'peopleperhour') {
          platformFormatted = 'PeoplePerHour';
        } else if (platformRaw === 'freelancer') {
          platformFormatted = 'Freelancer';
        }
        const heuristic = getHeuristicAccuracy(j.title, j.tags || []);
        return {
          id: idx + 10000, // Unique numeric id for frontend store
          title: j.title ?? 'Untitled',
          category: (j.tags?.[0] ?? 'Content').replace(/^\w/, (c: string) => c.toUpperCase()),
          budget: `$${j.budgetMin ?? 0}–$${j.budgetMax ?? 0}`,
          rating: j.clientRating ?? 4.5,
          days: 7,
          score: Math.round(j.aiScore ?? 70),
          desc: j.description ?? '',
          tags: (j.tags ?? []).slice(0, 4).map((t: string) => `#${t}`),
          insight: (j.aiInsights as any)?.summary ?? 'AI analysis complete.',
          accuracy: Math.round((j.aiInsights as any)?.accuracyScore ?? heuristic.score),
          accuracyDetails: (j.aiInsights as any)?.accuracyExplanation ?? heuristic.explanation,
          platform: platformFormatted,
          saved: j.status === 'saved',
          dismissed: j.status === 'dismissed',
          _backendId: j.id,
        };
      });
      useEdith.setState({ jobs: syncedJobs });
    }

    // 2. Fetch proposals from backend database
    const propRes = await api.freelance.listProposals() as any;
    if (propRes?.data && Array.isArray(propRes.data)) {
      const dbProps = propRes.data.map((p: any) => {
        const matchingJob = syncedJobs.find((j) => j._backendId === p.jobId);
        return {
          id: p.id,
          jobId: matchingJob?.id ?? 0,
          client: matchingJob?.title ? matchingJob.title.split(" ").slice(-2).join(" ") : 'Client',
          job: matchingJob?.title ?? 'Freelance Project',
          budget: `$${p.bidAmount ?? 0}`,
          platform: matchingJob?.platform ?? 'Upwork',
          preview: (p.finalText || p.draftText || '').slice(0, 90),
          body: p.finalText || p.draftText || '',
          status: p.status,
          createdAt: p.createdAt,
        };
      });
      useEdith.setState({ proposals: dbProps });
    }

    // 3. Fetch active jobs from backend database
    const activeRes = await api.freelance.listActiveJobs() as any;
    if (activeRes?.data && Array.isArray(activeRes.data)) {
      const dbActive = activeRes.data
        .filter((aj: any) => {
          const parentJob = aj.parentJob;
          return !parentJob || parentJob.status !== 'completed';
        })
        .map((aj: any) => {
          const parentJob = aj.parentJob;
          const budgetVal = parseFloat(parentJob?.budgetMax || '500') || 500;
          const frontendColumn = aj.column === 'in_execution' ? 'execution'
                               : aj.column === 'qc_review' ? 'qc'
                               : aj.column === 'ready_to_deliver' ? 'ready'
                               : (aj.column ?? 'planning');
          return {
            id: aj.id,
            client: parentJob?.title ? parentJob.title.split(" ").slice(-2).join(" ") : 'Client',
            title: parentJob?.title ?? 'Freelance Project',
            budget: budgetVal,
            due: aj.updatedAt ?? new Date().toISOString(),
            status: frontendColumn,
            progress: frontendColumn === 'planning' ? 10 : frontendColumn === 'execution' ? 40 : frontendColumn === 'qc' ? 70 : frontendColumn === 'ready' ? 90 : 100,
            subtasks: aj.subtasks ?? [],
            log: [{ time: new Date(aj.createdAt).toLocaleTimeString(), text: "Active job initialized" }],
            deliveryFiles: aj.deliveryFiles ?? [],
            deliveryMessage: aj.deliveryMessage ?? '',
            qcResults: aj.qcResults ?? null,
            column: aj.column,
          };
        });
      store.setActiveJobs(dbActive);
    }

    // 4. Fetch completed jobs from backend database
    const compRes = await api.freelance.listCompleted() as any;
    if (compRes?.data && Array.isArray(compRes.data)) {
      const dbComp = compRes.data.map((cj: any) => {
        const title = cj.title ?? 'Freelance Project';
        const platformRaw = cj.sourcePlatform ?? 'upwork';
        let platformFormatted = platformRaw.charAt(0).toUpperCase() + platformRaw.slice(1);
        if (platformRaw === 'peopleperhour') {
          platformFormatted = 'PeoplePerHour';
        } else if (platformRaw === 'freelancer') {
          platformFormatted = 'Freelancer';
        }
        const domainRaw = (Array.isArray(cj.tags) ? cj.tags[0] : (cj.tags ?? 'Content')) ?? 'Content';
        const domainFormatted = String(domainRaw).charAt(0).toUpperCase() + String(domainRaw).slice(1);

        return {
          id: cj.id,
          client: title.split(" ").slice(-2).join(" ") || 'Client',
          title: title,
          amount: parseFloat(cj.budgetMax || '500') || 500,
          rating: cj.clientRating || 5,
          date: cj.updatedAt ? cj.updatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          platform: platformFormatted,
          domain: domainFormatted,
          invoiced: false,
        };
      });
      useEdith.setState({ completed: dbComp });
    }
  } catch (err) {
    console.error("Failed to sync freelance data:", err);
  }
}

/** Sync files from backend database into Zustand store */
export async function syncFilesFromBackend(): Promise<void> {
  try {
    const res = await api.files.list('?limit=1000') as any;
    if (res?.data && Array.isArray(res.data)) {
      const dbFiles = res.data.map((f: any) => ({
        id: f.id,
        name: f.originalName,
        folder: f.folder,
        mime: f.mimeType,
        size: f.sizeBytes,
        createdAt: f.createdAt,
        dataUrl: `${BASE}/files/${f.id}/download?apiKey=${API_KEY}`,
      }));
      const store = useEdith.getState();
      const uniqueFolders = Array.from(new Set([...store.folders, ...dbFiles.map(f => f.folder)]));
      useEdith.setState({ files: dbFiles, folders: uniqueFolders });
    }
  } catch (err) {
    console.error("Failed to sync files from backend:", err);
  }
}


