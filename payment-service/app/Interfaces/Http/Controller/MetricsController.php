<?php

namespace App\Interfaces\Http\Controller;

use App\Infrastructure\Service\PrometheusService;
use Prometheus\RenderTextFormat;

class MetricsController{
    public function __construct(private readonly PrometheusService $prometheus) {}

    public function __invoke(): \Illuminate\Http\Response
    {
        $renderer = new RenderTextFormat();
        $output   = $renderer->render($this->prometheus->getRegistry()->getMetricFamilySamples());

        return response($output, 200, ['Content-Type' => RenderTextFormat::MIME_TYPE]);
    }
}
