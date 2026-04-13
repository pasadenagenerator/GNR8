FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/platform/package.json apps/platform/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/data/package.json packages/data/package.json

RUN pnpm install --frozen-lockfile

COPY apps/platform apps/platform
COPY packages/core packages/core
COPY packages/data packages/data
COPY tsconfig.json tsconfig.json

RUN pnpm --filter @gnr8/platform run build:rendered-capture-worker

ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="3001"

EXPOSE 3001

CMD ["node", "apps/platform/dist-rendered-capture-worker/gnr8/rendered-capture-worker-server/index.js"]
