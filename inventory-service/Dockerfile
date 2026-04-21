FROM node:20-alpine as build

WORKDIR /usr/src/app

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-slim as production

WORKDIR /usr/src/app

COPY package*.json .

COPY prisma prisma
COPY prisma.config.js .

COPY --from=build /usr/src/app/node_modules node_modules

RUN npm prune --omit=dev

COPY --from=build /usr/src/app/dist dist

COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
