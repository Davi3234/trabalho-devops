<?php

namespace App\Interfaces\Http\Controller;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Laravel\Lumen\Routing\Controller as BaseController;

class SwaggerController extends BaseController
{
    public function ui(): Response
    {
        $specUrl = url('/docs/openapi.json');
        $html = <<<HTML
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Service — API Docs</title>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
              window.onload = function () {
                SwaggerUIBundle({
                  url: "{$specUrl}",
                  dom_id: '#swagger-ui',
                  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                  layout: "BaseLayout"
                })
              }
            </script>
          </body>
        </html>
        HTML;

        return response($html, 200, ['Content-Type' => 'text/html']);
    }

    public function spec(): JsonResponse
    {
        $spec = [
            'openapi' => '3.0.0',
            'info' => [
                'title'       => 'Payment Service',
                'description' => 'API de processamento de pagamentos — microsserviço responsável por cobranças, métodos de pagamento e integração com gateway.',
                'version'     => '1.0.0',
            ],
            'tags' => [
                ['name' => 'Pagamentos', 'description' => 'Processamento de cobranças'],
            ],
            'paths' => [
                '/process' => [
                    'post' => [
                        'tags'    => ['Pagamentos'],
                        'summary' => 'Processar pagamento',
                        'requestBody' => [
                            'required' => true,
                            'content'  => [
                                'application/json' => [
                                    'schema' => [
                                        'type'     => 'object',
                                        'required' => ['order_id', 'amount', 'method'],
                                        'properties' => [
                                            'order_id'     => ['type' => 'string',  'example' => 'uuid-1234'],
                                            'amount'       => ['type' => 'number',  'example' => 99.90],
                                            'method'       => ['type' => 'string',  'enum' => ['credit_card', 'pix', 'boleto']],
                                            'payment_data' => ['type' => 'object'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Pagamento processado com sucesso',
                                'content' => [
                                    'application/json' => [
                                        'schema' => [
                                            'type'       => 'object',
                                            'properties' => [
                                                'success' => ['type' => 'boolean', 'example' => true],
                                                'data'    => ['type' => 'object'],
                                                'message' => ['type' => 'string', 'example' => 'Pagamento processado com sucesso.'],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                            '422' => ['description' => 'Dados inválidos'],
                        ],
                    ],
                ],
                '/events/stock-reserved' => [
                    'post' => [
                        'tags'    => ['Pagamentos'],
                        'summary' => 'Processar pagamento via evento de estoque reservado (saga)',
                        'requestBody' => [
                            'required' => true,
                            'content'  => [
                                'application/json' => [
                                    'schema' => [
                                        'type'       => 'object',
                                        'properties' => [
                                            'order_id'     => ['type' => 'string',  'example' => 'uuid-1234'],
                                            'amount'       => ['type' => 'number',  'example' => 99.90],
                                            'method'       => ['type' => 'string',  'example' => 'credit_card'],
                                            'payment_data' => ['type' => 'object'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Pagamento processado'],
                            '400' => ['description' => 'Erro no processamento'],
                        ],
                    ],
                ],
            ],
        ];

        return response()->json($spec);
    }
}
