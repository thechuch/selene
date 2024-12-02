# Use Node.js 18 as the base image
FROM node:18-alpine as builder

# Install dependencies required for node-gyp
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Use a new stage for the final image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy necessary files and directories from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone .

# Expose the port the app runs on
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
