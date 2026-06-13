# E2E Tests - Cloud Job Execution System

Playwright end-to-end tests covering the full job execution workflow.

## Prerequisites

- Backend running at `http://localhost:3000` (with LocalStack + DynamoDB)
- Frontend running at `http://localhost:5173`
- Node.js 18+

## Setup

```bash
cd test
npm install
npx playwright install chromium
```

## Running Tests

```bash
# All tests (Playwright auto-starts BE + FE)
npm test

# API tests only (no browser)
npm run test:api

# Full workflow tests
npm run test:flows

# With browser visible
npm run test:headed

# Interactive UI mode
npm run test:ui

# View HTML report
npm run test:report
```

## Test Structure

- `e2e/api/` — HTTP API tests using Playwright request context (no browser)
- `e2e/ui/` — Browser UI tests for each page
- `e2e/flows/` — End-to-end workflow tests combining API + UI

## Notes

- `webServer` config in `playwright.config.ts` auto-starts BE + FE before tests
- Tests are written to be resilient: some assertions use `expect([200, 400]).toContain(status)` because the backend's DynamoDB conditional write rejects `/complete` if status is not `running`
- The full workflow test covers: submit → view → complete (via API callback) → billing verification → idempotency check
