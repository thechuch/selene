# Use the official Node.js image.
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Set build-time environment variables
ENV FIREBASE_PROJECT_ID=selene-c0c22
ENV FIREBASE_CLIENT_EMAIL=firebase-adminsdk-uwj9y@selene-c0c22.iam.gserviceaccount.com
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Set runtime environment variables
ENV PORT=8080
ENV SOCKET_PORT=3001
ENV NODE_ENV=production

# Start the Next.js application
CMD ["npm", "start"]
