<?php

namespace App\Application\UseCase\RegisterUser;

class RegisterUserDTO{
    public function __construct(
        private string $name,
        private string $email,
        private string $password
    ) {
    }

    /**
     * Getter para name
     * @return string
     */
    public function getName(): string{
        return $this->name;
    }

    /**
     * Getter para email
     * @return string
     */
    public function getEmail(): string{
        return $this->email;
    }

    /**
     * Getter para password
     * @return string
     */
    public function getPassword(): string{
        return $this->password;
    }
}

