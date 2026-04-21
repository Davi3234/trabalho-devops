<?php

namespace App\Domain\User\ValueObject;

use App\Domain\Exceptions\InvalidAutenticationException;

class Password{

    private string $hashed;

    public function __construct(string $hashed){
        if (empty($hashed)) {
            throw new InvalidAutenticationException("Senha não pode ser vazia.");
        }
        $this->hashed = $hashed;
    }

    /**
     * Cria uma senha a partir de uma string plana e faz hash
     * @param string $plainPassword
     * @return self
     */
    public static function fromPlain(string $plainPassword): self{
        if (strlen($plainPassword) < 6) {
            throw new InvalidAutenticationException("Senha precisa ter pelo menos 6 caracteres.");
        }

        $hashed = password_hash($plainPassword, PASSWORD_BCRYPT);
        return new self($hashed);
    }

    /**
     * Verifica a senha com a senha atual.
     * @param string $plain
     * @return bool
     */
    public function verifyPlainPassword(string $plain): bool{
        return password_verify($plain, $this->hashed);
    }

    /**
     * Retorna a senha com hash
     * @return string
     */
    public function hashed(): string{
        return $this->hashed;
    }
}


