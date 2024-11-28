# Use the official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Accept build arguments
ARG OPENAI_API_KEY
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_PRIVATE_KEY

# Set environment variables
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
ENV FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
ENV FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=8080

# Install dependencies first (caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Start the Next.js application
CMD ["npm", "start"]
