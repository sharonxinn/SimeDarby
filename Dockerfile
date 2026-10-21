FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.12-slim-bookworm
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    SOLARSYNC_STATIC_DIR=/app/dist \
    SOLARSYNC_DB_PATH=/var/data/township_solar.db \
    SOLARSYNC_DATA_DIR=/var/data/source-archives \
    SOLARSYNC_BOOTSTRAP_DIR=/app/deployment-data
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server ./server
COPY deployment-data ./deployment-data
COPY --from=frontend /build/dist ./dist
EXPOSE 10000
CMD ["python", "server/start.py"]
