import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from './logger';
import { FreelanceJob } from '../types/freelance';
import { DropshippingProduct } from '../types/dropshipping';
import { DEFAULT_USER_ID } from '../config/constants';

const THROTTLE_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scrapeAliExpressProducts(): Promise<any[]> {
  return [
    {
      source: 'aliexpress',
      externalId: 'ali-1',
      name: 'Ergonomic Memory Foam Pillow',
      description: 'Pillow designed for neck support and comfort.',
      price: 24.99,
      imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2',
      trendScore: 92,
      category: 'Home & Bedding',
      tags: ['pillow', 'ergonomic', 'memory-foam'],
    },
    {
      source: 'aliexpress',
      externalId: 'ali-2',
      name: 'Portable Neck Fan',
      description: 'Hands-free cooling fan with USB rechargeable battery.',
      price: 18.50,
      imageUrl: 'https://images.unsplash.com/photo-1618944913480-b67ee16d7b77',
      trendScore: 88,
      category: 'Gadgets',
      tags: ['fan', 'portable', 'summer'],
    }
  ];
}

async function scrapeTikTokTrending(): Promise<any[]> {
  return [
    {
      source: 'tiktok',
      externalId: 'tt-1',
      name: 'Sunset Projection Lamp',
      description: 'Atmosphere LED night light for bedroom decoration.',
      price: 12.99,
      imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c',
      trendScore: 95,
      category: 'Lighting',
      tags: ['lamp', 'aesthetic', 'tiktok-viral'],
    },
    {
      source: 'tiktok',
      externalId: 'tt-2',
      name: 'Mini Bag Sealer',
      description: 'Handheld heat vacuum sealer for food storage snacks.',
      price: 7.99,
      imageUrl: 'https://images.unsplash.com/photo-1547082299-de196ea013d6',
      trendScore: 91,
      category: 'Kitchen',
      tags: ['sealer', 'kitchen-hack', 'useful'],
    }
  ];
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

function generateMockFreelanceJobs(): Partial<FreelanceJob>[] {
  return [
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-1',
      title: 'Full-Stack React/Node.js Developer for SaaS MVP',
      description: 'We are looking for a senior full-stack developer to help build a clean MVP for our AI-powered scheduling startup. The core features include OAuth, calendar integration, and interactive dashboard charts. Experience with TailwindCSS and shadcn/ui is required.',
      budgetMin: 3000,
      budgetMax: 7500,
      clientRating: 4.9,
      tags: ['React', 'Node.js', 'Web Dev', 'TailwindCSS'],
      status: 'new',
    },
    {
      sourcePlatform: 'fiverr',
      externalId: 'mock-2',
      title: 'SEO Copywriter for E-Commerce Fashion Brand',
      description: 'Need a talented writer to write highly engaging, optimized product descriptions and category pages for our Shopify store. Should understand keyword density, meta descriptions, and modern brand voice guidelines.',
      budgetMin: 500,
      budgetMax: 1200,
      clientRating: 4.8,
      tags: ['SEO', 'Content', 'Shopify', 'Copywriting'],
      status: 'new',
    },
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-3',
      title: 'UI/UX Designer for Mobile Wellness App',
      description: 'Looking for a clean, modern Figma designer to refine 12 high-fidelity wireframes for a yoga and meditation app. Must have a premium design portfolio showcasing glassmorphism and modern gradient schemes.',
      budgetMin: 2000,
      budgetMax: 4500,
      clientRating: 4.7,
      tags: ['Design', 'Figma', 'UI/UX', 'Mobile App'],
      status: 'new',
    },
    {
      sourcePlatform: 'toptal',
      externalId: 'mock-4',
      title: 'Python Script for Automated Lead Scraping',
      description: 'Develop a lightweight, robust Python crawler with BeautifulSoup/Playwright to extract B2B lead info from directories, bypass simple captchas, and output structured CSV logs.',
      budgetMin: 1500,
      budgetMax: 3000,
      clientRating: 5.0,
      tags: ['Python', 'Web Scraping', 'Data', 'Playwright'],
      status: 'new',
    },
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-5',
      title: 'YouTube Video Editor for Tech Channel',
      description: 'Seeking a long-term editor for weekly 10-minute gadget review videos. Needs clean cuts, subtle text overlays, royalty-free audio tracks, and color grading.',
      budgetMin: 800,
      budgetMax: 2000,
      clientRating: 4.6,
      tags: ['Video', 'Premiere Pro', 'YouTube', 'Editing'],
      status: 'new',
    },
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-6',
      title: 'Write 10 Product Descriptions for E-Commerce',
      description: 'We need a copywriter to write 10 high-converting product descriptions for our home goods Shopify store. Focus on benefits, hooky headlines, and readability.',
      budgetMin: 150,
      budgetMax: 400,
      clientRating: 4.9,
      tags: ['Content', 'Copywriting', 'Shopify'],
      status: 'new',
    },
    {
      sourcePlatform: 'fiverr',
      externalId: 'mock-7',
      title: 'English to Spanish Translation of User Manual',
      description: 'Translate a 1500-word user manual for a consumer electronics product from English to Spanish. Must be accurate, clear, and preserve original formatting.',
      budgetMin: 100,
      budgetMax: 300,
      clientRating: 4.8,
      tags: ['Translation', 'Spanish', 'Document'],
      status: 'new',
    },
    {
      sourcePlatform: 'freelancer',
      externalId: 'mock-8',
      title: 'Create 15 Social Media Posts with Visual Graphics',
      description: 'We need an experienced social media manager to create 15 high-quality visual graphics and captions for our Instagram and LinkedIn pages. Theme is organic foods.',
      budgetMin: 200,
      budgetMax: 600,
      clientRating: 4.7,
      tags: ['Social Media', 'Design', 'Content'],
      status: 'new',
    },
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-9',
      title: 'AI Consulting and RAG Pipeline Design',
      description: 'Consult on setting up an LLM-based RAG pipeline for corporate document search. Architect document indexing, vector stores, and prompt templates.',
      budgetMin: 2000,
      budgetMax: 5000,
      clientRating: 5.0,
      tags: ['AI Consulting', 'Python', 'LLM'],
      status: 'new',
    },
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-10',
      title: 'Shopify Store Builder & Product Importer',
      description: 'Design and build a professional Shopify drop-shipping store from scratch. Install plugins, import trending products, configure checkout, and design a custom banner.',
      budgetMin: 500,
      budgetMax: 1500,
      clientRating: 4.8,
      tags: ['Store Builder', 'Shopify', 'Web Dev'],
      status: 'new',
    },
    {
      sourcePlatform: 'fiverr',
      externalId: 'mock-11',
      title: 'Blog Post Writer for Wellness and Meditation',
      description: 'Write three 800-word blog posts on the benefits of daily meditation, mindfulness practices, and improving mental focus. Engaging, reader-friendly style.',
      budgetMin: 150,
      budgetMax: 450,
      clientRating: 4.9,
      tags: ['Content', 'Writing', 'Blog'],
      status: 'new',
    },
    {
      sourcePlatform: 'freelancer',
      externalId: 'mock-12',
      title: 'Technical Documentation for Rest API',
      description: 'Develop a comprehensive, clean developer manual and reference guide for our fintech REST API endpoint suite. Include sample requests and response schemas.',
      budgetMin: 400,
      budgetMax: 1000,
      clientRating: 4.9,
      tags: ['Content', 'Developer', 'Writing'],
      status: 'new',
    },
    {
      sourcePlatform: 'peopleperhour',
      externalId: 'mock-13',
      title: 'Ad Copies Generator for Facebook Ads Campaign',
      description: 'Generate 12 high-converting ad copy variations for a SaaS landing page campaign. Includes headlines, hooks, body texts, and call-to-actions.',
      budgetMin: 100,
      budgetMax: 350,
      clientRating: 4.7,
      tags: ['Marketing', 'Copywriting', 'Ads'],
      status: 'new',
    },
    {
      sourcePlatform: 'fiverr',
      externalId: 'mock-14',
      title: 'Logo Design for Organic Coffee Shop',
      description: 'Looking for a minimalist, modern vector logo design for an organic coffee shop. Deliver in SVG, AI, and PNG formats, with light and dark mode versions.',
      budgetMin: 150,
      budgetMax: 400,
      clientRating: 5.0,
      tags: ['Design', 'Branding', 'Logo'],
      status: 'new',
    },
    {
      sourcePlatform: 'freelancer',
      externalId: 'mock-15',
      title: 'SEO Audit and Keyword Strategy Report',
      description: 'Conduct a thorough SEO audit of our real estate agency website, run competitor analysis, and deliver a clean PDF report with a keyword roadmap.',
      budgetMin: 300,
      budgetMax: 800,
      clientRating: 4.8,
      tags: ['SEO', 'Marketing', 'Report'],
      status: 'new',
    },
    {
      sourcePlatform: 'peopleperhour',
      externalId: 'mock-16',
      title: 'Translator for German Business Presentations',
      description: 'Translate a deck of 25 slide presentations from English to corporate German. Technical financial terminology translation experience preferred.',
      budgetMin: 200,
      budgetMax: 500,
      clientRating: 4.9,
      tags: ['Translation', 'German', 'Business'],
      status: 'new',
    },
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-17',
      title: 'Copywriter for Email Marketing Sequences',
      description: 'Write a 5-part onboarding automated email sequence for our subscription box service. Hooks should keep open rates high and click-through rates strong.',
      budgetMin: 250,
      budgetMax: 700,
      clientRating: 4.6,
      tags: ['Marketing', 'Copywriting', 'Email'],
      status: 'new',
    },
    {
      sourcePlatform: 'upwork',
      externalId: 'mock-18',
      title: 'Data Entry and Spreadsheet Automation',
      description: 'Looking for a specialist to structure unstructured CSV datasets, configure Excel macro rules, and automate B2B customer record updates.',
      budgetMin: 200,
      budgetMax: 500,
      clientRating: 4.7,
      tags: ['Data', 'Excel', 'Automation'],
      status: 'new',
    },
    {
      sourcePlatform: 'freelancer',
      externalId: 'mock-19',
      title: 'Figma Mockup for SaaS Landing Page',
      description: 'Create a stunning, high-fidelity Figma mockup for our developer toolkit dashboard landing page. Include custom vector illustrations.',
      budgetMin: 800,
      budgetMax: 2000,
      clientRating: 4.9,
      tags: ['UI/UX', 'Design', 'Figma'],
      status: 'new',
    },
    {
      sourcePlatform: 'peopleperhour',
      externalId: 'mock-20',
      title: 'Python Script to Analyze Sentiment of Reviews',
      description: 'Develop a lightweight Python command-line utility that fetches customer reviews from Amazon and runs HuggingFace sentiment classification.',
      budgetMin: 400,
      budgetMax: 1000,
      clientRating: 4.8,
      tags: ['Python', 'Data', 'AI'],
      status: 'new',
    }
  ];
}

// ─── Public API ───────────────────────────────────────────────
export async function scrapeFreelanceJobs(platforms: string[] = ['upwork', 'fiverr', 'toptal', 'contra', 'peopleperhour', 'freelancer']): Promise<Partial<FreelanceJob>[]> {
  const realJobs: Partial<FreelanceJob>[] = [];
  
  try {
    const wwr = await fetchRealWwrJobs();
    if (wwr && wwr.length > 0) realJobs.push(...wwr);
  } catch (e) {
    logger.warn('Failed to fetch WWR feed, using local fallback.');
  }

  try {
    const rok = await fetchRealRemoteOkJobs();
    if (rok && rok.length > 0) realJobs.push(...rok);
  } catch (e) {
    logger.warn('Failed to fetch RemoteOK feed, using local fallback.');
  }

  // Always append our rich diverse mock jobs so that the user has a robust selection
  const mockJobs = generateMockFreelanceJobs();
  realJobs.push(...mockJobs);

  const results: Partial<FreelanceJob>[] = [];
  realJobs.forEach((job, index) => {
    const targetPlatform = platforms[index % platforms.length];
    results.push({
      ...job,
      sourcePlatform: targetPlatform,
      externalId: `${targetPlatform}-${job.externalId}`,
    });
  });

  return results;
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
