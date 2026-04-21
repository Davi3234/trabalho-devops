<?php

namespace App\Application\UseCase\RegisterUser;

class RegisterUserResponseDTO{
    public function __construct(
        private int $userId,
        private string $email,
        private string $name
    ) {
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
            'id' => $this->userId,
            'email' => $this->email,
            'name' => $this->name,
        ];
    }
}

