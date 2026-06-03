#!/bin/sh
set -e

php artisan migrate --force

nginx -g "daemon off;" &

exec php-fpm
