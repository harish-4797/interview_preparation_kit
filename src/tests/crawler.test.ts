import { CompanyCrawler } from '../core/crawler/crawler';

describe('CompanyCrawler', () => {
  const crawler = new CompanyCrawler();

  test('correctly scores and ranks career, hiring, and handbook links higher than generic pages', () => {
    const hiringScore = crawler.scoreLink('/company/how-we-hire', 'How We Hire');
    const handbookScore = crawler.scoreLink('/handbook/engineering', 'Engineering Handbook');
    const careersScore = crawler.scoreLink('/careers', 'Join our team');
    const termsScore = crawler.scoreLink('/terms-of-service', 'Terms of Service');
    const loginScore = crawler.scoreLink('/login', 'Customer Login');

    expect(hiringScore).toBeGreaterThan(0);
    expect(handbookScore).toBeGreaterThan(0);
    expect(careersScore).toBeGreaterThan(0);
    expect(termsScore).toBeLessThan(0); // Excluded
    expect(loginScore).toBeLessThan(0); // Excluded

    expect(hiringScore).toBeGreaterThan(crawler.scoreLink('/press', 'Press releases'));
  });

  test('validates safe URLs and rejects non-http protocols', () => {
    expect(crawler.isUrlSafe('https://example.com')).toBe(true);
    expect(crawler.isUrlSafe('http://localhost:8099/acme/', true)).toBe(true);
    expect(crawler.isUrlSafe('ftp://example.com')).toBe(false);
    expect(crawler.isUrlSafe('javascript:alert(1)')).toBe(false);
    expect(crawler.isUrlSafe('invalid-url-string')).toBe(false);
  });

  test('handles 404 or unreachable URLs gracefully without throwing', async () => {
    const result = await crawler.crawl('http://localhost:99999/non-existent-site', {
      timeoutMs: 1000,
      maxPages: 1,
    });

    expect(result.pages).toHaveLength(0);
    expect(result.failedUrls.length).toBeGreaterThan(0);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});
