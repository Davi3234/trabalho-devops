FROM php:8.2-fpm-alpine AS builder

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    curl \
    linux-headers

RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    pcntl \
    bcmath \
    sockets

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist --ignore-platform-req=ext-sockets

COPY . .
RUN composer dump-autoload --optimize

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache 2>/dev/null || true

EXPOSE 9000
CMD ["php-fpm"]

FROM php:8.2-fpm-alpine AS development

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    curl \
    linux-headers

RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    pcntl \
    bcmath \
    sockets

WORKDIR /var/www

COPY --from=builder /var/www .

COPY config/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN dos2unix /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache 2>/dev/null || true
