import request from 'supertest';
import { createApp } from '../server/app';

const app = createApp();

describe('API Integration Tests', () => {
  let authToken = '';
  let generatedKitId = '';
  const testUser = {
    name: 'Jane Doe',
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
  };

  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('Trao AI Interview Prep Kit API');
  });

  test('POST /api/auth/register creates user and returns JWT', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    authToken = res.body.token;
  });

  test('POST /api/auth/login authenticates registered user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('GET /api/auth/me returns profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });

  test('rejects unauthenticated requests to protected kit endpoints', async () => {
    const res = await request(app).get('/api/kits');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  test('POST /api/kits/generate produces valid kit', async () => {
    const res = await request(app)
      .post('/api/kits/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        jd: 'Senior Software Engineer with TypeScript and React experience.',
        company_url: 'https://example.com',
        days: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.kit).toBeDefined();
    expect(res.body.kit.schedule.days_available).toBe(3);
    expect(res.body.kit.schedule.days.length).toBe(3);
    generatedKitId = res.body.id;
  });

  test('GET /api/kits/:id retrieves user kit', async () => {
    const res = await request(app)
      .get(`/api/kits/${generatedKitId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kit.source.company_url).toBe('https://example.com');
  });

  test('POST /api/practice/:kitId/record records flashcard review', async () => {
    const res = await request(app)
      .post(`/api/practice/${generatedKitId}/record`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        cardId: 'f1',
        rating: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.progress).toBeDefined();
    expect(res.body.progress.reviewed_cards).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/practice/:kitId/queue returns practice queue', async () => {
    const res = await request(app)
      .get(`/api/practice/${generatedKitId}/queue`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.queue)).toBe(true);
    expect(res.body.progress).toBeDefined();
  });
});
