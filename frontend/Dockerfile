FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-alpine
RUN npm install -g miniflare
WORKDIR /app
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["miniflare", "--port", "3000", "--host", "0.0.0.0", "--modules", ".output/server/index.mjs", "--assets", ".output/public"]
