<?php

namespace App\Interfaces\Http\Middleware;

use App\Infrastructure\Service\PrometheusService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class PrometheusMetricsMiddleware
{
    public function __construct(private readonly PrometheusService $prometheus) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (str_starts_with($request->getPathInfo(), '/actuator/prometheus')) {
            return $next($request);
        }

        $startedAt = microtime(true);
        $response  = $next($request);

        try {
            $this->prometheus->incrementHttpRequests(
                $request->getMethod(),
                $request->getPathInfo(),
                $response->getStatusCode(),
            );
            $this->prometheus->observeHttpDuration(
                $request->getMethod(),
                $request->getPathInfo(),
                $response->getStatusCode(),
                microtime(true) - $startedAt,
            );
            $this->prometheus->updateMemoryUsage();
        } catch (Throwable $e) {
            \Log::error('Prometheus: ' . $e->getMessage());
        }

        return $response;
    }
}
