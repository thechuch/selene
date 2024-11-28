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
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_API_KEY

# Set environment variables
ENV OPENAI_API_KEY=$OPENAI_API_KEY \
    FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID \
    FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL \
    FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=8080

# Copy package files first
COPY package.json ./

# Install production dependencies
RUN npm install --production=false

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Start the Next.js application
CMD ["npm", "start"]
