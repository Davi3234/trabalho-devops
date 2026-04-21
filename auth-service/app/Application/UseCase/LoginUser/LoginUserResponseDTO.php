<?php

namespace App\Application\UseCase\LoginUser;

class LoginUserResponseDTO{
    public function __construct(
        private string $token,
        private int $userId,
        private string $email,
        private string $name
    ) {
    }

    /**
     * Getter para token
     * @return string
     */
    public function getToken(): string{
        return $this->token;
    }

    /**
     * Getter para userId
     * @return int
     */
    public function getUserId(): int{
        return $this->userId;
    }

    /**
     * Getter para email
     * @return string
     */
    public function getEmail(): string{
        return $this->email;
    }

    /**
     * Getter para name
     * @return string
     */
    public function getName(): string{
        return $this->name;
    }

    /**
     * Retorna como array associativo
     * @return array
     */
    public function toArray(): array{
        return [
            'token' => $this->token,
            'user' => [
                'id' => $this->userId,
                'email' => $this->email,
                'name' => $this->name,
            ]
        ];
    }
}

