# Use the official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=8080

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Start the Next.js application
CMD ["npm", "start"]
