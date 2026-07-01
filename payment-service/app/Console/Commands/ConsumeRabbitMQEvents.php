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

        $connection = $this->connectWithRetry();
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

    private function connectWithRetry(): AMQPStreamConnection
    {
        $host     = getenv('RABBITMQ_HOST')     ?: 'rabbitmq';
        $port     = getenv('RABBITMQ_PORT')     ?: 5672;
        $user     = getenv('RABBITMQ_USER')     ?: 'guest';
        $password = getenv('RABBITMQ_PASSWORD') ?: 'guest';

        $attempts = 0;
        $maxAttempts = 10;

        while (true) {
            try {
                $attempts++;
                $this->info("Connecting to RabbitMQ at {$host}:{$port} (attempt {$attempts})...");
                return new AMQPStreamConnection($host, $port, $user, $password);
            } catch (\Exception $e) {
                if ($attempts >= $maxAttempts) {
                    $this->error("Could not connect to RabbitMQ after {$maxAttempts} attempts.");
                    throw $e;
                }
                $this->warn("Connection failed: {$e->getMessage()}. Retrying in 5s...");
                sleep(5);
            }
        }
    }

    private function processOrderCreatedEvent(array $data, Client $httpClient){
        try {
            $orderId = $data['orderId'];

            $amount = $data['totalAmount'];

            $method = 'credit_card';

            $paymentData = [];

            $paymentUrl = rtrim(getenv('PAYMENT_SERVICE_URL') ?: 'http://payment-nginx:5002', '/');
            $response = $httpClient->post("{$paymentUrl}/events/stock-reserved", [
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
