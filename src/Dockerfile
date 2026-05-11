# Stage 1: Build the Dashboard (Frontend)
FROM node:20-alpine as build-stage
WORKDIR /app
COPY dashboard/package*.json ./
RUN npm install
COPY dashboard/ .
RUN npm run build

# Stage 2: Build the Server (Backend) and combine
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies (e.g. ffmpeg)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt yt-dlp

# Copy backend source
COPY server/ .

# Copy built frontend from build-stage to 'dist' folder
COPY --from=build-stage /app/dist ./dist

# Create storage directory
RUN mkdir -p storage

EXPOSE 8000
CMD ["python", "main.py"]
