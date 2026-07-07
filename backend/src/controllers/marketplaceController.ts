/**
 * EDITH Desktop — Marketplace Controller (SQLite)
 */

import { Response } from 'express';
import { eq, and, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { getDatabase } from '../config/database';
import { marketplacePlugins, installedPlugins } from '../db/schema';
import { successResponse, errorResponse, paginationMeta } from '../types/api';
import { DEFAULT_USER_ID } from '../config/constants';

const db = getDatabase();

export async function listPlugins(req: AuthRequest, res: Response): Promise<void> {
  const { category, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = parseInt(page), limitNum = parseInt(limit);
  const offset  = (pageNum - 1) * limitNum;

  const all = await db.select().from(marketplacePlugins);

  let filtered = all;
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (search)   filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  filtered.sort((a, b) => b.installs - a.installs);

  const rows = filtered.slice(offset, offset + limitNum);
  res.json(successResponse(rows, paginationMeta(pageNum, limitNum, filtered.length)));
}

export async function getPlugin(req: AuthRequest, res: Response): Promise<void> {
  const [plugin] = await db
    .select()
    .from(marketplacePlugins)
    .where(eq(marketplacePlugins.id, req.params.id))
    .limit(1);
  if (!plugin) { res.status(404).json(errorResponse('NOT_FOUND', 'Plugin not found')); return; }
  res.json(successResponse(plugin));
}

export async function installPlugin(req: AuthRequest, res: Response): Promise<void> {
  const [plugin] = await db
    .select()
    .from(marketplacePlugins)
    .where(eq(marketplacePlugins.id, req.params.id))
    .limit(1);
  if (!plugin) { res.status(404).json(errorResponse('NOT_FOUND', 'Plugin not found')); return; }

  const [existing] = await db
    .select()
    .from(installedPlugins)
    .where(and(eq(installedPlugins.userId, DEFAULT_USER_ID), eq(installedPlugins.pluginId, req.params.id)))
    .limit(1);
  if (existing) { res.status(409).json(errorResponse('ALREADY_INSTALLED', 'Plugin already installed')); return; }

  const [installed] = await db
    .insert(installedPlugins)
    .values({
      id:       uuidv4(),
      userId:   DEFAULT_USER_ID,
      pluginId: req.params.id,
      enabled:  'true',
      config:   req.body?.config ?? {},
    } as any)
    .returning();

  // Increment install count
  await db.update(marketplacePlugins)
    .set({ installs: plugin.installs + 1 } as any)
    .where(eq(marketplacePlugins.id, req.params.id));

  res.status(201).json(successResponse(installed));
}

export async function uninstallPlugin(req: AuthRequest, res: Response): Promise<void> {
  const existing = await db
    .select()
    .from(installedPlugins)
    .where(and(eq(installedPlugins.userId, DEFAULT_USER_ID), eq(installedPlugins.pluginId, req.params.id)));

  if (!existing.length) { res.status(404).json(errorResponse('NOT_INSTALLED', 'Plugin not installed')); return; }
  await db.delete(installedPlugins)
    .where(and(eq(installedPlugins.userId, DEFAULT_USER_ID), eq(installedPlugins.pluginId, req.params.id)));
  res.json(successResponse({ uninstalled: true }));
}

export async function listInstalled(_req: AuthRequest, res: Response): Promise<void> {
  const installed = await db
    .select()
    .from(installedPlugins)
    .where(eq(installedPlugins.userId, DEFAULT_USER_ID));

  const plugins = await db.select().from(marketplacePlugins);
  const pluginMap = new Map(plugins.map((p) => [p.id, p]));

  const rows = installed.map((i) => ({
    id:          i.id,
    pluginId:    i.pluginId,
    enabled:     i.enabled,
    config:      i.config,
    installedAt: i.installedAt,
    ...pluginMap.get(i.pluginId),
  }));

  res.json(successResponse(rows));
}

export async function togglePlugin(req: AuthRequest, res: Response): Promise<void> {
  const [existing] = await db
    .select()
    .from(installedPlugins)
    .where(and(eq(installedPlugins.userId, DEFAULT_USER_ID), eq(installedPlugins.id, req.params.id)))
    .limit(1);
  if (!existing) { res.status(404).json(errorResponse('NOT_FOUND', 'Installed plugin not found')); return; }

  const newState = existing.enabled === 'true' ? 'false' : 'true';
  const [updated] = await db
    .update(installedPlugins)
    .set({ enabled: newState } as any)
    .where(eq(installedPlugins.id, req.params.id))
    .returning();

  res.json(successResponse(updated));
}
