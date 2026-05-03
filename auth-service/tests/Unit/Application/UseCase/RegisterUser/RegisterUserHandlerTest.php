<?php

namespace Tests\Unit\Application\UseCase\RegisterUser;

use App\Application\UseCase\RegisterUser\RegisterUserDTO;
use App\Application\UseCase\RegisterUser\RegisterUserHandler;
use App\Application\UseCase\RegisterUser\RegisterUserResponseDTO;
use App\Domain\Exceptions\EmailAlreadyInUseException;
use App\Domain\User\Repository\UserRepositoryInterface;
use App\Domain\User\ValueObject\Email;
use PHPUnit\Framework\TestCase;

class RegisterUserHandlerTest extends TestCase
{
    private RegisterUserHandler $handler;
    private UserRepositoryInterface $repository;

    protected function setUp(): void
    {
        $this->repository = \Mockery::mock(UserRepositoryInterface::class);
        $this->handler = new RegisterUserHandler($this->repository);
    }

    public function testRegisterUserSuccess(): void
    {
        $dto = new RegisterUserDTO('João Silva', 'joao@example.com', 'senha123456');

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn(null);

        $this->repository->shouldReceive('save')
            ->once()
            ->andReturn(1);

        $response = $this->handler->handle($dto);

        $this->assertInstanceOf(RegisterUserResponseDTO::class, $response);
        $this->assertEquals(1, $response->getId());
        $this->assertEquals('joao@example.com', $response->getEmail());
        $this->assertEquals('João Silva', $response->getName());

        \Mockery::close();
    }

    public function testRegisterUserWithEmailAlreadyInUse(): void
    {
        $dto = new RegisterUserDTO('Maria Silva', 'maria@example.com', 'senha654321');

        $existingUserMock = \Mockery::mock();

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn($existingUserMock);

        $this->expectException(EmailAlreadyInUseException::class);
        $this->handler->handle($dto);

        \Mockery::close();
    }

    public function testRegisterUserWithInvalidEmail(): void
    {
        $dto = new RegisterUserDTO('Invalid User', 'invalid-email', 'senha123456');

        try {
            $this->handler->handle($dto);
            $this->fail('Should have thrown exception for invalid email');
        } catch (\App\Domain\Exceptions\InvalidEmailException $e) {
            $this->assertTrue(true);
        }
    }

    public function testRegisterUserWithShortPassword(): void
    {
        $dto = new RegisterUserDTO('User', 'user@example.com', 'short');

        try {
            $this->handler->handle($dto);
            $this->fail('Should have thrown exception for short password');
        } catch (\App\Domain\Exceptions\InvalidAutenticationException $e) {
            $this->assertTrue(true);
        }
    }

    public function testRegisterUserWithSpecialCharactersInName(): void
    {
        $dto = new RegisterUserDTO("José da Silva O'Connor", 'jose@example.com', 'senha123456');

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn(null);

        $this->repository->shouldReceive('save')
            ->once()
            ->andReturn(2);

        $response = $this->handler->handle($dto);

        $this->assertEquals("José da Silva O'Connor", $response->getName());

        \Mockery::close();
    }

    public function testRegisterUserMultipleTimes(): void
    {
        $dto1 = new RegisterUserDTO('User One', 'user1@example.com', 'senha123456');
        $dto2 = new RegisterUserDTO('User Two', 'user2@example.com', 'senha654321');

        $this->repository->shouldReceive('findByEmail')
            ->times(2)
            ->andReturn(null);

        $this->repository->shouldReceive('save')
            ->times(2)
            ->andReturnValues([1, 2]);

        $response1 = $this->handler->handle($dto1);
        $response2 = $this->handler->handle($dto2);

        $this->assertEquals(1, $response1->getId());
        $this->assertEquals(2, $response2->getId());

        \Mockery::close();
    }
}

