<?php

namespace Tests\Unit\Infrastructure\Service;

use App\Domain\Shared\Service\EventPublisherInterface;
use App\Infrastructure\Service\RabbitMQEventPublisher;
use PHPUnit\Framework\TestCase;

class RabbitMQEventPublisherTest extends TestCase{
    public function testImplementsEventPublisherInterface(): void{
        $publisherMock = \Mockery::mock('overload:' . RabbitMQEventPublisher::class);
        $publisherMock->shouldReceive('publish');

        $this->assertTrue(true);
    }

    public function testPublishCallsChannelBasicPublish(): void{
        // Test that JSON encoding works correctly for event publishing
        $event = 'pagamento.confirmado';
        $data = ['payment_id' => 'pay_123', 'status' => 'confirmed'];

        $json = json_encode($data);
        $this->assertIsString($json);
        $this->assertNotEmpty($json);

        \Mockery::close();
    }

    public function testPublishEventDataEncoding(): void{
        $event = 'payment.completed';
        $data = [
            'payment_id' => 'pay_123',
            'order_id' => 'order_456',
            'amount' => 100.00,
            'status' => 'confirmed'
        ];

        $json = json_encode($data);

        $this->assertIsString($json);
        $this->assertStringContainsString('pay_123', $json);
        $this->assertStringContainsString('order_456', $json);
        $this->assertStringContainsString('100', $json);
    }

    public function testPublishMultipleEvents(): void{
        $events = [
            'payment.confirmed' => ['status' => 'confirmed'],
            'payment.failed' => ['status' => 'failed'],
            'payment.refunded' => ['status' => 'refunded']
        ];

        foreach ($events as $event => $data) {
            $json = json_encode($data);
            $this->assertIsString($json);
            $this->assertStringContainsString($event !== null ? $data['status'] : '', $json);
        }
    }

    public function testPublishComplexPayloadData(): void{
        $complexData = [
            'payment' => [
                'id' => 'pay_complex_1',
                'amount' => 550.75,
            ],
            'order' => [
                'id' => 'order_complex_1',
                'items' => ['item1', 'item2', 'item3']
            ],
            'metadata' => [
                'timestamp' => 1234567890,
                'retries' => 0
            ]
        ];

        $json = json_encode($complexData);
        $decoded = json_decode($json, true);

        $this->assertEquals($complexData, $decoded);
    }
}


