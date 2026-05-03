<?php

namespace Tests\Unit\Domain\Exceptions;

use App\Domain\Exceptions\PaymentFailedException;
use PHPUnit\Framework\TestCase;

class PaymentFailedExceptionTest extends TestCase{
    public function testConstructWithDefaultMessage(): void{
        $exception = new PaymentFailedException();

        $this->assertEquals('Pagamento falhou', $exception->getMessage());
    }

    public function testConstructWithCustomMessage(): void{
        $message = 'Insufficient funds';
        $exception = new PaymentFailedException($message);

        $this->assertEquals($message, $exception->getMessage());
    }

    public function testExceptionIsThrowable(): void{
        try {
            throw new PaymentFailedException('Test error');
            $this->fail('Should have thrown exception');
        } catch (PaymentFailedException $e) {
            $this->assertEquals('Test error', $e->getMessage());
        }
    }

    public function testErrorCodeProperty(): void{
        $exception = new PaymentFailedException();

        $reflection = new \ReflectionClass($exception);
        $property = $reflection->getProperty('errorCode');
        $property->setAccessible(true);

        $this->assertEquals('PAYMENT_FAILED', $property->getValue($exception));
    }

    public function testHttpStatusProperty(): void{
        $exception = new PaymentFailedException();

        $reflection = new \ReflectionClass($exception);
        $property = $reflection->getProperty('httpStatus');
        $property->setAccessible(true);

        $this->assertEquals(400, $property->getValue($exception)); // HTTP 400 Bad Request
    }
}

