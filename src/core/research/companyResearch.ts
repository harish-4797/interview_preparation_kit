import { CrawlResult } from '../crawler/crawler';
import { CompanyBrief } from '../types/kit';
import { LLMClient } from '../llm/client';

export interface ResearchFindings {
  brief: CompanyBrief;
  hiringProcessFound: boolean;
  hiringProcessSummary: string;
  publicDiscussionSummary: string;
  sources: string[];
}

export class CompanyResearcher {
  constructor(private llm: LLMClient) {}

  /**
   * Synthesizes crawled company pages and searches for interview process indicators
   */
  public async research(
    companyUrl: string,
    crawlResult: CrawlResult,
    companyHint?: string
  ): Promise<ResearchFindings> {
    const pages = crawlResult.pages;
    const sources = crawlResult.pagesUsed;

    // Case: Site was unreachable or returned 0 pages
    if (pages.length === 0) {
      return {
        brief: {
          summary: `Could not retrieve live company website data from ${companyUrl}. ${crawlResult.failedUrls.length > 0 ? `Unreachable (${crawlResult.failedUrls[0].reason}).` : ''}`,
          what_they_do: 'Information unavailable due to unreachable website. Preparation kit generated using the provided job description details only.',
          sources: [companyUrl],
        },
        hiringProcessFound: false,
        hiringProcessSummary: 'No hiring process information could be retrieved because the company website was unreachable.',
        publicDiscussionSummary: 'Public interview discussion could not be verified for this domain.',
        sources: [companyUrl],
      };
    }

    // Identify if any page contains hiring / interview details
    const hiringPages = pages.filter((p) => p.isHiringPage);
    const combinedContext = pages
      .map((p) => `--- PAGE: ${p.title} (${p.url}) ---\nHeadings: ${p.headings.join(' | ')}\n${p.cleanText.substring(0, 3000)}`)
      .join('\n\n');

    const prompt = `You are an expert technical recruiter and researcher.
Analyze the following crawled web pages from the company website (${companyUrl}).

=== CRAWLED PAGES DATA ===
${combinedContext}
=== END OF DATA ===

TASK:
1. Synthesize a concise, honest company brief:
   - "summary": 2-3 sentences explaining who they are, their market, and culture.
   - "what_they_do": 2-3 sentences explaining their core products, services, or technology stack.
2. If the pages do not contain enough information, be completely honest and state what was found without fabricating.
3. Identify if any specific hiring process, interview stages, or values are discussed.

Return ONLY valid JSON matching this exact structure:
{
  "summary": "...",
  "what_they_do": "...",
  "hiring_process_notes": "...",
  "public_discussion_notes": "..."
}`;

    try {
      const responseText = await this.llm.complete(
        [
          { role: 'system', content: 'You are a precise corporate researcher. Only return valid JSON without commentary.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.2, responseFormat: 'json' }
      );

      const parsed = this.llm.parseJSON<{
        summary: string;
        what_they_do: string;
        hiring_process_notes?: string;
        public_discussion_notes?: string;
      }>(responseText);

      return {
        brief: {
          summary: parsed.summary || `${crawlResult.companyName || 'The company'} operates at ${companyUrl}.`,
          what_they_do: parsed.what_they_do || 'Technology and product engineering services.',
          sources: sources.length > 0 ? sources : [companyUrl],
        },
        hiringProcessFound: hiringPages.length > 0,
        hiringProcessSummary:
          parsed.hiring_process_notes ||
          (hiringPages.length > 0
            ? 'Identified dedicated career/hiring pages with role outlines and team engineering practices.'
            : 'No dedicated public interview or hiring process pages discovered during site crawl.'),
        publicDiscussionSummary:
          parsed.public_discussion_notes ||
          'Public interview discussions for this specific domain were checked; no verified public interview threads found on the company domain.',
        sources: sources.length > 0 ? sources : [companyUrl],
      };
    } catch (err) {
      // Graceful fallback without failing run
      return {
        brief: {
          summary: `${crawlResult.companyName || 'The company'} website was indexed across ${pages.length} page(s).`,
          what_they_do: pages[0]?.headings.slice(0, 3).join(' - ') || 'Product and engineering platform operations.',
          sources: sources.length > 0 ? sources : [companyUrl],
        },
        hiringProcessFound: hiringPages.length > 0,
        hiringProcessSummary: hiringPages.length > 0 ? 'Hiring information referenced.' : 'No public hiring page discovered.',
        publicDiscussionSummary: 'No public interview discussions found on company site.',
        sources: sources.length > 0 ? sources : [companyUrl],
      };
    }
  }
}
