<?php

namespace App\Domain\User\Entity;

use App\Domain\User\ValueObject\Email;
use App\Domain\User\ValueObject\Password;

class User{

    public function __construct(
        private int $id,
        private string $name,
        private Email $email,
        private Password $password
    ){

    }

    /**
     * Getter de id
     * @return int
     */
    public function id(): int{
        return $this->id;
    }

    /**
     * Getter do nome
     * @return string
     */
    public function name(): string{
        return $this->name;
    }

    /**
     * Getter do email
     * @return Email
     */
    public function email(): Email{
        return $this->email;
    }

    /**
     * Getter da senha
     * @return Password
     */
    public function password(): Password{
        return $this->password;
    }

    /**
     * Responsável por trocar o nome
     * @param string $name
     * @throws \InvalidArgumentException
     * @return void
     */
    public function changeName(string $name): void{
        if (empty($name)) {
            throw new \InvalidArgumentException("Name cannot be empty");
        }

        $this->name = $name;
    }

    /**
     * Responsável por trocar o email
     * @param Email $email
     * @return void
     */
    public function changeEmail(Email $email): void{
        $this->email = $email;
    }

    /**
     * Responsável por verificar a senha
     * @param string $plain
     * @param mixed $hasher
     * @return bool
     */
    public function verifyPassword(string $plain): bool{
        return $this->password->verifyPlainPassword($plain);
    }

}
