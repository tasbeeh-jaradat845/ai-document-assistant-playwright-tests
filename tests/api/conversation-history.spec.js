const { test, expect } = require('@playwright/test');
const { login, uploadDocument, askQuestion, getConversation } = require('../helpers/api-client');

test('persists previous questions and answers in conversation history', async ({ request }) => {
  const { body: auth } = await login(request);
  const upload = await uploadDocument(request, auth.token, 'facts.pdf', 'The capital of France is Paris.');
  const conversationId = `history-${Date.now()}`;

  await askQuestion(request, auth.token, 'What is the capital of France?', [upload.body.documentId], {}, conversationId);
  await askQuestion(request, auth.token, 'Who won the 2038 World Cup?', [upload.body.documentId], {}, conversationId);

  const { response, body } = await getConversation(request, auth.token, conversationId);
  expect(response.status()).toBe(200);
  expect(body.readOnly).toBe(false);
  expect(body.entries).toHaveLength(2);
  expect(body.entries[0].answer).toContain('Paris');
  expect(body.entries[1].answer).toContain('do not contain');
});
