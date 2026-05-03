<?php

namespace Tests;

use App\Domain\Exceptions\InvalidEmailException;
use App\Domain\Exceptions\InvalidAutenticationException;
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
        $this->expectException(InvalidAutenticationException::class);
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
     * Testa validação de email com domínios especiais
     */
    public function testEmailWithSpecialDomains(): void{
        $email1 = new Email('usuario@empresa.com.br');
        $this->assertEquals('usuario@empresa.com.br', $email1->value());

        $email2 = new Email('contato@gov.co.uk');
        $this->assertEquals('contato@gov.co.uk', $email2->value());
    }

    /**
     * Testa email toString
     */
    public function testEmailToString(): void{
        $email = new Email('teste@example.com');
        $this->assertEquals('teste@example.com', (string)$email);
    }

    /**
     * Testa senha com caracteres especiais
     */
    public function testPasswordWithSpecialCharacters(): void{
        $plainPassword = 'Senha@#$%123!';
        $password = Password::fromPlain($plainPassword);

        $this->assertTrue($password->verifyPlainPassword($plainPassword));
        $this->assertFalse($password->verifyPlainPassword('Senha@#$%123!'));// Even slightly different fails
    }

    /**
     * Testa que senhas diferentes geram hashes diferentes
     */
    public function testDifferentPasswordsGenerateDifferentHashes(): void{
        $password1 = Password::fromPlain('senha1');
        $password2 = Password::fromPlain('senha2');

        // The hashes should be different but both should work for their own passwords
        $this->assertTrue($password1->verifyPlainPassword('senha1'));
        $this->assertFalse($password1->verifyPlainPassword('senha2'));

        $this->assertTrue($password2->verifyPlainPassword('senha2'));
        $this->assertFalse($password2->verifyPlainPassword('senha1'));
    }
}

