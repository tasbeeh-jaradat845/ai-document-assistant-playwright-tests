const { test, expect } = require('@playwright/test');
const dataset = require('../fixtures/ai-evaluation-dataset.json');
const { login, uploadDocument, askQuestion } = require('../helpers/api-client');

for (const evaluation of dataset) {
  test(`AI evaluation: ${evaluation.name}`, async ({ request }) => {
    const { body: auth } = await login(request);
    const documentIds = [];
    for (const document of evaluation.documents) {
      const { response, body } = await uploadDocument(request, auth.token, document.filename, document.content);
      expect(response.status()).toBe(201);
      expect(body.status).toBe('processed');
      documentIds.push(body.documentId);
    }

    const { response, body } = await askQuestion(request, auth.token, evaluation.question, documentIds);
    expect(response.status()).toBe(200);
    expect(body.grounded).toBe(true);
    expect(body.citations).toHaveLength(evaluation.citationCount);
    for (const requiredText of evaluation.required) expect(body.answer).toContain(requiredText);
    for (const forbiddenText of evaluation.forbidden) expect(body.answer).not.toContain(forbiddenText);
  });
}
