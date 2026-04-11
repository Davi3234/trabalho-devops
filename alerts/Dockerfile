# Stage builder
FROM php:8.3-fpm-alpine AS builder

RUN apk add --no-cache \
    unzip \
    curl \
    libzip-dev \
    rabbitmq-c-dev \
    linux-headers \
  && docker-php-ext-install zip sockets

RUN apk add --no-cache $PHPIZE_DEPS \
  && pecl install amqp \
  && docker-php-ext-enable amqp

RUN pecl install redis \
  && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . .

RUN composer install --no-dev --optimize-autoloader

# Stage final

FROM php:8.3-fpm-alpine AS final

RUN apk add --no-cache \
    unzip \
    curl \
    libzip-dev \
    rabbitmq-c-dev \
    linux-headers \
  && docker-php-ext-install zip sockets

RUN apk add --no-cache $PHPIZE_DEPS \
  && pecl install amqp \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && docker-php-ext-enable amqp

WORKDIR /var/www

COPY --from=builder /app .

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 8000

CMD ["php-fpm"]
