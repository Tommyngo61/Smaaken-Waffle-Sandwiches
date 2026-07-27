# Serves the pre-built frontend. The Vite build runs on your machine, not
# here, because VITE_TABLECLOTH_API_URL / VITE_SITE_ID are baked in at build
# time - building inside the container without them would silently produce a
# bundle that can't reach Tablecloth.
#
# So: run `npm run frontend:build` locally first, then deploy.

FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public ./public

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
