import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from './logger';
import { FreelanceJob } from '../types/freelance';
import { DropshippingProduct } from '../types/dropshipping';
import { DEFAULT_USER_ID } from '../config/constants';

const THROTTLE_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scrapeAliExpressProducts(): Promise<any[]> {
  return [];
}

async function scrapeTikTokTrending(): Promise<any[]> {
  return [];
}

// ─── Robots.txt cache ────────────────────────────────────────
const robotsCache = new Map<string, string>();

async function fetchRobotsTxt(baseUrl: string): Promise<string> {
  if (robotsCache.has(baseUrl)) return robotsCache.get(baseUrl)!;
  try {
    const res = await axios.get(`${baseUrl}/robots.txt`, { timeout: 5000 });
    robotsCache.set(baseUrl, res.data as string);
    return res.data as string;
  } catch {
    return '';
  }
}

function isAllowed(robotsTxt: string, path: string): boolean {
  if (!robotsTxt) return true;
  const lines = robotsTxt.split('\n');
  let inUserAgent = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('user-agent:')) {
      const agent = trimmed.split(':')[1]?.trim();
      inUserAgent = agent === '*' || agent === 'edith-bot';
    }
    if (inUserAgent && trimmed.toLowerCase().startsWith('disallow:')) {
      const disallowed = trimmed.split(':')[1]?.trim();
      if (disallowed && path.startsWith(disallowed)) return false;
    }
  }
  return true;
}

// ─── Real Freelance Scrapers ─────────────────────────────────

async function fetchRealWwrJobs(): Promise<Partial<FreelanceJob>[]> {
  try {
    const res = await axios.get('https://weworkremotely.com/remote-jobs.rss', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(res.data, { xmlMode: true });
    const jobs: Partial<FreelanceJob>[] = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').text() || 'Untitled Job';
      const link = $(el).find('link').text() || '';
      const description = $(el).find('description').text() || '';
      const category = $(el).find('category').text() || 'Web Dev';
      const guid = $(el).find('guid').text() || link;
      
      const externalId = 'wwr-' + Buffer.from(guid).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      const tags = [category.replace(/^\w/, (c) => c.toUpperCase()), 'Remote'];
      if (title.toLowerCase().includes('react')) tags.push('React');
      if (title.toLowerCase().includes('node')) tags.push('Node.js');
      if (title.toLowerCase().includes('design')) tags.push('Design');
      if (title.toLowerCase().includes('writing') || title.toLowerCase().includes('copywriter')) tags.push('Content');

      const cleanDesc = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      jobs.push({
        sourcePlatform: 'weworkremotely',
        externalId,
        title,
        description: cleanDesc.slice(0, 1000),
        budgetMin: 1200,
        budgetMax: 4500,
        clientRating: 4.8,
        tags,
        status: 'new',
      });
    });
    return jobs;
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch WWR jobs');
    return [];
  }
}

async function fetchRealRemoteOkJobs(): Promise<Partial<FreelanceJob>[]> {
  try {
    const res = await axios.get('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    const jobs: Partial<FreelanceJob>[] = [];
    const rawJobs = Array.isArray(res.data) ? res.data.slice(1) : [];
    for (const j of rawJobs) {
      if (!j.id) continue;
      const externalId = `rok-${j.id}`;
      
      const tags = Array.isArray(j.tags) ? j.tags.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)) : [];
      tags.push('Remote');

      const cleanDesc = (j.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      jobs.push({
        sourcePlatform: 'remoteok',
        externalId,
        title: j.position ?? 'Untitled Job',
        description: cleanDesc.slice(0, 1000),
        budgetMin: j.salary_min && j.salary_min > 0 ? j.salary_min : 1000,
        budgetMax: j.salary_max && j.salary_max > 0 ? j.salary_max : 3500,
        clientRating: 4.9,
        tags,
        status: 'new',
      });
    }
    return jobs;
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch RemoteOK jobs');
    return [];
  }
}

export async function scrapeFreelanceJobs(platforms?: string[]): Promise<Partial<FreelanceJob>[]> {
  const realJobs: Partial<FreelanceJob>[] = [];
  
  try {
    const wwr = await fetchRealWwrJobs();
    if (wwr && wwr.length > 0) realJobs.push(...wwr);
  } catch (e) {
    logger.warn('Failed to fetch WWR feed.');
  }

  try {
    const rok = await fetchRealRemoteOkJobs();
    if (rok && rok.length > 0) realJobs.push(...rok);
  } catch (e) {
    logger.warn('Failed to fetch RemoteOK feed.');
  }

  return realJobs;
}

export async function scrapeDropshippingProducts(sources: string[] = ['aliexpress', 'tiktok']): Promise<Partial<DropshippingProduct>[]> {
  const results: Partial<DropshippingProduct>[] = [];

  for (const source of sources) {
    try {
      if (source === 'aliexpress') {
        const products = await scrapeAliExpressProducts();
        results.push(...products);
      } else if (source === 'tiktok') {
        const products = await scrapeTikTokTrending();
        results.push(...products);
      }
      logger.info({ source, count: results.length }, 'Source scraped');
    } catch (err) {
      logger.error({ err, source }, 'Scraping error for source');
    }
  }

  return results;
}
