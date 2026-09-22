# AI Document Assistant – Playwright Automation Assessment

This repository demonstrates a risk-based automation solution for the provided assessment scenario. Because no live application, API contract, credentials, or selectors were supplied, the project includes a small deterministic mock service and browser UI. The tests show the intended design and can be adapted to a real environment through `BASE_URL` and endpoint/page-object updates. See [TEST_CASES.md](TEST_CASES.md) for the exact automated scenarios and expected results.

## Automated coverage

- Authentication: valid, invalid, and missing tokens
- PDF/DOCX document upload and unsupported formats
- Question API contract and document-grounded answers
- Unsupported questions and hallucination prevention
- Conversation history, sharing permissions, and revocation
- Cross-user document isolation and authorization
- Contradictory documents
- Prompt-injection resistance
- Data-driven AI evaluation for supported, unsupported, conflicting, sensitive, and misleading questions
- Boundary validation for question length
- Intermittent `500` handling and safe retry behavior
- Response-time assertion
- Critical browser flow: sign in → upload → ask → view history
- Page Object Model for reusable UI locators and actions

## Run locally

```bash
npm install
npx playwright install chromium
npm test
```

Run API tests only (no browser installation required):

```bash
npm run test:api
```

Run an individual layer:

```bash
npm run test:ai
npm run test:security
npm run test:performance
npm run test:smoke
npm run test:regression
```

Pushes run the smoke suite. Pull requests and the scheduled workflow run the full suite.

## Structure

```text
mock-server/           deterministic assessment application
pages/                 Playwright Page Object Model classes
tests/api/             functional API and integration checks
tests/ai/              data-driven AI evaluation suite
tests/security/        isolation, sharing, revocation, and injection checks
tests/performance/     latency and concurrent-request checks
tests/ui/              critical end-to-end browser flow
tests/fixtures/        controlled document content
playwright.config.js   projects, retries, reporting, and server lifecycle
```

## Real-system adaptation

1. Set `BASE_URL` to the test environment.
2. Replace mock login details with environment variables or a secure CI secret store.
3. Update endpoint paths and request bodies to match the real API contract.
4. Add new page objects or component objects as the UI suite grows.
5. Keep AI checks semantic: validate required facts, citations, grounding, and forbidden disclosures rather than exact wording.

## Important assumptions

- Supported files are PDF and DOCX.
- Questions are limited to 500 characters in the mock contract.
- Private documents are scoped to their owner.
- A response must be grounded only in the caller's selected documents.
- The mock includes controlled failure triggers solely to demonstrate reliability testing.
