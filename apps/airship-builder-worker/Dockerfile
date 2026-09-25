FROM node:22.13.1-bookworm-slim

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

ARG AIRSHIP_CLI_VERSION
RUN test -n "$AIRSHIP_CLI_VERSION"
ENV GNR8_AIRSHIP_CLI_VERSION="$AIRSHIP_CLI_VERSION"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/airship-builder-worker/package.json apps/airship-builder-worker/package.json

RUN pnpm install --frozen-lockfile --filter @gnr8/airship-builder-worker...
RUN pnpm add --global "@airshiplabs/cli@$AIRSHIP_CLI_VERSION"

COPY apps/airship-builder-worker apps/airship-builder-worker
COPY tsconfig.json tsconfig.json

RUN pnpm --filter @gnr8/airship-builder-worker run build

RUN useradd --create-home --shell /usr/sbin/nologin airship-worker \
  && mkdir -p /srv/gnr8-airship/sessions \
  && chown -R airship-worker:airship-worker /srv/gnr8-airship /app/apps/airship-builder-worker

USER airship-worker

ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="3002"
ENV GNR8_AIRSHIP_BUILDER_WORKSPACE_ROOT="/srv/gnr8-airship/sessions"

EXPOSE 3002

CMD ["node", "apps/airship-builder-worker/dist/src/index.js"]
