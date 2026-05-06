# --- Build Stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build frontend and compile types
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm install -g ts-node typescript

# Copy built frontend assets
COPY --from=build /app/dist ./dist

# Copy server source code (we'll run it with ts-node in prod for simplicity in this stack)
COPY src/server ./src/server
COPY .env* ./

# Expose the port Express is running on
EXPOSE 3001

# Command to start the application
CMD ["node", "--loader", "ts-node/esm", "src/server/index.ts"]
