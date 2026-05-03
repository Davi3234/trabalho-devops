<?php

namespace Tests\Unit\Infrastructure\Persistence\Repository;

use App\Domain\User\Entity\User;
use App\Domain\User\Repository\UserRepositoryInterface;
use App\Domain\User\ValueObject\Email;
use App\Domain\User\ValueObject\Password;
use App\Infrastructure\Persistence\Eloquent\UserEloquent;
use App\Infrastructure\Persistence\Repository\UserRepository;
use PHPUnit\Framework\TestCase;

class UserRepositoryTest extends TestCase
{
    private UserRepository $repository;

    protected function setUp(): void
    {
        $this->repository = new UserRepository();
    }

    public function testImplementsRepositoryInterface(): void
    {
        $this->assertInstanceOf(UserRepositoryInterface::class, $this->repository);
    }

    public function testSaveUserReturnsId(): void
    {
        $user = new User(0, 'João Silva', new Email('joao@example.com'), Password::fromPlain('senha123456'));

        // Mock UserEloquent::create
        $userEloquentMock = \Mockery::mock(UserEloquent::class);
        $userEloquentMock->id = 1;

        $userEloquentClassMock = \Mockery::mock('overload:' . UserEloquent::class);
        $userEloquentClassMock->shouldReceive('create')
            ->once()
            ->andReturn($userEloquentMock);

        $id = $this->repository->save($user);

        $this->assertEquals(1, $id);

        \Mockery::close();
    }

    public function testFindByEmailReturnsUser(): void
    {
        $email = new Email('maria@example.com');

        $userEloquentMock = \Mockery::mock(UserEloquent::class);
        $userEloquentMock->id = 2;
        $userEloquentMock->name = 'Maria Silva';
        $userEloquentMock->email = 'maria@example.com';
        $userEloquentMock->password = password_hash('senha654321', PASSWORD_BCRYPT);

        $queryMock = \Mockery::mock();
        $queryMock->shouldReceive('first')
            ->andReturn($userEloquentMock);

        $userEloquentClassMock = \Mockery::mock('overload:' . UserEloquent::class);
        $userEloquentClassMock->shouldReceive('where')
            ->with('email', 'maria@example.com')
            ->andReturn($queryMock);

        $result = $this->repository->findByEmail($email);

        $this->assertInstanceOf(User::class, $result);
        $this->assertEquals('maria@example.com', $result->email()->value());
        $this->assertEquals('Maria Silva', $result->name());

        \Mockery::close();
    }

    public function testFindByEmailReturnsNullWhenNotFound(): void
    {
        $email = new Email('nope@example.com');

        $queryMock = \Mockery::mock();
        $queryMock->shouldReceive('first')
            ->andReturn(null);

        $userEloquentClassMock = \Mockery::mock('overload:' . UserEloquent::class);
        $userEloquentClassMock->shouldReceive('where')
            ->with('email', 'nope@example.com')
            ->andReturn($queryMock);

        $result = $this->repository->findByEmail($email);

        $this->assertNull($result);

        \Mockery::close();
    }

    public function testFindByIdReturnsUser(): void
    {
        $userId = 3;

        $userEloquentMock = \Mockery::mock(UserEloquent::class);
        $userEloquentMock->id = 3;
        $userEloquentMock->name = 'Pedro Santos';
        $userEloquentMock->email = 'pedro@example.com';
        $userEloquentMock->password = password_hash('senha999999', PASSWORD_BCRYPT);

        $userEloquentClassMock = \Mockery::mock('overload:' . UserEloquent::class);
        $userEloquentClassMock->shouldReceive('find')
            ->with(3)
            ->andReturn($userEloquentMock);

        $result = $this->repository->findById($userId);

        $this->assertInstanceOf(User::class, $result);
        $this->assertEquals(3, $result->id());
        $this->assertEquals('pedro@example.com', $result->email()->value());

        \Mockery::close();
    }

    public function testFindByIdReturnsNullWhenNotFound(): void
    {
        $userId = 999;

        $userEloquentClassMock = \Mockery::mock('overload:' . UserEloquent::class);
        $userEloquentClassMock->shouldReceive('find')
            ->with(999)
            ->andReturn(null);

        $result = $this->repository->findById($userId);

        $this->assertNull($result);

        \Mockery::close();
    }

    public function testSaveUserWithSpecialCharactersInName(): void
    {
        $user = new User(0, "José da Silva O'Connor", new Email('jose@example.com'), Password::fromPlain('senha123456'));

        $userEloquentMock = \Mockery::mock(UserEloquent::class);
        $userEloquentMock->id = 4;

        $userEloquentClassMock = \Mockery::mock('overload:' . UserEloquent::class);
        $userEloquentClassMock->shouldReceive('create')
            ->once()
            ->with(\Mockery::subset([
                'name' => "José da Silva O'Connor",
                'email' => 'jose@example.com'
            ]))
            ->andReturn($userEloquentMock);

        $id = $this->repository->save($user);

        $this->assertEquals(4, $id);

        \Mockery::close();
    }

    public function testRepositoryConvertsToDomain(): void
    {
        // Test that repository properly converts Eloquent models to domain entities
        $email = new Email('test@example.com');

        $userEloquentMock = \Mockery::mock(UserEloquent::class);
        $userEloquentMock->id = 10;
        $userEloquentMock->name = 'Test User';
        $userEloquentMock->email = 'test@example.com';
        $userEloquentMock->password = password_hash('pass123456', PASSWORD_BCRYPT);

        $queryMock = \Mockery::mock();
        $queryMock->shouldReceive('first')
            ->andReturn($userEloquentMock);

        $userEloquentClassMock = \Mockery::mock('overload:' . UserEloquent::class);
        $userEloquentClassMock->shouldReceive('where')
            ->with('email', 'test@example.com')
            ->andReturn($queryMock);

        $result = $this->repository->findByEmail($email);

        $this->assertInstanceOf(User::class, $result);
        $this->assertInstanceOf(Email::class, $result->email());
        $this->assertInstanceOf(Password::class, $result->password());

        \Mockery::close();
    }
}

