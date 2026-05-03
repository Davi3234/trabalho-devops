<?php

namespace Tests\Unit\Infrastructure\Repository;

use App\Domain\Payment\Repository\PaymentRepositoryInterface;
use App\Infrastructure\Repository\PaymentRepository;
use PHPUnit\Framework\TestCase;

class PaymentRepositoryTest extends TestCase{
    private PaymentRepository $repository;

    protected function setUp(): void{
        $this->repository = new PaymentRepository();
    }

    protected function tearDown(): void{
        \Mockery::close();
    }

    public function testImplementsRepositoryInterface(): void{
        $this->assertInstanceOf(PaymentRepositoryInterface::class, $this->repository);
    }

    public function testRepositoryStructure(): void{
        $this->assertTrue(method_exists($this->repository, 'save'));
        $this->assertTrue(method_exists($this->repository, 'findById'));
        $this->assertTrue(method_exists($this->repository, 'findByOrderId'));
    }

    public function testRepositoryHasRequiredMethods(): void{
        $reflection = new \ReflectionClass($this->repository);
        $methods = $reflection->getMethods();

        $methodNames = array_map(function($method) {
            return $method->getName();
        }, $methods);

        $this->assertContains('save', $methodNames);
        $this->assertContains('findById', $methodNames);
        $this->assertContains('findByOrderId', $methodNames);
    }

    public function testRepositoryCanBeInstantiated(): void{
        $this->assertNotNull($this->repository);
        $this->assertIsObject($this->repository);
    }
}

