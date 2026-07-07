FROM mcr.microsoft.com/playwright:v1.44.1-jammy

# Upgrade Node.js inside the container to v24
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Expose Express server port
EXPOSE 3000

# Set command to start Express API server
CMD ["node", "server.js"]
