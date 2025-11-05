FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy application code
COPY . .

# Generate Prisma client
RUN yarn prisma:generate

EXPOSE 3001

CMD ["yarn", "dev"]
