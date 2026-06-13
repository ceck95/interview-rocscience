# Cloud Job Execution System — Backend

> **Scope:** This is the **backend-focused** of the platform. The frontend (`frontend/`) is out of scope — all design decisions, patterns, and production evolution described in this document refer exclusively to the backend. The codebase is structured to **extend easily into microservices** — the Nx monorepo, shared `@interview/core` lib, CQRS pattern, and `@Global` AWS module mean a new service (`billing-service`, `notification-service`) can be added as a new `apps/` entry without touching existing code. The [Design Notes](#design-notes) section describes how this evolves into a production-ready AWS platform (AWS Batch, ECS Fargate, API Gateway, EventBridge).

A simplified cloud job execution platform built with **NestJS 11** in an **Nx monorepo** architecture. Users submit jobs via REST API, the system triggers EC2 execution via SSM RunCommand, tracks job state in DynamoDB, stores files in S3, and calculates billing credits on completion.

---

## Table of Contents

1. [Codebase Structure](#codebase-structure)
2. [How to Start the Project](#how-to-start-the-project)
3. [Architecture Overview](#architecture-overview)
4. [AWS Services](#aws-services)
5. [API Reference](#api-reference)
6. [Billing Credit Formula](#billing-credit-formula)
7. [Duplicate Billing Prevention](#duplicate-billing-prevention)
8. [S3 File Structure](#s3-file-structure)
9. [Assumptions and Trade-offs](#assumptions-and-trade-offs)
10. [Limitations](#limitations)
11. [Design Notes](#design-notes)
12. [E2E Tests (Additional)](#e2e-tests-additional)

---

## Codebase Structure

The backend lives entirely under `backend/` as an **Nx monorepo**. There is one deployable service (`job-service`) and one shared library (`@interview/core`).

```
backend/
├── apps/
│   └── job-service/                  # Main NestJS application
│       └── src/
│           ├── main.ts               # Entry point — calls bootstrap()
│           ├── main.module.ts        # Root AppModule
│           ├── configs/
│           │   └── aws.config.ts     # AWS SDK client factory (LocalStack vs real AWS)
│           ├── constants/
│           │   └── billing.constant.ts  # CREDIT_RATES per compute type
│           ├── enums/
│           │   ├── compute-type.enum.ts # cpu-small | cpu-large | gpu
│           │   └── job-status.enum.ts   # queued | running | completed | failed
│           └── modules/
│               ├── aws/              # @Global AWS module
│               │   ├── dynamodb.service.ts   # DynamoDB CRUD + conditional write
│               │   ├── s3.service.ts         # Presigned URL generation
│               │   └── ec2.service.ts        # SSM RunCommand trigger
│               ├── jobs/             # Job lifecycle module
│               │   ├── jobs.controller.ts
│               │   ├── commands/     # CQRS write side
│               │   │   ├── create-job.command.ts
│               │   │   ├── complete-job.command.ts
│               │   │   └── fail-job.command.ts
│               │   ├── queries/      # CQRS read side
│               │   │   ├── get-job-by-id.query.ts
│               │   │   └── get-list-jobs.query.ts
│               │   └── dtos/
│               └── billing/          # Billing read module
│                   ├── billing.controller.ts
│                   ├── queries/
│                   │   ├── get-billing-by-job-id.query.ts
│                   │   └── get-billing-summary.query.ts
│                   └── dtos/
│
├── libs/
│   └── shared/
│       └── core/                     # @interview/core — shared utilities
│           └── src/
│               ├── app/
│               │   └── bootstrap.ts  # App factory (Pino logger, global pipes, Swagger)
│               ├── config/
│               │   └── swagger.config.ts
│               ├── dtos/
│               │   └── created-response.dto.ts
│               └── exception/
│                   └── app-exception.ts  # AppBadRequestException
│
├── infra/                            # AWS CDK v2 stack
│   ├── bin/app.ts
│   └── lib/job-execution-stack.ts    # DynamoDB table, S3 bucket, EC2 IAM role
│
├── scripts/
│   ├── job-runner.sh                 # Runs on EC2 — simulates work, uploads output, calls /complete
│   └── setup-localstack.sh           # Bootstraps LocalStack resources
│
├── docker/
│   └── docker-compose.localstack.yml
│
├── .env.example
└── package.json                      # Root pnpm workspace scripts
```

### Key Design Decisions in the Code

| Pattern | Where | Why |
|---|---|---|
| **CQRS** | `jobs/` and `billing/` modules | Separates read and write concerns clearly |
| **@Global AWS module** | `modules/aws/` | Single instantiation of DynamoDB/S3/EC2 clients across all modules |
| **Shared lib** | `libs/shared/core` | Reusable bootstrap, Swagger setup, exception types — new services import `@interview/core` with zero duplication |
| **Conditional DynamoDB write** | `dynamodb.service.ts` | Idempotent job completion — prevents duplicate billing |
| **Fire-and-forget EC2 trigger** | `create-job.command.ts` | Keeps `POST /api/jobs` fast; errors mark the job as `failed` |

---

## How to Start the Project

---

### Local Development

Run the full stack locally using LocalStack (no real AWS account needed).

#### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for LocalStack)
- AWS CLI (for LocalStack commands)

#### Backend

```bash
# Install dependencies
cd backend
pnpm install

# Copy environment file — LOCAL=true is already set, no changes needed
cp .env.example .env

# Start LocalStack
pnpm run localstack:up

# Create DynamoDB table and S3 bucket inside LocalStack
pnpm run localstack:deploy

# Start job-service in watch mode
SERVICE=job-service pnpm run start:dev
```

- API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

- UI: `http://localhost:5173` (connects to the backend at `http://localhost:3000/api`)

#### Test the EC2 Script Locally

`job-runner.sh` normally runs on EC2 via SSM. To simulate it locally against LocalStack:

```bash
export JOB_ID="test-job-123"
export COMPUTE_TYPE="cpu-small"
export INPUT_FILE_KEY="jobs/test-job-123/input/data.csv"
export S3_BUCKET="job-execution-files"
export API_URL="http://localhost:3000"
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"

bash backend/scripts/job-runner.sh
```

---

### Deploy to AWS

The CDK stack provisions **infrastructure only** (DynamoDB table, S3 bucket, EC2 IAM role) — it does not deploy the `job-service` app or the frontend. After provisioning, you still build/start the backend and host the frontend separately, as described below.

#### Prerequisites

- AWS account with IAM credentials (`AdministratorAccess` or a scoped deploy role)
- An EC2 instance with the **SSM Agent running** and the CDK-provisioned IAM instance profile attached
- AWS CLI configured

#### Deploy Infrastructure (CDK)

```bash
cd backend

# Authenticate with AWS
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1

# Provision DynamoDB table, S3 bucket, and EC2 IAM role (infrastructure only)
pnpm run cdk:deploy
```

Note the CDK outputs — they include the DynamoDB table name, S3 bucket name, and IAM role ARN. Attach the IAM role to your EC2 instance before submitting any jobs.

#### Configure Environment

Update `backend/.env` with the real AWS resource values:

```env
LOCAL=false
DYNAMODB_TABLE_NAME=jobs
S3_BUCKET_NAME=job-execution-files-<account>-<region>
EC2_INSTANCE_ID=i-xxxxxxxxx
API_URL=https://<your-domain-or-ec2-public-ip>
```

#### Build and Start

```bash
SERVICE=job-service pnpm run build:service
SERVICE=job-service pnpm run start:service
```

#### Frontend

```bash
cd frontend
VITE_API_URL=https://<your-backend-url>/api npm run build
```

Serve the `dist/` output via any static host (S3 + CloudFront, Nginx, etc.).

---

### Available pnpm Scripts

| Script | Description |
|---|---|
| `SERVICE=job-service pnpm start:dev` | Start job-service in dev/watch mode |
| `pnpm run localstack:up` | Start LocalStack via Docker Compose |
| `pnpm run localstack:deploy` | Create DynamoDB table and S3 bucket in LocalStack |
| `pnpm run localstack:down` | Stop LocalStack |
| `pnpm run localstack:destroy` | Tear down LocalStack resources |
| `pnpm run cdk:deploy` | Deploy CDK stack to real AWS |
| `pnpm run cdk:destroy` | Tear down CDK stack |
| `pnpm run build` | Build all projects |
| `pnpm run lint` | Lint all projects |
| `pnpm run test` | Test all projects |

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        Nx Monorepo                             │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             apps/job-service  (NestJS 11)                │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌───────────────┐  ┌───────────────┐  │  │
│  │  │ jobs module │  │billing module │  │   aws module  │  │  │
│  │  │  (CQRS)     │  │  (CQRS)       │  │  (@Global)    │  │  │
│  │  │  commands/  │  │  queries/     │  │  DynamoDB     │  │  │
│  │  │  queries/   │  │  dtos/        │  │  S3           │  │  │
│  │  └─────────────┘  └───────────────┘  │  EC2/SSM      │  │  │
│  │                                      └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         libs/shared/core  (@interview/core)              │  │
│  │   bootstrap()  •  setupSwagger()  •  AppBadRequestException│ │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    infra/  (CDK v2)                      │  │
│  │   DynamoDB Table  •  S3 Bucket  •  EC2 IAM Role          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**Job Execution Flow:**

```
Client ──POST /api/jobs──► JobsController ──CreateJobCommand──► DynamoDB (queued)
                                                               └──► EC2Service (fire-and-forget)
                                                                        │
                                                               SSM RunCommand
                                                                        │
                                                               job-runner.sh on EC2
                                                                        │
                                                               ┌────────┴────────┐
                                                               │                 │
                                                           S3 upload         POST /api/jobs/:id/complete
                                                         (output file)               │
                                                                        DynamoDB conditional write
                                                                        (status: running → completed)
                                                                        Credit cost calculated
```

---

## AWS Services

| Service | Purpose |
|---|---|
| **DynamoDB** | Primary job store — single `jobs` table with `jobId` as partition key, `PAY_PER_REQUEST` billing |
| **S3** | File storage — clients upload input files via presigned PUT URL; EC2 runner uploads output files |
| **SSM RunCommand** | Triggers `job-runner.sh` on EC2 instances without requiring SSH access |
| **IAM** | EC2 instance role with minimal permissions: S3 read/write on the job bucket, DynamoDB read/write, SSM core |
| **CDK v2** | Infrastructure as code — provisions all AWS resources consistently |

---

## API Reference

Full API documentation is available via Swagger UI once the service is running:

- Base URL: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`

---

## Billing Credit Formula

```
CREDIT_RATES = { 'cpu-small': 1, 'cpu-large': 3, 'gpu': 8 }  // credits per minute

creditCost = Math.ceil(executionDuration / 60) * CREDIT_RATES[computeType]
```

**Example:** A `gpu` job running 75 seconds → `Math.ceil(75 / 60) * 8 = 2 * 8 = **16 credits**`

Rates are defined in `src/constants/billing.constant.ts` and easy to adjust.

---

## Duplicate Billing Prevention

`POST /api/jobs/:id/complete` is **idempotent by design**.

`DynamoDBService.completeJobIdempotent()` uses a **conditional write**:

```
ConditionExpression: 'attribute_exists(jobId) AND #status = :running'
```

| Scenario | Outcome |
|---|---|
| Job is `running` | Atomically transitions to `completed`, calculates billing — runs exactly once |
| Job is already `completed` | `ConditionalCheckFailedException` is caught — returns existing data, billing unchanged |
| Job does not exist | `NotFoundException` returned |

This guarantees billing is calculated exactly once even if the EC2 runner calls the endpoint multiple times (e.g., on retry after a network failure).

---

## S3 File Structure

```
s3://job-execution-files/
└── jobs/
    └── {jobId}/
        ├── input/
        │   └── {inputFileName}       # Uploaded by client via presigned URL
        └── output/
            └── output-{jobId}.txt    # Uploaded by job-runner.sh on EC2
```

Presigned PUT URLs expire after **60 minutes**. Output file keys are stored in the `outputFileKey` field on the job record after completion.

---

## Assumptions and Trade-offs

1. **No authentication** — all endpoints are open. Production would secure them via AWS API Gateway: issue API keys per client for machine-to-machine access, or use Cognito User Pools with JWT for user-facing auth. The Gateway handles token verification before the request ever reaches the service.
2. **LocalStack for local dev** — avoids any real AWS cost or credential complexity during development and review.
3. **CDK provisions infrastructure only, not full end-to-end deployment** — the stack creates the minimal resources needed to run the app (DynamoDB table, S3 bucket, EC2 IAM role). It does not build/deploy the `job-service` app to EC2, set up a load balancer, or host the frontend. Deploying the app and frontend remains a manual step (see [Deploy to AWS](#deploy-to-aws)). A production setup would extend the stack with CodeDeploy/ECS for the app and CloudFront + S3 for the frontend.

---

## Limitations

- No CloudWatch metrics or alarms
- SSM RunCommand has a maximum timeout of 48 hours
- **No job queue** — jobs are dispatched directly to EC2 via SSM (fire-and-forget). If the instance is offline or the dispatch fails, the job is marked `failed` with no retry. A production system would use AWS Batch for managed queuing, automatic retries, and hard timeout enforcement.
- **No job timeout / stuck job detection** — if EC2 triggers successfully but the instance crashes mid-run, `job-runner.sh` never calls `/complete` and the job stays in `running` state indefinitely. A production system would use a Step Functions timeout or a scheduled Lambda to detect and fail stale jobs.

---

## Design Notes

### How to evolve to a production-ready AWS platform

```
┌─────────────────────────────────────────────────────────────┐
│              PRODUCTION PLATFORM ARCHITECTURE               │
└─────────────────────────────────────────────────────────────┘

   Web · Mobile · CI Pipelines · Worker SigV4 callbacks
                          │ HTTPS
                          ▼
             ┌────────────────────────┐
             │       CloudFront       │  CDN · DDoS shield
             └────────────┬───────────┘
                          │
             ┌────────────▼──────────────────────────────┐
             │              API Gateway                  │
             │  Cognito JWT │  API Key  │  IAM SigV4    │
             └──────────────────┬────────────────────────┘
                                │ auth verified
                                ▼
             ┌──────────────────────────────────────────┐
             │       Internal ALB  (private VPC)        │
             └──────────────┬───────────────┬───────────┘
                            │               │
              ┌─────────────▼────┐    ┌─────▼──────────────┐
              │   job-service    │◄──►│  billing-service   │
              │   ECS Fargate    │TCP │  ECS Fargate       │
              │   (auto-scale)   │    │  (auto-scale)      │
              └──┬───┬───────────┘    └────────────────────┘
                 │   │
          ┌──────┘   └──────────────────────────┐
          │                                     │
    ┌─────▼──────┐      ┌────────────────────────▼──────────┐
    │  DynamoDB  │      │           AWS Batch               │
    │  (+ GSI)   │      │  job queue · retry · timeout      │
    └────────────┘      │  Spot + On-Demand · GPU support   │
    ┌────────────┐      └──────────────┬────────────────────┘
    │    S3      │                     │ submit + manage
    │  (files)   │      ┌──────────────▼──────────────────┐
    └────────────┘      │  Batch Workers (ECS Fargate /   │
                        │  EC2 Spot — auto-scale)         │
                        └──┬──────┬─────┬─────────────────┘
                           │      │     │
               ┌───────────▼─┐  ┌─▼────────────┐  ┌──────────────────┐
               │  S3 output  │  │S3 checkpoint │  │  Batch FAILED    │
               └─────────────┘  │{progress,   │  │  → EventBridge   │
                                 │ lastOffset} │  │  → Lambda        │
               ┌─────────────┐  └─▲───────────┘  │  → failJob()     │
               │ EventBridge │    │ read on retry  │  + CW alarm      │
               └──────┬──────┘    └── new worker   └──────────────────┘
                      │               resumes offset
               ┌──────▼────────┐
               │billing Lambda │
               │ (idempotent)  │
               └───────────────┘
  ──────────────────────────────────────────────────────────────────
  Workers → POST /complete (SigV4)  → API Gateway → job-service
  Retry   → reads S3 checkpoint     → resumes from lastOffset
  Timeout → Batch hard ceiling      → FAILED event → mark failed
```

1. **AWS Batch for job execution** — Replace direct SSM dispatch with **AWS Batch**. job-service calls `batch.submitJob()`; Batch manages the job queue, compute environment, auto-scaling, retry, and hard timeout natively — no manual SQS or DLQ configuration needed.

2. **ECS Fargate for all services** — Each NestJS service (`job-service`, `billing-service`) deploys as an independent ECS Fargate task in a private VPC subnet with its own least-privilege IAM task role. Batch Workers run on ECS Fargate (short jobs) or EC2 Spot (long/GPU jobs) — Batch selects automatically based on job definition.

3. **API Gateway + Authentication** — Single public entry point. All auth is resolved here before any request reaches a service:
   - **Web / Mobile** → Cognito User Pool JWT, verified via a Cognito Authorizer
   - **CI / third-party** → API keys with per-tenant usage plans and rate limits
   - **Workers calling back** (`POST /jobs/:id/complete`) → Batch task IAM role signs requests with **SigV4**; an IAM Authorizer validates — no hardcoded secrets

4. **NestJS TCP microservices** — Synchronous inter-service calls use the **NestJS built-in TCP transport** (`@nestjs/microservices`). Each service exposes a TCP port inside the private VPC. **AWS Cloud Map** resolves `billing-service.internal` → ECS task IPs automatically. Security groups restrict TCP access to only the allowed caller service — no inbound from outside the VPC.

5. **Async / event-driven** — `job.completed` events are published to **EventBridge**. `billing-service` and `notification-service` subscribe independently via dedicated SQS queues — fully decoupled, no direct TCP call needed for fire-and-forget flows.

6. **Job timeout and stuck job recovery** — AWS Batch provides three built-in guarantees with zero extra infrastructure:

   ```
   Batch delivers job to worker
         │
      Worker crashes / hangs
         │
      Batch detects → retries automatically (retryStrategy.attempts)
         │
      Still failing after N attempts
         │
      Batch marks job FAILED (exact attemptDurationSeconds ceiling)
         │
      Batch emits FAILED event → EventBridge → Lambda
         │
      Lambda → failJobConditional() → DynamoDB status = failed
           └──► delete S3 checkpoint + CloudWatch alarm
   ```

   - **`retryStrategy.attempts`** — Batch automatically retries failed workers up to N times. On each retry the worker reads the S3 checkpoint and resumes from `lastOffset`.
   - **`timeout.attemptDurationSeconds`** — hard ceiling on execution time. Batch terminates the container at exactly this duration regardless of whether the worker is alive or silent. More precise than a heartbeat scan.
   - **EventBridge job state events** — Batch emits state change events (`FAILED`, `SUCCEEDED`) to EventBridge. A Lambda subscribed to `FAILED` events calls `failJobConditional()`, cleans up S3, and fires a CloudWatch alarm — no DLQ needed.

7. **Job state tracking and resume strategy** — Batch retries restart the worker from scratch by default. For heavy or long-running jobs this is wasteful. The solution is checkpointing:

   - **Worker writes progress to S3** periodically (e.g. every 30 seconds or every N processed records):
     ```
     s3://job-files/jobs/{jobId}/checkpoint.json
     { "progress": 45, "lastOffset": 12400, "updatedAt": "..." }
     ```
   - **On retry**, the new worker reads the checkpoint first and resumes from `lastOffset` — not from zero
   - **job-service tracks state** in DynamoDB: `{ status, progress, lastCheckpointAt }` — frontend can poll and show a progress bar
   - **Resume is opt-in per job type** — short simulated jobs skip checkpointing; heavy compute jobs (ML training, large file processing) always checkpoint

   This gives you three retry strategies to choose from depending on the job:

   | Strategy | When to use |
   |----------|------------|
   | Restart from scratch | Short jobs (< 1 min), stateless |
   | Resume from checkpoint | Long jobs, expensive compute |
   | Step Functions state | Multi-phase jobs, each phase is a checkpoint |

8. **Orchestration** — Use **AWS Step Functions** for multi-step jobs with branching, retries, and parallel execution stages. Each state in a Step Functions execution is a built-in checkpoint — a retry only re-runs the failed state, not the entire workflow.

9. **Monitoring** — CloudWatch metrics for job duration, credit spend, and failure rates. Alarms for SLO violations. Structured logs (Pino) already in place for CloudWatch Logs Insights querying.

10. **Storage lifecycle** — S3 lifecycle policies to archive old job files to **Glacier** after 90 days.

11. **Real-time aggregation** — **DynamoDB Streams** + Lambda to maintain pre-aggregated billing counters, eliminating full-table scans on the billing summary endpoint.

12. **Data consistency strategy** — Keeping DynamoDB, S3, and downstream services in sync across failures:

    - **Progress sync** — worker writes `{ progress, lastCheckpointAt }` to DynamoDB every 30 seconds alongside the S3 checkpoint. This is purely for client polling — the frontend can show a live progress bar. Dead worker detection and re-delivery are handled entirely by Batch (`timeout.attemptDurationSeconds` + `retryStrategy.attempts` + EventBridge FAILED event) with no scheduled scan needed.

    - **Two writes per checkpoint interval**:
      ```
      Every 30s:
        S3  → { progress, lastOffset }   (resume data — for new worker on retry)
        API → POST /progress             (sync data — updates DynamoDB for client polling)
      ```

    - **Completion order matters** — worker must follow this exact sequence to avoid inconsistency:
      ```
      1. upload output → S3
      2. POST /complete (SigV4) → job-service → DynamoDB status = completed
      3. exit 0                                ← Batch marks job SUCCEEDED
      4. publish job.completed → EventBridge
      ```
      If `/complete` fails, the worker exits non-zero. Batch retries and the idempotent conditional write handles the duplicate `/complete` call safely on the next attempt.

    - **DynamoDB outbox for cross-service events** — job-service writes status update and the `job.completed` event in a **single DynamoDB transaction**. DynamoDB Streams picks up the outbox record and publishes to EventBridge. This guarantees the event is never lost even if the service crashes between the DB write and the EventBridge publish.

    - **FAILED event cleanup** — when a job exhausts all Batch retries, the EventBridge FAILED event Lambda (from point 6) runs a compensating transaction: `failJobConditional()` in DynamoDB + delete S3 checkpoint + delete partial S3 output. Leaves no dirty state behind.

### How to prevent duplicate billing if job completion is triggered twice

The current implementation already solves this with a **DynamoDB conditional write** (`ConditionExpression: #status = :running`). The transition from `running → completed` is atomic and can only succeed once. Any subsequent call to `/complete` receives a `ConditionalCheckFailedException` which is caught and returns the existing completed record — no billing recalculated, no data mutated.

In a production system with an event-driven pattern (EventBridge + billing Lambda), the same guarantee would be enforced at the Lambda level using an idempotency key (e.g., `jobId`) stored in a separate DynamoDB idempotency table, following the **AWS Lambda Powertools idempotency** pattern.

---

## E2E Tests (Additional)

Playwright end-to-end tests live in `test/` and cover the full job execution workflow — API layer and browser UI.

### Prerequisites

- Backend running at `http://localhost:3000` (LocalStack setup complete)
- Frontend running at `http://localhost:5173`
- Node.js 18+

### Setup

```bash
cd test
npm install
npx playwright install chromium
```

### Running Tests

```bash
# Run all tests (Playwright auto-starts backend + frontend via webServer config)
npm test

# API-only tests — no browser required
npm run test:api

# Full end-to-end workflow tests
npm run test:flows

# Run with browser visible
npm run test:headed

# Interactive Playwright UI mode
npm run test:ui

# View HTML report after a run
npm run test:report
```

### Test Coverage

| Suite | Location | What it covers |
|---|---|---|
| API tests | `e2e/api/` | HTTP requests via Playwright request context — all endpoints, status codes, and error cases |
| UI tests | `e2e/ui/` | Browser tests for job list, submission form, and detail/billing view |
| Flow tests | `e2e/flows/` | Full workflow: submit → poll status → complete (via `/complete` callback) → verify billing → idempotency check |
