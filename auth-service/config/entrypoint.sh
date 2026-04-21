#!/bin/sh
set -e

php artisan migrate --force

exec php-fpm
