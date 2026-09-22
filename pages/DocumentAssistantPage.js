class DocumentAssistantPage {
  constructor(page) {
    this.page = page;
    this.assistantPanel = page.locator('#assistant');
    this.documentInput = page.getByLabel('Document');
    this.uploadButton = page.getByRole('button', { name: 'Upload' });
    this.uploadStatus = page.locator('#upload-status');
    this.questionInput = page.getByLabel('Question');
    this.askButton = page.getByRole('button', { name: 'Ask' });
    this.answer = page.locator('#answer');
    this.historyItems = page.locator('#history li');
  }

  async uploadDocument(filePath) {
    await this.documentInput.setInputFiles(filePath);
    await this.uploadButton.click();
  }

  async askQuestion(question) {
    await this.questionInput.fill(question);
    await this.askButton.click();
  }
}

module.exports = { DocumentAssistantPage };
