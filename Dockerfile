# Use Node.js 18 as the base image
FROM node:18-alpine

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

# Add this section to ensure static files are copied
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/ && \
    cp -r .next/static .next/standalone/.next/static

# Expose the port the app runs on
ENV PORT=8080
EXPOSE 8080

# Set the working directory to the standalone directory
WORKDIR /app/.next/standalone

# Start the application
CMD ["node", "server.js"]
