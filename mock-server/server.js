const http = require('http');
const PORT = Number(process.env.PORT || 3100);
const users = new Map([
  ['user-a@example.com', { password: 'Password123!', id: 'user-a', token: 'token-user-a' }],
  ['user-b@example.com', { password: 'Password123!', id: 'user-b', token: 'token-user-b' }]
]);
const documents = new Map();
const conversations = new Map();
const transientFailures = new Set();
let nextDocumentId = 1;

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2_000_000) reject(new Error('Request too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function authenticatedUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return [...users.values()].find(user => user.token === token);
}

function renderApp() {
  return `<!doctype html>
  <html><head><meta charset="utf-8"><title>Document Assistant</title></head>
  <body>
    <main>
      <h1>AI Document Assistant</h1>
      <section id="login-panel">
        <input id="email" aria-label="Email" value="user-a@example.com">
        <input id="password" aria-label="Password" type="password" value="Password123!">
        <button id="login">Sign in</button>
      </section>
      <section id="assistant" hidden>
        <input id="file" aria-label="Document" type="file" accept=".pdf,.docx">
        <button id="upload">Upload</button><p id="upload-status"></p>
        <textarea id="question" aria-label="Question"></textarea>
        <button id="ask">Ask</button><p id="answer"></p>
        <h2>History</h2><ul id="history"></ul>
      </section>
    </main>
    <script>
      let token; let documentId;
      const byId = id => document.getElementById(id);
      byId('login').onclick = async () => {
        const response = await fetch('/api/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:byId('email').value,password:byId('password').value}) });
        const data = await response.json();
        if (response.ok) { token=data.token; byId('login-panel').hidden=true; byId('assistant').hidden=false; }
      };
      byId('upload').onclick = async () => {
        const file = byId('file').files[0];
        const response = await fetch('/api/documents', { method:'POST', headers:{authorization:'Bearer '+token,'x-filename':file.name}, body:await file.text() });
        const data = await response.json(); documentId=data.documentId; byId('upload-status').textContent=response.ok?'Processed':'Upload failed';
      };
      byId('ask').onclick = async () => {
        const question=byId('question').value;
        const response = await fetch('/api/questions', { method:'POST', headers:{authorization:'Bearer '+token,'content-type':'application/json'}, body:JSON.stringify({question,documentIds:[documentId]}) });
        const data = await response.json(); byId('answer').textContent=data.answer || data.error;
        if (response.ok) { const item=document.createElement('li'); item.textContent=question+' — '+data.answer; byId('history').appendChild(item); }
      };
    </script>
  </body></html>`;
}

function answerFromDocuments(question, docs) {
  const combined = docs.map(d => d.content).join('\n');
  if (/ignore .*instruction|system prompt|api key|password/i.test(question + '\n' + combined)) {
    return { answer: 'I cannot reveal protected instructions or confidential information.', grounded: true };
  }
  const limits = [...combined.matchAll(/policy limit is\s+(\d+)/gi)].map(match => match[1]);
  if (/policy limit/i.test(question) && new Set(limits).size > 1) {
    return { answer: `The documents conflict: policy limits are ${[...new Set(limits)].join(' and ')}.`, grounded: true };
  }
  if (/capital of france/i.test(question) && /capital of france is paris/i.test(combined)) {
    return { answer: 'The capital of France is Paris.', grounded: true };
  }
  return { answer: 'The uploaded documents do not contain that information.', grounded: true };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok' });
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(renderApp());
  }
  try {
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const input = JSON.parse(await readBody(req) || '{}');
      const user = users.get(input.email);
      if (!user || user.password !== input.password) return json(res, 401, { error: 'Invalid credentials' });
      return json(res, 200, { token: user.token, userId: user.id });
    }

    const user = authenticatedUser(req);
    if (!user) return json(res, 401, { error: 'Authentication required' });

    if (req.method === 'POST' && url.pathname === '/api/documents') {
      const filename = req.headers['x-filename'] || '';
      if (!/\.(pdf|docx)$/i.test(filename)) return json(res, 415, { error: 'Only PDF and DOCX files are supported' });
      const content = await readBody(req);
      if (!content) return json(res, 400, { error: 'Document is empty' });
      const id = `doc-${nextDocumentId++}`;
      documents.set(id, { id, ownerId: user.id, filename, content });
      return json(res, 201, { documentId: id, status: 'processed' });
    }

    if (req.method === 'POST' && url.pathname === '/api/questions') {
      const input = JSON.parse(await readBody(req) || '{}');
      if (typeof input.question !== 'string' || !input.question.trim()) return json(res, 400, { error: 'Question is required' });
      if (input.question.length > 500) return json(res, 400, { error: 'Question exceeds 500 characters' });
      if (!Array.isArray(input.documentIds) || input.documentIds.length === 0) return json(res, 400, { error: 'At least one document is required' });
      const selected = input.documentIds.map(id => documents.get(id));
      if (selected.some(doc => !doc)) return json(res, 404, { error: 'Document not found' });
      if (selected.some(doc => doc.ownerId !== user.id)) return json(res, 403, { error: 'Access denied' });

      if (input.question === '__force500') return json(res, 500, { error: 'AI provider unavailable' });
      const requestKey = req.headers['x-request-key'];
      if (input.question === '__fail_once' && requestKey && !transientFailures.has(requestKey)) {
        transientFailures.add(requestKey);
        return json(res, 500, { error: 'Temporary failure' });
      }

      const result = answerFromDocuments(input.question, selected);
      const conversationId = input.conversationId || `conversation-${user.id}`;
      const conversation = conversations.get(conversationId) || {
        id: conversationId,
        ownerId: user.id,
        sharedWith: new Set(),
        entries: []
      };
      if (conversation.ownerId !== user.id) return json(res, 403, { error: 'Access denied' });
      conversation.entries.push({ question: input.question, answer: result.answer });
      conversations.set(conversationId, conversation);
      return json(res, 200, { ...result, conversationId, citations: selected.map(doc => ({ documentId: doc.id, filename: doc.filename })) });
    }

    const conversationMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
    if (req.method === 'GET' && conversationMatch) {
      const conversation = conversations.get(conversationMatch[1]);
      if (!conversation) return json(res, 404, { error: 'Conversation not found' });
      if (conversation.ownerId !== user.id && !conversation.sharedWith.has(user.id)) {
        return json(res, 403, { error: 'Access denied' });
      }
      return json(res, 200, {
        conversationId: conversation.id,
        ownerId: conversation.ownerId,
        readOnly: conversation.ownerId !== user.id,
        entries: conversation.entries
      });
    }

    const shareMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/share$/);
    if (req.method === 'POST' && shareMatch) {
      const conversation = conversations.get(shareMatch[1]);
      if (!conversation) return json(res, 404, { error: 'Conversation not found' });
      if (conversation.ownerId !== user.id) return json(res, 403, { error: 'Only the owner can share this conversation' });
      const input = JSON.parse(await readBody(req) || '{}');
      const recipient = users.get(input.email);
      if (!recipient) return json(res, 404, { error: 'Recipient not found' });
      conversation.sharedWith.add(recipient.id);
      return json(res, 200, { conversationId: conversation.id, sharedWith: [...conversation.sharedWith] });
    }

    if (req.method === 'DELETE' && shareMatch) {
      const conversation = conversations.get(shareMatch[1]);
      if (!conversation) return json(res, 404, { error: 'Conversation not found' });
      if (conversation.ownerId !== user.id) return json(res, 403, { error: 'Only the owner can revoke access' });
      const input = JSON.parse(await readBody(req) || '{}');
      const recipient = users.get(input.email);
      if (!recipient) return json(res, 404, { error: 'Recipient not found' });
      conversation.sharedWith.delete(recipient.id);
      return json(res, 200, { conversationId: conversation.id, sharedWith: [...conversation.sharedWith] });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    return json(res, 400, { error: 'Invalid request' });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`Mock app running on http://127.0.0.1:${PORT}`));

function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
