# Stage builder
FROM php:8.3-fpm-alpine AS builder

RUN apk add --no-cache \
    unzip \
    curl \
    libzip-dev \
    postgresql-dev \
    linux-headers \
  && docker-php-ext-install zip pdo pdo_pgsql

RUN apk add --no-cache $PHPIZE_DEPS \
  && pecl install redis \
  && pecl install pcov \
  && docker-php-ext-enable pcov \
  && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./

RUN composer install --no-dev --optimize-autoloader

COPY . .

# Stage development
FROM php:8.3-fpm-alpine AS development

RUN apk add --no-cache \
    unzip \
    curl \
    libzip-dev \
    postgresql-dev \
    linux-headers \
    dos2unix \
  && docker-php-ext-install zip pdo pdo_pgsql

RUN apk add --no-cache $PHPIZE_DEPS \
  && pecl install redis \
  && pecl install pcov \
  && docker-php-ext-enable pcov \
  && docker-php-ext-enable redis \
  && apk del $PHPIZE_DEPS

WORKDIR /var/www

COPY --from=builder /app .

COPY config/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN dos2unix /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
