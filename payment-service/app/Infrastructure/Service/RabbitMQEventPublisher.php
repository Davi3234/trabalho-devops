<?php

namespace App\Infrastructure\Service;

use App\Domain\Shared\Service\EventPublisherInterface;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class RabbitMQEventPublisher implements EventPublisherInterface{
    private AMQPStreamConnection $connection;
    private $channel;

    public function __construct(){
        $this->connection = new AMQPStreamConnection(
            getenv('RABBITMQ_HOST') ?: 'rabbitmq',
            getenv('RABBITMQ_PORT') ?: 5672,
            getenv('RABBITMQ_USER') ?: 'guest',
            getenv('RABBITMQ_PASSWORD') ?: 'guest'
        );
        $this->channel = $this->connection->channel();
        $this->channel->exchange_declare('events', 'topic', false, false, false);
    }

    public function publish(string $event, array $data): void{
        $message = new AMQPMessage(json_encode($data));
        $this->channel->basic_publish($message, 'events', $event);
    }

    public function __destruct(){
        $this->channel->close();
        $this->connection->close();
    }
}
