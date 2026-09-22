async function login(request, email = 'user-a@example.com', password = 'Password123!') {
  const response = await request.post('/api/login', { data: { email, password } });
  return { response, body: await response.json() };
}

async function uploadDocument(request, token, filename, content) {
  const response = await request.post('/api/documents', {
    headers: { Authorization: `Bearer ${token}`, 'x-filename': filename },
    data: content
  });
  return { response, body: await response.json() };
}

async function askQuestion(request, token, question, documentIds, headers = {}, conversationId) {
  const response = await request.post('/api/questions', {
    headers: { Authorization: `Bearer ${token}`, ...headers },
    data: { question, documentIds, ...(conversationId ? { conversationId } : {}) }
  });
  return { response, body: await response.json() };
}

async function getConversation(request, token, conversationId) {
  const response = await request.get(`/api/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { response, body: await response.json() };
}

async function shareConversation(request, token, conversationId, email) {
  const response = await request.post(`/api/conversations/${conversationId}/share`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { email }
  });
  return { response, body: await response.json() };
}

async function revokeConversation(request, token, conversationId, email) {
  const response = await request.delete(`/api/conversations/${conversationId}/share`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { email }
  });
  return { response, body: await response.json() };
}

module.exports = {
  login,
  uploadDocument,
  askQuestion,
  getConversation,
  shareConversation,
  revokeConversation
};
