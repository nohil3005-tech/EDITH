import { Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { userPlatforms, freelanceJobs, proposals, platformNotifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { PlatformDiscoveryService } from '../services/platform/PlatformDiscoveryService';
import { DEFAULT_USER_ID } from '../config/constants';
import { AppError } from '../middleware/errorHandler';

const db = getDatabase();
const discoveryService = new PlatformDiscoveryService();

async function simulatePlatformActivity(userId: string, platformName: string) {
  const jobId = 'sim-job-' + uuidv4().slice(0, 8);
  const proposalId = 'sim-prop-' + uuidv4().slice(0, 8);

  const title = `${platformName} Proposal Accepted: React Sidebar Sub-Panel Layout`;
  const description = `The client Nohil Bansu accepted your proposal for building a customized React sub-panel layouts workspace in EDITH. Budget: $850. Click Accept to process this task.`;

  // 1. Insert freelance job record
  await db.insert(freelanceJobs).values({
    id: jobId,
    userId,
    sourcePlatform: platformName.toLowerCase(),
    externalId: `sim-ext-${uuidv4().slice(0, 6)}`,
    title: 'React Sidebar Sub-Panel Layout',
    description: 'Construct custom React split views, collapsible side lists, and iframe loaders for connected freelancing marketplaces.',
    budgetMin: 850,
    budgetMax: 850,
    clientRating: 5.0,
    tags: ['React', 'TypeScript', 'Tailwind'],
    aiScore: 95,
    aiInsights: {
      matchScore: 95,
      strengths: ['Expert in React layouts', 'Matches custom sidebar specifications'],
      concerns: [],
      suggestedBid: 850,
      estimatedDays: 5,
      summary: 'High matching score project corresponding to customized freelance dashboard layouts.'
    },
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 2. Insert mock proposal record
  await db.insert(proposals).values({
    id: proposalId,
    userId,
    jobId,
    draftText: 'I will implement the split panel layout and full integration as requested.',
    finalText: 'I will implement the split panel layout and full integration as requested.',
    bidAmount: 850,
    deliveryDays: 5,
    portfolioItems: [],
    status: 'sent',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 3. Insert notification in platform_notifications with custom payload in external_url
  await db.insert(platformNotifications).values({
    id: uuidv4(),
    userId,
    platformAccountId: null,
    type: 'proposal',
    title,
    description,
    externalUrl: `sim-job:${jobId};sim-prop:${proposalId}`,
    isRead: false,
    createdAt: new Date().toISOString() as any,
  });

  // 4. Insert message thread notification
  await db.insert(platformNotifications).values({
    id: uuidv4(),
    userId,
    platformAccountId: null,
    type: 'message',
    title: `${platformName} Client: Nohil Bansu`,
    description: `Hi Nohil, we liked your bid. Let's start the project as soon as you can. Please deploy the prototype inside EDITH.\n\n[Me]: Sounds good! I am initializing the environment now.`,
    isRead: false,
    createdAt: new Date().toISOString() as any,
  });
}

export async function searchPlatforms(req: Request, res: Response) {
  const query = String(req.query.q || '');
  const results = await discoveryService.search(query);
  res.json({ status: 'success', data: results });
}

export async function getPopularPlatforms(req: Request, res: Response) {
  const results = await discoveryService.getPopular();
  res.json({ status: 'success', data: results });
}

export async function listUserPlatforms(req: Request, res: Response) {
  const list = await db
    .select()
    .from(userPlatforms)
    .where(eq(userPlatforms.userId, DEFAULT_USER_ID));
  res.json({ status: 'success', data: list });
}

export async function addUserPlatform(req: Request, res: Response) {
  const { name, url, iconUrl } = req.body;
  if (!name || !url) {
    throw new AppError(400, 'BAD_REQUEST', 'Platform name and URL are required');
  }

  // Max 10 validation
  const existingList = await db
    .select()
    .from(userPlatforms)
    .where(eq(userPlatforms.userId, DEFAULT_USER_ID));

  if (existingList.length >= 10) {
    throw new AppError(400, 'LIMIT_EXCEEDED', "You've reached the maximum of 10 platforms. Remove one to add a new one.");
  }

  // Check duplicate
  const isDuplicate = existingList.some(p => p.platformName.toLowerCase() === name.toLowerCase());
  if (isDuplicate) {
    throw new AppError(400, 'DUPLICATE_PLATFORM', 'This platform is already added to your dashboard');
  }

  const newPlatform = {
    id: uuidv4(),
    userId: DEFAULT_USER_ID,
    platformName: name,
    platformUrl: url,
    iconUrl: iconUrl || '🌐',
    status: 'Connected',
    lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ago',
    notificationsCount: Math.floor(Math.random() * 4) + 1, // Seed starting mock count
    messagesCount: Math.floor(Math.random() * 3) + 1,      // Seed starting mock messages
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.insert(userPlatforms).values(newPlatform);
  
  // Simulate active proposal/messages sync
  await simulatePlatformActivity(DEFAULT_USER_ID, name);
  
  res.json({ status: 'success', data: newPlatform });
}

export async function removeUserPlatform(req: Request, res: Response) {
  const { id } = req.params;
  await db
    .delete(userPlatforms)
    .where(and(eq(userPlatforms.id, id), eq(userPlatforms.userId, DEFAULT_USER_ID)));
  res.json({ status: 'success', message: 'Platform removed successfully' });
}

export async function updatePlatformSettings(req: Request, res: Response) {
  const { id } = req.params;
  const { status, notificationsCount, messagesCount, isActive } = req.body;

  const [existing] = await db
    .select()
    .from(userPlatforms)
    .where(and(eq(userPlatforms.id, id), eq(userPlatforms.userId, DEFAULT_USER_ID)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Platform not found');
  }

  const updates: Partial<typeof userPlatforms.$inferInsert> = {
    updatedAt: new Date().toISOString(),
    lastSynced: 'Just now'
  };
  if (status !== undefined) updates.status = status;
  if (notificationsCount !== undefined) updates.notificationsCount = Number(notificationsCount);
  if (messagesCount !== undefined) updates.messagesCount = Number(messagesCount);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  await db
    .update(userPlatforms)
    .set(updates)
    .where(and(eq(userPlatforms.id, id), eq(userPlatforms.userId, DEFAULT_USER_ID)));

  // Simulate active proposal/messages sync upon clicking Sync button
  await simulatePlatformActivity(DEFAULT_USER_ID, existing.platformName);

  res.json({ status: 'success', message: 'Platform settings updated successfully' });
}

export async function syncExtensionData(req: Request, res: Response) {
  const { platform, notificationsCount, messagesCount, url, simulateProposalAcceptance } = req.body;
  if (!platform) {
    throw new AppError(400, 'BAD_REQUEST', 'Platform name is required');
  }

  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();

  let [existing] = await db
    .select()
    .from(userPlatforms)
    .where(and(
      eq(userPlatforms.platformName, platformName),
      eq(userPlatforms.userId, DEFAULT_USER_ID)
    ))
    .limit(1);

  const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ago';

  if (!existing) {
    const newPlatform = {
      id: uuidv4(),
      userId: DEFAULT_USER_ID,
      platformName,
      platformUrl: url || `https://${platform.toLowerCase()}.com`,
      iconUrl: '🟢',
      status: 'Connected',
      lastSynced: syncTime,
      notificationsCount: Number(notificationsCount) || 0,
      messagesCount: Number(messagesCount) || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.insert(userPlatforms).values(newPlatform);
    existing = newPlatform as any;
  } else {
    await db
      .update(userPlatforms)
      .set({
        status: 'Connected',
        lastSynced: syncTime,
        notificationsCount: Number(notificationsCount) || 0,
        messagesCount: Number(messagesCount) || 0,
        updatedAt: new Date().toISOString()
      })
      .where(eq(userPlatforms.id, existing.id));
  }

  if (simulateProposalAcceptance) {
    await simulatePlatformActivity(DEFAULT_USER_ID, platformName);
    
    await db.insert(platformNotifications).values({
      id: uuidv4(),
      userId: DEFAULT_USER_ID,
      type: 'proposal_accepted',
      title: `${platformName} Proposal Accepted!`,
      description: `Client Nohil Bansu accepted your proposal for building a customized React sub-panel layouts workspace in EDITH. Budget: $850.`,
      externalUrl: url || `https://${platform.toLowerCase()}.com`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  res.json({ status: 'success', message: 'Platform synced via Chrome Extension Bridge successfully' });
}

export async function syncJobsFromExtension(req: Request, res: Response) {
  const { jobs } = req.body;
  if (!Array.isArray(jobs)) {
    throw new AppError(400, 'BAD_REQUEST', 'Jobs array is required');
  }

  let added = 0;
  let skipped = 0;

  const parseBudget = (budgetStr: string) => {
    if (!budgetStr) return { min: null, max: null };
    const clean = budgetStr.replace(/[^0-9\-–]/g, '');
    if (clean.includes('-') || clean.includes('–')) {
      const parts = clean.split(/[-–]/);
      return {
        min: parseInt(parts[0], 10) || null,
        max: parseInt(parts[1], 10) || null
      };
    }
    const val = parseInt(clean, 10) || null;
    return { min: val, max: val };
  };

  for (const j of jobs) {
    const sourcePlatform = (j.platform || 'upwork').toLowerCase();
    const externalId = j.externalId || uuidv4();

    const [existing] = await db
      .select({ id: freelanceJobs.id })
      .from(freelanceJobs)
      .where(and(
        eq(freelanceJobs.sourcePlatform, sourcePlatform),
        eq(freelanceJobs.externalId, externalId)
      ))
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    const { min, max } = parseBudget(j.budget);
    const aiScore = Math.floor(Math.random() * 25) + 75;
    const aiInsights = {
      matchScore: aiScore,
      strengths: ['Matches skills dynamically matched from Chrome extension'],
      concerns: [],
      suggestedBid: max || min || 500,
      estimatedDays: 3,
      summary: `This project was captured dynamically from your Chrome active session.`
    };

    await db.insert(freelanceJobs).values({
      id: uuidv4(),
      userId: DEFAULT_USER_ID,
      sourcePlatform,
      externalId,
      title: j.title || 'Untitled Job',
      description: j.description || '',
      budgetMin: min,
      budgetMax: max,
      clientRating: 4.8,
      tags: j.tags || [],
      aiScore,
      aiInsights,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    added++;
  }

  res.json({ status: 'success', added, skipped });
}
