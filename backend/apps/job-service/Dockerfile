FROM node:22-alpine AS builder

ENV PNPM_CONFIG_MINIMUM_RELEASE_AGE=0

WORKDIR /app

RUN npm install -g pnpm@10.15.0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json nx.json ./
COPY apps/job-service/package.json apps/job-service/
COPY libs/shared/core/package.json libs/shared/core/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY apps/job-service/ apps/job-service/
COPY libs/ libs/

RUN SERVICE=job-service pnpm run build:service

FROM node:22-alpine AS runtime

ENV PNPM_CONFIG_MINIMUM_RELEASE_AGE=0

WORKDIR /app

RUN npm install -g pnpm@10.15.0

COPY --from=builder /app/dist/apps/job-service/package.json ./
COPY --from=builder /app/dist/apps/job-service/pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=builder /app/dist/apps/job-service ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
