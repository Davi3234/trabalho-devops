FROM php:8.5-fpm-alpine AS builder

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    curl \
    linux-headers \
    autoconf \
    g++ \
    make \
 && docker-php-ext-install pdo pdo_pgsql zip pcntl bcmath sockets \
 && pecl install apcu \
 && docker-php-ext-enable apcu

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --prefer-dist --ignore-platform-req=ext-sockets

COPY . .
RUN composer dump-autoload --optimize

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache 2>/dev/null || true

FROM php:8.5-fpm-alpine AS development

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    curl \
    linux-headers \
    nginx

COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/

WORKDIR /var/www

COPY --from=builder /var/www .

COPY config/nginx.conf /etc/nginx/http.d/default.conf
COPY config/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache 2>/dev/null || true

EXPOSE 8080

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
