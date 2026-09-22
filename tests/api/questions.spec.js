const { test, expect } = require('@playwright/test');
const { login, uploadDocument, askQuestion } = require('../helpers/api-client');

async function userWithDocument(request, email, filename, content) {
  const { body: auth } = await login(request, email);
  const { body: upload } = await uploadDocument(request, auth.token, filename, content);
  return { token: auth.token, documentId: upload.documentId };
}

test('returns a grounded answer and citation', async ({ request }) => {
  const user = await userWithDocument(request, 'user-a@example.com', 'facts.pdf', 'The capital of France is Paris.');
  const { response, body } = await askQuestion(request, user.token, 'What is the capital of France?', [user.documentId]);
  expect(response.status()).toBe(200);
  expect(body.answer).toContain('Paris');
  expect(body.grounded).toBe(true);
  expect(body.citations[0].documentId).toBe(user.documentId);
});

test('validates empty and oversized questions', async ({ request }) => {
  const user = await userWithDocument(request, 'user-a@example.com', 'facts.pdf', 'The capital of France is Paris.');
  expect((await askQuestion(request, user.token, '   ', [user.documentId])).response.status()).toBe(400);
  expect((await askQuestion(request, user.token, 'x'.repeat(501), [user.documentId])).response.status()).toBe(400);
});

test('returns controlled 500 error and succeeds on safe retry', async ({ request }) => {
  const user = await userWithDocument(request, 'user-a@example.com', 'facts.pdf', 'The capital of France is Paris.');
  const headers = { 'x-request-key': `retry-${Date.now()}` };
  const first = await askQuestion(request, user.token, '__fail_once', [user.documentId], headers);
  const second = await askQuestion(request, user.token, '__fail_once', [user.documentId], headers);
  expect(first.response.status()).toBe(500);
  expect(second.response.status()).toBe(200);
});
