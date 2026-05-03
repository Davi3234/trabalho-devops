<?php

namespace Tests\Unit\Domain\Exceptions;

use App\Domain\Exceptions\EmailAlreadyInUseException;
use App\Domain\Exceptions\InvalidAutenticationException;
use App\Domain\Exceptions\UserNotFound;
use App\Domain\Exceptions\InvalidEmailException;
use PHPUnit\Framework\TestCase;

class AuthExceptionsTest extends TestCase
{
    public function testEmailAlreadyInUseException(): void
    {
        $exception = new EmailAlreadyInUseException('test@example.com');

        $this->assertThrowable($exception, 'EMAIL_IN_USE', 409);
    }

    public function testEmailAlreadyInUseExceptionDefaultMessage(): void
    {
        $exception = new EmailAlreadyInUseException();

        $this->assertInstanceOf(\Exception::class, $exception);
    }

    public function testUserNotFoundException(): void
    {
        $exception = new UserNotFound('user@example.com');

        $this->assertThrowable($exception, 'USER_NOT_FOUND', 401);
    }

    public function testUserNotFoundExceptionDefaultMessage(): void
    {
        $exception = new UserNotFound();

        $this->assertInstanceOf(\Exception::class, $exception);
    }

    public function testInvalidAutenticationException(): void
    {
        $exception = new InvalidAutenticationException();

        $this->assertThrowable($exception, 'INVALID_AUTENTICATION', 401);
    }

    public function testInvalidAutenticationExceptionWithMessage(): void
    {
        $message = 'Credenciais inválidas';
        $exception = new InvalidAutenticationException($message);

        $this->assertInstanceOf(\Exception::class, $exception);
    }

    public function testInvalidEmailException(): void
    {
        $exception = new InvalidEmailException();

        $this->assertInstanceOf(\Exception::class, $exception);
    }

    public function testExceptionsAreThrowable(): void
    {
        try {
            throw new EmailAlreadyInUseException('test@example.com');
            $this->fail('Should throw exception');
        } catch (EmailAlreadyInUseException $e) {
            $this->assertInstanceOf(EmailAlreadyInUseException::class, $e);
        }

        try {
            throw new UserNotFound('user@example.com');
            $this->fail('Should throw exception');
        } catch (UserNotFound $e) {
            $this->assertInstanceOf(UserNotFound::class, $e);
        }

        try {
            throw new InvalidAutenticationException();
            $this->fail('Should throw exception');
        } catch (InvalidAutenticationException $e) {
            $this->assertInstanceOf(InvalidAutenticationException::class, $e);
        }
    }

    private function assertThrowable(\Exception $exception, string $expectedCode, int $expectedStatus): void
    {
        $reflection = new \ReflectionClass($exception);

        if ($reflection->hasProperty('errorCode')) {
            $codeProperty = $reflection->getProperty('errorCode');
            $codeProperty->setAccessible(true);
            $this->assertEquals($expectedCode, $codeProperty->getValue($exception));
        }

        if ($reflection->hasProperty('httpStatus')) {
            $statusProperty = $reflection->getProperty('httpStatus');
            $statusProperty->setAccessible(true);
            $this->assertEquals($expectedStatus, $statusProperty->getValue($exception));
        }
    }
}

