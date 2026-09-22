const { test, expect } = require('@playwright/test');
const { login, uploadDocument } = require('../helpers/api-client');

test('authenticates with valid credentials', async ({ request }) => {
  const { response, body } = await login(request);
  expect(response.status()).toBe(200);
  expect(body.token).toBeTruthy();
});

test('rejects invalid credentials without exposing details', async ({ request }) => {
  const { response, body } = await login(request, 'user-a@example.com', 'wrong');
  expect(response.status()).toBe(401);
  expect(body.error).toBe('Invalid credentials');
  expect(JSON.stringify(body)).not.toContain('Password123!');
});

test('accepts PDF and DOCX but rejects unsupported files', async ({ request }) => {
  const { body: auth } = await login(request);
  for (const filename of ['policy.pdf', 'policy.docx']) {
    const { response, body } = await uploadDocument(request, auth.token, filename, 'The capital of France is Paris.');
    expect(response.status()).toBe(201);
    expect(body.status).toBe('processed');
  }
  const { response, body } = await uploadDocument(request, auth.token, 'payload.exe', 'unsafe');
  expect(response.status()).toBe(415);
  expect(body.error).toContain('PDF and DOCX');
});

test('requires authentication for document upload', async ({ request }) => {
  const response = await request.post('/api/documents', { headers: { 'x-filename': 'policy.pdf' }, data: 'content' });
  expect(response.status()).toBe(401);
});
