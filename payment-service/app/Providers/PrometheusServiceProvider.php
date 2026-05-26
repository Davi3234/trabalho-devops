<?php

namespace App\Providers;

use App\Infrastructure\Service\PrometheusService;
use Illuminate\Support\ServiceProvider;

class PrometheusServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PrometheusService::class, fn () => new PrometheusService());
    }
}
