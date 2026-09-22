const { test, expect } = require('@playwright/test');
const { login, uploadDocument, askQuestion } = require('../helpers/api-client');

test('question API responds within two seconds', async ({ request }) => {
  const { body: auth } = await login(request);
  const upload = await uploadDocument(request, auth.token, 'facts.pdf', 'The capital of France is Paris.');
  const started = Date.now();
  const { response } = await askQuestion(request, auth.token, 'What is the capital of France?', [upload.body.documentId]);
  expect(response.status()).toBe(200);
  expect(Date.now() - started).toBeLessThan(2_000);
});

test('question API handles ten concurrent requests without errors', async ({ request }) => {
  const { body: auth } = await login(request);
  const upload = await uploadDocument(request, auth.token, 'facts.pdf', 'The capital of France is Paris.');
  const responses = await Promise.all(
    Array.from({ length: 10 }, () => askQuestion(request, auth.token, 'What is the capital of France?', [upload.body.documentId]))
  );
  for (const result of responses) expect(result.response.status()).toBe(200);
});
