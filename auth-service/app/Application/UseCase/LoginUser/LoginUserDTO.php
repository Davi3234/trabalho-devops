<?php

namespace App\Application\UseCase\LoginUser;

class LoginUserDTO{
    public function __construct(
        private string $email,
        private string $password
    ) {
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

