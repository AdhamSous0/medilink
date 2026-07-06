FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-alpine
RUN npm install -g wrangler
WORKDIR /app
COPY --from=build /app/.output ./.output
WORKDIR /app/.output/server
EXPOSE 3000
CMD ["wrangler", "dev", "index.mjs", "--port", "3000", "--no-bundle", "--local", "--ip", "0.0.0.0"]
