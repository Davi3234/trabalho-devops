#!/bin/sh

echo "Waiting for database..."

until npx prisma db push >/dev/null 2>&1; do
  sleep 2
done

echo "Database is ready!"

echo "Running migrations..."
npx prisma migrate deploy

echo "Starting app..."

npm run prisma:migrate:prod
npm run start:prod
