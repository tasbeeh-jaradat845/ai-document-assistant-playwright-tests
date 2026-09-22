const { test, expect } = require('@playwright/test');
const path = require('path');
const { LoginPage } = require('../../pages/LoginPage');
const { DocumentAssistantPage } = require('../../pages/DocumentAssistantPage');

test('@smoke user signs in, uploads a document, asks a grounded question, and sees history', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const assistantPage = new DocumentAssistantPage(page);

  await loginPage.goto();
  await loginPage.login('user-a@example.com', 'Password123!');
  await expect(loginPage.loginPanel).toBeHidden();
  await expect(assistantPage.assistantPanel).toBeVisible();

  await assistantPage.uploadDocument(path.join(__dirname, '../fixtures/facts.pdf'));
  await expect(assistantPage.uploadStatus).toHaveText('Processed');

  await assistantPage.askQuestion('What is the capital of France?');
  await expect(assistantPage.answer).toContainText('Paris');
  await expect(assistantPage.historyItems).toContainText('capital of France');
});
