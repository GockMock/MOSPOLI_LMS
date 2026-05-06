# Single-container image for Vast.ai.
# Vast instances are already Docker containers, so this image runs both processes:
# - llama.cpp embedding server
# - ai-navigation-service

FROM ghcr.io/ggml-org/llama.cpp:server AS runtime

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_VERSION=22.19.0
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
    && mkdir -p /usr/local/lib/nodejs \
    && tar -xJf /tmp/node.tar.xz -C /usr/local/lib/nodejs \
    && ln -s /usr/local/lib/nodejs/node-v${NODE_VERSION}-linux-x64/bin/node /usr/local/bin/node \
    && ln -s /usr/local/lib/nodejs/node-v${NODE_VERSION}-linux-x64/bin/npm /usr/local/bin/npm \
    && ln -s /usr/local/lib/nodejs/node-v${NODE_VERSION}-linux-x64/bin/npx /usr/local/bin/npx \
    && rm /tmp/node.tar.xz

WORKDIR /app/ai-navigation-service
COPY ai-navigation-service/package*.json ./
RUN npm ci
COPY ai-navigation-service/tsconfig.json ./
COPY ai-navigation-service/src ./src
COPY ai-navigation-service/data ./data
RUN npm run build && npm prune --omit=dev && npm cache clean --force

COPY deploy/vast/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV PORT=3001 \
    LLAMA_PORT=8080 \
    MODEL_DIR=/workspace/models \
    MODEL_FILE=qwen3-embedding-4b-q5_k_m.gguf \
    EMBEDDING_MODEL=qwen3-embedding-q5-k-m \
    EMBEDDING_MOCK=false \
    ALLOW_EMBEDDING_FALLBACK=false

EXPOSE 3001 8080
CMD ["/app/start.sh"]
