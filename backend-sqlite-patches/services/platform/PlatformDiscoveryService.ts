import { logger } from '../../utils/logger';

export interface CuratedPlatform {
  name: string;
  url: string;
  description: string;
  category: string;
  iconUrl?: string;
}

export class PlatformDiscoveryService {
  private static readonly CURATED_PLATFORMS: CuratedPlatform[] = [
    { name: 'Upwork', url: 'https://upwork.com', description: 'World\'s largest marketplace matching top professionals with businesses.', category: 'General Freelance', iconUrl: '🟢' },
    { name: 'Fiverr', url: 'https://fiverr.com', description: 'Gig-based marketplace specializing in creative and digital design tasks.', category: 'Creative & Digital', iconUrl: '🟢' },
    { name: 'Freelancer', url: 'https://freelancer.com', description: 'Crowdsourced marketplace for IT, development, and engineering contracts.', category: 'Technical & Engineering', iconUrl: '⚪' },
    { name: 'Toptal', url: 'https://toptal.com', description: 'Curated marketplace for the top 3% of freelance software engineering talent.', category: 'Elite Tech', iconUrl: '⚪' },
    { name: 'Contra', url: 'https://contra.com', description: 'Commission-free workspace platform matching modern independent creators.', category: 'Modern Creative', iconUrl: '🟢' },
    { name: 'PeoplePerHour', url: 'https://peopleperhour.com', description: 'UK-based marketplace matching businesses with vetted freelance professionals.', category: 'General Freelance', iconUrl: '🟢' },
    { name: 'Guru', url: 'https://guru.com', description: 'Flexible contracting platform focusing on professional business services.', category: 'General Freelance', iconUrl: '⚪' },
    { name: '99designs', url: 'https://99designs.com', description: 'Creative custom logo, graphic, and brand identity design contests.', category: 'Design & Graphics', iconUrl: '🎨' },
    { name: 'Behance', url: 'https://behance.net', description: 'Adobe visual discovery network for showcasing creative design portfolios.', category: 'Portfolio & Creative', iconUrl: '🎨' },
    { name: 'Dribbble', url: 'https://dribbble.com', description: 'Design portfolio review and freelance designer search platform.', category: 'Portfolio & Creative', iconUrl: '🎨' },
    { name: 'LinkedIn Services', url: 'https://linkedin.com/services', description: 'Professional consulting service finder on LinkedIn business networks.', category: 'Consulting & Business', iconUrl: '💼' },
    { name: 'FlexJobs', url: 'https://flexjobs.com', description: 'Hand-screened flexible remote career jobs database.', category: 'Remote Jobs', iconUrl: '💼' },
    { name: 'SimplyHired', url: 'https://simplyhired.com', description: 'Comprehensive job board parsing remote and local freelance opportunities.', category: 'Remote Jobs', iconUrl: '💼' },
    { name: 'SolidGigs', url: 'https://solidgigs.com', description: 'Hand-picked freelance leads delivered straight to your email dashboard.', category: 'Leads Feed', iconUrl: '⚡' },
    { name: 'WriterAccess', url: 'https://writeraccess.com', description: 'Content creation marketplace matching professional writers and editors.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Textbroker', url: 'https://textbroker.com', description: 'Bulk writing marketplace offering fast custom copy and blog posts.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Scripted', url: 'https://scripted.com', description: 'Vetted copywriting service connecting elite content marketing writers.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Skyword', url: 'https://skyword.com', description: 'Enterprise-grade content marketing service and creator community hub.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'ClearVoice', url: 'https://clearvoice.com', description: 'Managed content creation workflow suite matching creative copywriters.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Constant Content', url: 'https://constant-content.com', description: 'Buy pre-written articles or order custom copy from professional writers.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Contently', url: 'https://contently.com', description: 'Content marketing hub connecting premium freelance writers and brands.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Topcoder', url: 'https://topcoder.com', description: 'Crowdsourced algorithm tournaments and software engineering contests.', category: 'Competitive Coding', iconUrl: '💻' },
    { name: 'Crossover', url: 'https://crossover.com', description: 'Full-time remote executive position search for elite tech talent.', category: 'Elite Tech', iconUrl: '💻' },
    { name: 'Turing', url: 'https://turing.com', description: 'AI-backed platform matching vetted remote developers with US companies.', category: 'Elite Tech', iconUrl: '💻' },
    { name: 'Andela', url: 'https://andela.com', description: 'Global remote engineer hiring network matching tech hubs with developers.', category: 'Elite Tech', iconUrl: '💻' },
    { name: 'Arc.dev', url: 'https://arc.dev', description: 'Remote developer hiring platform with fast vetting and match systems.', category: 'Elite Tech', iconUrl: '💻' },
    { name: 'Gun.io', url: 'https://gun.io', description: 'Exclusive hiring network for elite freelance software developers.', category: 'Elite Tech', iconUrl: '💻' },
    { name: 'Lemon.io', url: 'https://lemon.io', description: 'Matches vetted startup-ready developers with active engineering jobs.', category: 'Elite Tech', iconUrl: '💻' },
    { name: 'Codementor', url: 'https://codementor.io', description: 'Developer mentorship platform matching programming experts and learners.', category: 'Elite Tech', iconUrl: '💻' },
    { name: 'Gigster', url: 'https://gigster.com', description: 'Matches fully managed software development teams with enterprises.', category: 'Technical & Engineering', iconUrl: '💻' },
    { name: 'Freelancermap', url: 'https://freelancermap.com', description: 'European tech-focused job board for IT, development, and system experts.', category: 'Technical & Engineering', iconUrl: '💻' },
    { name: 'Twine', url: 'https://twine.net', description: 'Creative and technical freelance hub matching designers and coders.', category: 'Creative & Digital', iconUrl: '🎨' },
    { name: 'YunoJuno', url: 'https://yunojuno.com', description: 'UK creative freelance platform matching elite visual design specialists.', category: 'Creative & Digital', iconUrl: '🎨' },
    { name: 'Malt', url: 'https://malt.com', description: 'European consulting marketplace with commission protection structures.', category: 'General Freelance', iconUrl: '💼' },
    { name: 'Workana', url: 'https://workana.com', description: 'Largest freelance marketplace focusing on Latin American remote contracts.', category: 'General Freelance', iconUrl: '💼' },
    { name: 'Aquent', url: 'https://aquent.com', description: 'Premium marketing, design, and development contracting agency.', category: 'Creative & Digital', iconUrl: '🎨' },
    { name: 'Creative Circle', url: 'https://creativecircle.com', description: 'Staffing agency connecting local creative design candidates with roles.', category: 'Creative & Digital', iconUrl: '🎨' },
    { name: 'The Creative Group', url: 'https://roberthalf.com', description: 'Specialized creative staffing for visual layout and designer talent.', category: 'Creative & Digital', iconUrl: '🎨' },
    { name: 'Working Not Working', url: 'https://workingnotworking.com', description: 'Highly curated creative visual network owned by Fiverr.', category: 'Portfolio & Creative', iconUrl: '🎨' },
    { name: 'Krop', url: 'https://krop.com', description: 'Creative job board and online portfolio builder for visual designers.', category: 'Portfolio & Creative', iconUrl: '🎨' },
    { name: 'Coroflot', url: 'https://coroflot.com', description: 'Industrial and graphic visual designer portfolio showcasing network.', category: 'Portfolio & Creative', iconUrl: '🎨' },
    { name: 'DesignCrowd', url: 'https://designcrowd.com', description: 'Logo design, web design, and graphic design contests platform.', category: 'Design & Graphics', iconUrl: '🎨' },
    { name: 'Crowdspring', url: 'https://crowdspring.com', description: 'Vetted graphic design and custom housing contests platform.', category: 'Design & Graphics', iconUrl: '🎨' },
    { name: 'Hatchwise', url: 'https://hatchwise.com', description: 'Fast crowdsourced graphic designs and business logo contests.', category: 'Design & Graphics', iconUrl: '🎨' },
    { name: 'Designhill', url: 'https://designhill.com', description: 'Interactive print-on-demand store and designer logo design services.', category: 'Design & Graphics', iconUrl: '🎨' },
    { name: 'ProBlogger Jobs', url: 'https://jobs.problogger.com', description: 'Blog writing and custom copywriting job posting directory.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Freelance Writing Gigs', url: 'https://freelancewritinggigs.com', description: 'Curated daily leads list for freelance copywriting opportunities.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'JournalismJobs', url: 'https://journalismjobs.com', description: 'Largest journalism and media writing jobs directory database.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'MediaBistro', url: 'https://mediabistro.com', description: 'Job board and training courses for media and writing professionals.', category: 'Writing & Copy', iconUrl: '📝' },
    { name: 'Remote.co', url: 'https://remote.co', description: 'Hand-picked remote customer service, dev, and writing roles.', category: 'Remote Jobs', iconUrl: '💼' },
    { name: 'We Work Remotely', url: 'https://weworkremotely.com', description: 'Largest remote jobs community database for devs and designers.', category: 'Remote Jobs', iconUrl: '💼' },
    { name: 'Working Nomads', url: 'https://workingnomads.com', description: 'Curated list of professional remote jobs for digital travelers.', category: 'Remote Jobs', iconUrl: '💼' },
    { name: 'Virtual Vocations', url: 'https://virtualvocations.com', description: 'Vetted list of telecommuting work-from-home employment leads.', category: 'Remote Jobs', iconUrl: '💼' }
  ];

  async search(query: string): Promise<CuratedPlatform[]> {
    logger.info({ query }, 'Searching curated freelancer platforms database...');
    const qLower = query.toLowerCase().trim();
    if (!qLower) return [];
    
    return PlatformDiscoveryService.CURATED_PLATFORMS.filter(
      p => p.name.toLowerCase().includes(qLower) || p.description.toLowerCase().includes(qLower)
    );
  }

  async getPopular(): Promise<CuratedPlatform[]> {
    // Return first 6 popular options
    return PlatformDiscoveryService.CURATED_PLATFORMS.slice(0, 6);
  }
}
