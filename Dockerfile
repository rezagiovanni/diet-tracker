# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim AS backend
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code + built frontend
COPY backend/ ./
COPY --from=frontend-build /frontend/build ./static

# SA key (di-tulis CI ke service/)
COPY service/diet_webapp_key.json /home/rezagiovanni/diet/service/diet_webapp_key.json

ENV STATIC_DIR=/app/static
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
