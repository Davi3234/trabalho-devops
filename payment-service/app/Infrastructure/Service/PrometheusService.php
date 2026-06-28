<?php

namespace App\Infrastructure\Service;

use Predis\Client as PredisClient;
use Prometheus\CollectorRegistry;
use Prometheus\Counter;
use Prometheus\Gauge;
use Prometheus\Histogram;
use Prometheus\Storage\InMemory;
use Prometheus\Storage\Predis;

class PrometheusService
{
    private CollectorRegistry $registry;
    private Counter $httpRequestsTotal;
    private Histogram $httpRequestDuration;
    private Gauge $memoryResident;

    private const NAMESPACE = 'payment_service';

    public function __construct()
    {
        $this->registry = $this->buildRegistry();
        $this->registerMetrics();
    }

    public function incrementHttpRequests(string $method, string $uri, int $status): void
    {
        $this->httpRequestsTotal->inc([
            'method' => strtoupper($method),
            'uri'    => $this->normalizeUri($uri),
            'status' => (string) $status,
        ]);
    }

    public function observeHttpDuration(string $method, string $uri, int $status, float $durationSeconds): void
    {
        $this->httpRequestDuration->observe($durationSeconds, [
            'method' => strtoupper($method),
            'uri'    => $this->normalizeUri($uri),
            'status' => (string) $status,
        ]);
    }

    public function updateMemoryUsage(): void
    {
        $this->memoryResident->set(memory_get_usage(true));
    }

    public function getRegistry(): CollectorRegistry
    {
        return $this->registry;
    }

    private function buildRegistry(): CollectorRegistry{
        try {
            $adapter = new Predis([
                'scheme'   => 'tcp',
                'host'     => env('REDIS_HOST', '127.0.0.1'),
                'port'     => (int) env('REDIS_PORT', 6379),
                'password' => env('REDIS_PASSWORD', null),
                'database' => (int) env('REDIS_DB', 0),
            ]);
            return new CollectorRegistry($adapter);
        } catch (\Throwable $e) {
            return new CollectorRegistry(new InMemory());
        }
    }

    private function registerMetrics(): void
    {
        $labels = ['method', 'uri', 'status'];

        $this->httpRequestsTotal = $this->registry->getOrRegisterCounter(
            self::NAMESPACE,
            'http_requests_total',
            'Total de requisições HTTP recebidas',
            $labels,
        );

        $this->httpRequestDuration = $this->registry->getOrRegisterHistogram(
            self::NAMESPACE,
            'http_request_duration_seconds',
            'Duração das requisições HTTP em segundos',
            $labels,
            [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        );

        $this->memoryResident = $this->registry->getOrRegisterGauge(
            self::NAMESPACE,
            'process_resident_memory_bytes',
            'Memória residente do processo PHP em bytes',
        );
    }

    private function normalizeUri(string $uri): string
    {
        $uri = strtok($uri, '?') ?: $uri;
        $uri = preg_replace('/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i', '{uuid}', $uri);
        $uri = preg_replace('/\/\d+/', '/{id}', $uri);
        return $uri;
    }
}
