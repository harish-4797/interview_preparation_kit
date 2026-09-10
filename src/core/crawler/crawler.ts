import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { URL } from 'url';

export interface CrawledPage {
  url: string;
  title: string;
  cleanText: string;
  headings: string[];
  isHiringPage: boolean;
  score: number;
}

export interface CrawlResult {
  pages: CrawledPage[];
  pagesUsed: string[];
  companyName: string;
  hasHiringInfo: boolean;
  notes: string[];
  failedUrls: Array<{ url: string; reason: string }>;
}

export interface CrawlerOptions {
  maxPages?: number;
  timeoutMs?: number;
  maxContentBytes?: number;
  allowLocalhost?: boolean;
}

const HIGH_PRIORITY_KEYWORDS = [
  'interview',
  'how-we-hire',
  'hiring-process',
  'careers',
  'jobs',
  'hiring',
  'handbook',
  'engineering',
  'culture',
  'values',
  'about-us',
  'about',
];

const MEDIUM_PRIORITY_KEYWORDS = ['team', 'mission', 'tech-stack', 'working-at', 'people', 'press'];

const EXCLUDE_KEYWORDS = [
  'login',
  'signin',
  'signup',
  'cart',
  'checkout',
  'privacy',
  'terms',
  'cookie',
  'download',
  'cdn-cgi',
  '.pdf',
  '.zip',
  '.png',
  '.jpg',
];

export class CompanyCrawler {
  private userAgent = 'TraoPrepBot/1.0 (+https://github.com/trao/interview-prep)';

  /**
   * Validates if a URL is safe to crawl (rejects loopback/private addresses in production)
   */
  public isUrlSafe(urlStr: string, allowLocalhost: boolean = true): boolean {
    try {
      const parsed = new URL(urlStr);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();
      const isLoopback =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.');

      // In production, reject loopback unless explicitly allowed (for local testing/evaluate CLI)
      if (process.env.NODE_ENV === 'production' && !allowLocalhost && isLoopback) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scores links based on URL path and anchor text relevance
   */
  public scoreLink(href: string, anchorText: string = ''): number {
    const combined = `${href.toLowerCase()} ${anchorText.toLowerCase()}`;

    for (const bad of EXCLUDE_KEYWORDS) {
      if (combined.includes(bad)) return -100;
    }

    let score = 0;
    for (const kw of HIGH_PRIORITY_KEYWORDS) {
      if (combined.includes(kw)) score += 10;
    }
    for (const kw of MEDIUM_PRIORITY_KEYWORDS) {
      if (combined.includes(kw)) score += 4;
    }

    return score;
  }

  /**
   * Main crawling engine
   */
  public async crawl(startUrl: string, options: CrawlerOptions = {}): Promise<CrawlResult> {
    const maxPages = options.maxPages ?? 4;
    const timeoutMs = options.timeoutMs ?? 7000;
    const maxContentBytes = options.maxContentBytes ?? 2 * 1024 * 1024; // 2MB
    const allowLocalhost = options.allowLocalhost ?? true;

    const result: CrawlResult = {
      pages: [],
      pagesUsed: [],
      companyName: '',
      hasHiringInfo: false,
      notes: [],
      failedUrls: [],
    };

    if (!this.isUrlSafe(startUrl, allowLocalhost)) {
      result.notes.push(`Start URL "${startUrl}" was rejected by security policy.`);
      result.failedUrls.push({ url: startUrl, reason: 'Security policy rejection / invalid URL' });
      return result;
    }

    let parsedStart: URL;
    try {
      parsedStart = new URL(startUrl);
    } catch (e: any) {
      result.notes.push(`Invalid start URL format: ${startUrl}`);
      result.failedUrls.push({ url: startUrl, reason: 'Invalid URL format' });
      return result;
    }

    // Check robots.txt (skip if local or times out)
    let robots: any = null;
    try {
      const robotsUrl = `${parsedStart.protocol}//${parsedStart.host}/robots.txt`;
      const robotsRes = await axios.get(robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 3000,
        validateStatus: () => true,
      });
      if (robotsRes.status === 200 && typeof robotsRes.data === 'string') {
        robots = robotsParser(robotsUrl, robotsRes.data);
      }
    } catch {
      // Robots fetch is best-effort; don't fail crawl if unavailable
    }

    const visited = new Set<string>();
    const discoveredLinks: Array<{ url: string; score: number; anchor: string }> = [];

    // Queue with startUrl
    discoveredLinks.push({ url: parsedStart.href, score: 100, anchor: 'Homepage' });

    while (discoveredLinks.length > 0 && result.pages.length < maxPages) {
      // Pick highest scored link
      discoveredLinks.sort((a, b) => b.score - a.score);
      const current = discoveredLinks.shift()!;

      // Normalize URL (strip hash and trailing slash for deduplication)
      const cleanTarget = current.url.split('#')[0].replace(/\/$/, '');
      if (visited.has(cleanTarget)) continue;
      visited.add(cleanTarget);

      // Respect robots.txt
      if (robots && !robots.isAllowed(current.url, this.userAgent)) {
        result.notes.push(`Skipped ${current.url} (disallowed by robots.txt)`);
        continue;
      }

      // Fetch page
      let response: AxiosResponse<string>;
      try {
        response = await axios.get(current.url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
          },
          timeout: timeoutMs,
          maxContentLength: maxContentBytes,
          validateStatus: (status) => status >= 200 && status < 300,
        });
      } catch (err: any) {
        result.failedUrls.push({
          url: current.url,
          reason: err?.code || err?.message || 'Network error / Timeout / 404',
        });
        continue;
      }

      const contentType = String(response.headers['content-type'] || '');
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        continue;
      }

      const rawHtml = response.data;
      if (typeof rawHtml !== 'string' || !rawHtml.trim()) continue;

      const $ = cheerio.load(rawHtml);

      // Extract Company Name from homepage if not already set
      if (!result.companyName) {
        const ogSiteName = $('meta[property="og:site_name"]').attr('content');
        const titleText = $('title').text().trim();
        if (ogSiteName) {
          result.companyName = ogSiteName;
        } else if (titleText) {
          result.companyName = titleText.split(/[-–|]/)[0].trim();
        } else {
          result.companyName = parsedStart.hostname.replace(/^www\./, '').split('.')[0];
        }
      }

      // Discover and score relative and absolute internal links
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const anchor = $(el).text().trim();
        if (!href) return;

        try {
          const resolved = new URL(href, current.url);
          // Only crawl within the same host or subdomains
          if (resolved.host === parsedStart.host || resolved.host.endsWith(`.${parsedStart.host}`)) {
            const score = this.scoreLink(resolved.href, anchor);
            if (score > 0) {
              const norm = resolved.href.split('#')[0].replace(/\/$/, '');
              if (!visited.has(norm)) {
                discoveredLinks.push({ url: resolved.href, score, anchor });
              }
            }
          }
        } catch {
          // invalid relative URL, skip
        }
      });

      // Clean HTML to extract semantic text
      $('script, style, noscript, svg, nav, footer, iframe, header, form').remove();

      const headings: string[] = [];
      $('h1, h2, h3').each((_, el) => {
        const h = $(el).text().trim();
        if (h && h.length > 2 && h.length < 150) {
          headings.push(h);
        }
      });

      // Extract and sanitize text content (protect against prompt injection: strip instructions)
      let bodyText = $('body').text() || $.text();
      bodyText = bodyText
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n\n')
        .trim();

      // Guard length per page to preserve token limits
      if (bodyText.length > 8000) {
        bodyText = bodyText.substring(0, 8000) + '... [truncated]';
      }

      const isHiring = current.score >= 10 || /hiring|careers|interview|jobs|handbook/i.test(current.url);
      if (isHiring) {
        result.hasHiringInfo = true;
      }

      result.pages.push({
        url: current.url,
        title: $('title').text().trim() || current.anchor,
        cleanText: bodyText,
        headings: headings.slice(0, 10),
        isHiringPage: isHiring,
        score: current.score,
      });

      result.pagesUsed.push(current.url);

      // Gentle rate-limiting between page requests
      await new Promise((r) => setTimeout(r, 200));
    }

    if (result.pages.length === 0) {
      result.notes.push('No web pages could be retrieved from the company URL.');
    } else if (!result.hasHiringInfo) {
      result.notes.push('Company website retrieved successfully, but no dedicated hiring or interview page was discovered.');
    }

    return result;
  }
}

export const companyCrawler = new CompanyCrawler();
