<?php

namespace Tests\Unit\Domain\User\Entity;

use App\Domain\User\Entity\User;
use App\Domain\User\ValueObject\Email;
use App\Domain\User\ValueObject\Password;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    public function testCreateUser(): void
    {
        $id = 1;
        $name = 'João Silva';
        $email = new Email('joao@example.com');
        $password = Password::fromPlain('senha123456');

        $user = new User($id, $name, $email, $password);

        $this->assertEquals($id, $user->id());
        $this->assertEquals($name, $user->name());
        $this->assertEquals($email, $user->email());
        $this->assertEquals($password, $user->password());
    }

    public function testUserIdGetter(): void
    {
        $user = new User(42, 'Maria', new Email('maria@example.com'), Password::fromPlain('senha654321'));

        $this->assertEquals(42, $user->id());
        $this->assertIsInt($user->id());
    }

    public function testUserNameGetter(): void
    {
        $name = 'Carlos Alberto';
        $user = new User(1, $name, new Email('carlos@example.com'), Password::fromPlain('pass123456'));

        $this->assertEquals($name, $user->name());
    }

    public function testUserEmailGetter(): void
    {
        $email = new Email('teste@example.com');
        $user = new User(1, 'Teste', $email, Password::fromPlain('senha123456'));

        $this->assertEquals($email, $user->email());
        $this->assertInstanceOf(Email::class, $user->email());
    }

    public function testUserPasswordGetter(): void
    {
        $password = Password::fromPlain('securepass2024');
        $user = new User(1, 'Usuario', new Email('user@example.com'), $password);

        $this->assertEquals($password, $user->password());
        $this->assertInstanceOf(Password::class, $user->password());
    }

    public function testChangeNameSuccess(): void
    {
        $user = new User(1, 'Nome Antigo', new Email('user@example.com'), Password::fromPlain('senha123456'));

        $newName = 'Nome Novo';
        $user->changeName($newName);

        $this->assertEquals($newName, $user->name());
    }

    public function testChangeNameThrowsExceptionForEmpty(): void
    {
        $user = new User(1, 'Original Name', new Email('user@example.com'), Password::fromPlain('senha123456'));

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Name cannot be empty");

        $user->changeName('');
    }

    public function testChangeNameThrowsExceptionForEmptyAfterTrim(): void
    {
        $user = new User(1, 'Original', new Email('user@example.com'), Password::fromPlain('senha123456'));

        $this->expectException(\InvalidArgumentException::class);
        $user->changeName('   '); // Only spaces
    }

    public function testChangeEmailSuccess(): void
    {
        $originalEmail = new Email('original@example.com');
        $user = new User(1, 'Usuario', $originalEmail, Password::fromPlain('senha123456'));

        $newEmail = new Email('novo@example.com');
        $user->changeEmail($newEmail);

        $this->assertEquals($newEmail, $user->email());
        $this->assertTrue($user->email()->equals($newEmail));
    }

    public function testVerifyPasswordSuccess(): void
    {
        $plainPassword = 'meuPassword123';
        $password = Password::fromPlain($plainPassword);
        $user = new User(1, 'Usuario', new Email('user@example.com'), $password);

        $this->assertTrue($user->verifyPassword($plainPassword));
    }

    public function testVerifyPasswordFailure(): void
    {
        $password = Password::fromPlain('senhaCorreta123');
        $user = new User(1, 'Usuario', new Email('user@example.com'), $password);

        $this->assertFalse($user->verifyPassword('senhaErrada'));
    }

    public function testVerifyPasswordCaseSensitive(): void
    {
        $password = Password::fromPlain('SenhaComMaiuscula');
        $user = new User(1, 'Usuario', new Email('user@example.com'), $password);

        $this->assertFalse($user->verifyPassword('senhacommaiuscula')); // Different case
    }

    public function testUserWithSpecialCharactersInName(): void
    {
        $specialName = "José da Silva O'Connor";
        $user = new User(1, $specialName, new Email('jose@example.com'), Password::fromPlain('senha123456'));

        $this->assertEquals($specialName, $user->name());
    }

    public function testChangeMultipleProperties(): void
    {
        $user = new User(10, 'Initial Name', new Email('initial@example.com'), Password::fromPlain('senha123456'));

        $user->changeName('Updated Name');
        $user->changeEmail(new Email('updated@example.com'));

        $this->assertEquals('Updated Name', $user->name());
        $this->assertTrue($user->email()->equals(new Email('updated@example.com')));
    }
}

