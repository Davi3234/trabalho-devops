<?php

namespace Tests;

use App\Domain\Exceptions\InvalidEmailException;
use App\Domain\Exceptions\InvalidPasswordException;
use App\Domain\User\ValueObject\Email;
use App\Domain\User\ValueObject\Password;
use Illuminate\Http\Response;
use Laravel\Lumen\Testing\TestCase as BaseTestCase;

class AuthServiceTest extends BaseTestCase{

    /**
     * Cria a aplicação.
     * @return \Laravel\Lumen\Application
     */
    public function createApplication(){
        return require __DIR__.'/../bootstrap/app.php';
    }

    /**
     * Testa a validação do objeto de valor email
     */
    public function testEmailValueObjectValidation(): void{

        $email = new Email('teste@example.com');
        $this->assertEquals('teste@example.com', $email->value());

        $this->expectException(InvalidEmailException::class);
        new Email('email-invalido');
    }

    /**
     * Testa a validação do objeto de valor da senha
     */
    public function testPasswordValueObjectHashing(): void{
        $plainPassword = 'senha123';
        $password = Password::fromPlain($plainPassword);

        $this->assertTrue($password->verifyPlainPassword($plainPassword));

        $this->assertFalse($password->verifyPlainPassword('senha_errada'));
    }

    /**
     * Testa uma senha curta
     */
    public function testPasswordTooShort(): void{
        $this->expectException(InvalidPasswordException::class);
        Password::fromPlain('senha');
    }

    /**
     * Testa comparação de emails
     */
    public function testEmailComparison(): void{
        $email1 = new Email('teste@example.com');
        $email2 = new Email('teste@example.com');
        $email3 = new Email('teste_diferente@example.com');

        $this->assertTrue($email1->equals($email2));
        $this->assertFalse($email1->equals($email3));
    }

    /**
     * Testa endpoint de registrar usuário
     */
    public function testRegisterSuccess(): void{
        $response = $this->post('/api/auth/register', [
            'name' => 'Usuário teste',
            'email' => 'usuario_teste@example.com',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
        ]);

        $this->assertEquals(Response::HTTP_CREATED, $response->status());
        $this->assertJson($response->getContent());
    }

    /**
     * Testa endpoint de registrar com email inválido
     */
    public function testRegisterInvalidEmail(): void{
        $response = $this->post('/api/auth/register', [
            'name' => 'Usuário teste',
            'email' => 'usuario_invalido',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
        ]);

        $this->assertEquals(Response::HTTP_UNPROCESSABLE_ENTITY, $response->status());
    }

    /**
     * Testa endpoint de login com usuário não existente
     */
    public function testLoginUserNotFound(): void{
        $response = $this->post('/api/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password123',
        ]);

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $response->status());
    }
}

