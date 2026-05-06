FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install && npm install -g tsx typescript

# Copy all source
COPY . .

# Build frontend
RUN npm run build

# Expose the server port (default 3000 for many hostings, or use PORT env var)
EXPOSE 3000

# Run the app
CMD ["npm", "start"]
