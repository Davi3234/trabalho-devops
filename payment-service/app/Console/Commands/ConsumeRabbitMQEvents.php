<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use GuzzleHttp\Client;

class ConsumeRabbitMQEvents extends Command{

    protected $signature = 'rabbitmq:consume';


    protected $description = 'Consume RabbitMQ events and trigger payment processing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting RabbitMQ consumer...');

        $connection = new AMQPStreamConnection(
            getenv('RABBITMQ_HOST') ?: 'rabbitmq',
            getenv('RABBITMQ_PORT') ?: 5672,
            getenv('RABBITMQ_USER') ?: 'guest',
            getenv('RABBITMQ_PASSWORD') ?: 'guest'
        );

        $channel = $connection->channel();

        $queue_name = 'payment.pedido.aprovado';
        $channel->queue_declare($queue_name, false, true, false, false);
        $channel->queue_bind($queue_name, 'order.events', 'order.pedido.aprovado');

        $this->info("Waiting for order.pedido.aprovado events. To exit press CTRL+C");

        $httpClient = new Client();

        $callback = function ($msg) use ($httpClient) {
            $data = json_decode($msg->body, true);

            if ($data && isset($data['orderId'])) {
                $this->info("Received event payment.pedido.aprovado for order {$data['orderId']}");

                $this->processOrderCreatedEvent($data, $httpClient);
            }

            $msg->ack();
        };

        $channel->basic_consume($queue_name, '', false, false, false, false, $callback);

        while ($channel->is_consuming()) {
            $channel->wait();
        }

        $channel->close();
        $connection->close();
    }

    private function processOrderCreatedEvent(array $data, Client $httpClient){
        try {
            $orderId = $data['orderId'];

            $amount = $data['totalAmount'];

            $method = 'credit_card';

            $paymentData = [];

            $response = $httpClient->post('http://payment-nginx:5002/events/stock-reserved', [
                'json' => [
                    'order_id' => $orderId,
                    'amount' => $amount,
                    'method' => $method,
                    'payment_data' => $paymentData,
                ]
            ]);

            if ($response->getStatusCode() === 200) {
                $this->info("Payment processed successfully for order {$orderId}");
            } else {
                $this->error("Failed to process payment for order {$orderId}: " . $response->getBody());
            }
        } catch (\Exception $e) {
            $this->error("Error processing order created event: " . $e->getMessage());
        }
    }
}
