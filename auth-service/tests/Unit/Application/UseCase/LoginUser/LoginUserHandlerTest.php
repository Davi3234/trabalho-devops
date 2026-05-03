<?php

namespace Tests\Unit\Application\UseCase\LoginUser;

use App\Application\UseCase\LoginUser\LoginUserDTO;
use App\Application\UseCase\LoginUser\LoginUserHandler;
use App\Application\UseCase\LoginUser\LoginUserResponseDTO;
use App\Domain\Auth\Service\TokenService;
use App\Domain\Exceptions\InvalidAutenticationException;
use App\Domain\Exceptions\UserNotFound;
use App\Domain\User\Entity\User;
use App\Domain\User\Repository\UserRepositoryInterface;
use App\Domain\User\ValueObject\Email;
use App\Domain\User\ValueObject\Password;
use PHPUnit\Framework\TestCase;

class LoginUserHandlerTest extends TestCase
{
    private LoginUserHandler $handler;
    private UserRepositoryInterface $repository;
    private TokenService $tokenService;

    protected function setUp(): void
    {
        $this->repository = \Mockery::mock(UserRepositoryInterface::class);
        $this->tokenService = \Mockery::mock(TokenService::class);
        $this->handler = new LoginUserHandler($this->repository, $this->tokenService);
    }

    public function testLoginUserSuccess(): void
    {
        $dto = new LoginUserDTO('joao@example.com', 'senha123456');

        $user = new User(1, 'João Silva', new Email('joao@example.com'), Password::fromPlain('senha123456'));

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn($user);

        $this->tokenService->shouldReceive('generate')
            ->once()
            ->with(1, 'joao@example.com')
            ->andReturn('fake_jwt_token_123');

        $response = $this->handler->handle($dto);

        $this->assertInstanceOf(LoginUserResponseDTO::class, $response);
        $this->assertEquals('fake_jwt_token_123', $response->getToken());
        $this->assertEquals(1, $response->getId());
        $this->assertEquals('joao@example.com', $response->getEmail());

        \Mockery::close();
    }

    public function testLoginUserNotFound(): void
    {
        $dto = new LoginUserDTO('nonexistent@example.com', 'senha123456');

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn(null);

        $this->expectException(UserNotFound::class);
        $this->handler->handle($dto);

        \Mockery::close();
    }

    public function testLoginUserWithIncorrectPassword(): void
    {
        $dto = new LoginUserDTO('joao@example.com', 'wrongpassword');

        $user = new User(1, 'João Silva', new Email('joao@example.com'), Password::fromPlain('senha123456'));

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn($user);

        $this->expectException(InvalidAutenticationException::class);
        $this->handler->handle($dto);

        \Mockery::close();
    }

    public fun ction testLoginUserWithInvalidEmail(): void
    {
        $dto = new LoginUserDTO('invalid-email', 'senha123456');

        try {
            $this->handler->handle($dto);
            $this->fail('Should have thrown exception for invalid email');
        } catch (\App\Domain\Exceptions\InvalidEmailException $e) {
            $this->assertTrue(true);
        }
    }

    public function testLoginUserWithDifferentCasePassword(): void
    {
        $dto = new LoginUserDTO('user@example.com', 'SenhaErrada123'); // Different case

        $user = new User(2, 'User', new Email('user@example.com'), Password::fromPlain('senhaerrada123'));

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn($user);

        $this->expectException(InvalidAutenticationException::class);
        $this->handler->handle($dto);

        \Mockery::close();
    }

    public function testLoginMultipleUsers(): void
    {
        $user1 = new User(1, 'Joao', new Email('joao@example.com'), Password::fromPlain('senha123456'));
        $user2 = new User(2, 'Maria', new Email('maria@example.com'), Password::fromPlain('senha654321'));

        $dto1 = new LoginUserDTO('joao@example.com', 'senha123456');
        $dto2 = new LoginUserDTO('maria@example.com', 'senha654321');

        $this->repository->shouldReceive('findByEmail')
            ->times(2)
            ->andReturnValues([$user1, $user2]);

        $this->tokenService->shouldReceive('generate')
            ->times(2)
            ->andReturnValues(['token_1', 'token_2']);

        $response1 = $this->handler->handle($dto1);
        $response2 = $this->handler->handle($dto2);

        $this->assertEquals('token_1', $response1->getToken());
        $this->assertEquals('token_2', $response2->getToken());

        \Mockery::close();
    }

    public function testLoginResponseContainsUserInfo(): void
    {
        $dto = new LoginUserDTO('user@example.com', 'password123456');

        $user = new User(99, 'Test User', new Email('user@example.com'), Password::fromPlain('password123456'));

        $this->repository->shouldReceive('findByEmail')
            ->once()
            ->andReturn($user);

        $this->tokenService->shouldReceive('generate')
            ->once()
            ->andReturn('jwt_token');

        $response = $this->handler->handle($dto);

        $this->assertEquals(99, $response->getId());
        $this->assertEquals('user@example.com', $response->getEmail());
        $this->assertEquals('Test User', $response->getName());

        \Mockery::close();
    }
}

