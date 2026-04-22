<?php

namespace Tests\Unit\Application\UseCase;

use App\Application\UseCase\ProcessPayment\ProcessPaymentDTO;
use App\Application\UseCase\ProcessPayment\ProcessPaymentHandler;
use App\Application\UseCase\ProcessPayment\ProcessPaymentResponseDTO;
use App\Domain\Payment\Repository\PaymentRepositoryInterface;
use App\Domain\Payment\Service\PaymentService;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;
use PHPUnit\Framework\TestCase;

class ProcessPaymentHandlerTest extends TestCase{
    private ProcessPaymentHandler $handler;
    private PaymentRepositoryInterface $repository;
    private PaymentService $service;

    protected function setUp(): void{
        $this->repository = $this->createMock(PaymentRepositoryInterface::class);
        $this->service = $this->createMock(PaymentService::class);
        $this->handler = new ProcessPaymentHandler($this->repository, $this->service);
    }

    public function testHandleSuccess(){
        $dto = new ProcessPaymentDTO('order_123', 100.00, 'credit_card', []);

        $this->service->method('processPayment')
            ->willReturn(['status' => 'confirmed', 'transaction_id' => 'txn_123']);

        $this->repository->expects($this->once())->method('save');

        $response = $this->handler->handle($dto);

        $this->assertInstanceOf(ProcessPaymentResponseDTO::class, $response);
        $this->assertEquals('confirmed', $response->getStatus());
    }

    public function testHandleFailure(){
        $dto = new ProcessPaymentDTO('order_123', 100.00, 'pix', []);

        $this->service->method('processPayment')
            ->willReturn(['status' => 'failed', 'reason' => 'Insufficient funds']);

        $this->repository->expects($this->once())->method('save');

        $response = $this->handler->handle($dto);

        $this->assertEquals('failed', $response->getStatus());
    }
}
