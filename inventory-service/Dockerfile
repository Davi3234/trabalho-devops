FROM node:20-alpine as build

WORKDIR /usr/src/app

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run test

RUN npm run build

FROM node:20-slim as production

WORKDIR /usr/src/app

COPY package*.json .

COPY prisma prisma
COPY prisma.config.js .

COPY --from=build /usr/src/app/node_modules node_modules

COPY --from=build /usr/src/app/dist dist

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate:prod && npm run start:prod" ]
