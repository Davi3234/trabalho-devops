<?php

namespace App\Domain\Shared\Service;

interface EventPublisherInterface{
    public function publish(string $event, array $data): void;
}
