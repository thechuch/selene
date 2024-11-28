# Use the official Node.js image
FROM node:18-alpine

# Install dependencies required for node-gyp and npm
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    libc6-compat

# Set working directory
WORKDIR /app

# Accept build arguments
ARG OPENAI_API_KEY
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_PRIVATE_KEY

# Set environment variables
ENV OPENAI_API_KEY=$OPENAI_API_KEY \
    FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID \
    FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL \
    FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=8080 \
    NPM_CONFIG_LOGLEVEL=error

# Copy package files first
COPY package*.json ./

# Clean install dependencies
RUN npm cache clean --force && \
    rm -rf node_modules && \
    npm install --production=false --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Expose the port the app runs on
EXPOSE 8080

# Start the Next.js application
CMD ["npm", "start"]
