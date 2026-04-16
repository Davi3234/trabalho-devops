FROM php:8.2-fpm-alpine AS builder

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    curl

RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --optimize

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache 2>/dev/null || true

EXPOSE 9000
CMD ["php-fpm"]
