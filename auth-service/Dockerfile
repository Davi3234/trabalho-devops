# Stage builder
FROM php:8.3-fpm-alpine AS builder

RUN apk add --no-cache \
    unzip \
    curl \
    libzip-dev \
    linux-headers \
  && docker-php-ext-install zip

RUN apk add --no-cache $PHPIZE_DEPS \
  && pecl install redis \
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
    linux-headers \
  && docker-php-ext-install zip

RUN apk add --no-cache $PHPIZE_DEPS \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && apk del $PHPIZE_DEPS

WORKDIR /var/www

COPY --from=builder /app              .

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
