<?php

namespace App\Infrastructure\Service;

use App\Domain\Shared\Service\EventPublisherInterface;
use Illuminate\Support\Facades\Log;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class RabbitMQEventPublisher implements EventPublisherInterface {
    private AMQPStreamConnection $connection;
    private $channel;

    public function __construct() {
        $this->connection = new AMQPStreamConnection(
            getenv('RABBITMQ_HOST'),
            getenv('RABBITMQ_PORT'),
            getenv('RABBITMQ_USER'),
            getenv('RABBITMQ_PASSWORD')
        );
        $this->channel = $this->connection->channel();
        $this->channel->exchange_declare('payment.events', 'topic', false, true, false);
    }

    public function publish(string $event, array $data): void {
        $message = new AMQPMessage(json_encode($data));
        $this->channel->basic_publish($message, 'payment.events', $event);
        Log::info("Event publish \"{$event}\"");
    }

    public function __destruct() {
        $this->channel->close();
        $this->connection->close();
    }
}
