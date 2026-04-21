<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider{

    /**
     * Register any application services.
     * @return void
     */
    public function register(){
        $this->app->bind(\App\Domain\Payment\Repository\PaymentRepositoryInterface::class, \App\Infrastructure\Repository\PaymentRepository::class);
        $this->app->bind(\App\Domain\Payment\Service\PaymentGatewayInterface::class, \App\Infrastructure\Service\MockPaymentGateway::class);
    }
}
