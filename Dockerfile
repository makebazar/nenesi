FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install && npm install -g ts-node typescript

# Copy all source
COPY . .

# Build frontend
RUN npm run build

# Expose the server port
EXPOSE 3001

# Run the app
CMD ["npm", "start"]
