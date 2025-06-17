FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variable to suppress deprecation warnings
ENV NODE_OPTIONS="--no-deprecation"

# Start the application
CMD ["npm", "start"]
