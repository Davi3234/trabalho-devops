<?php

namespace App\Domain\Auth\Service;


use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class TokenService{
    private string $secret;
    private string $algorithm = 'HS256';
    private int $expiresIn = 3600;

    public function __construct(){
        $this->secret = env('JWT_SECRET');
        $this->expiresIn = (int) env('JWT_EXPIRES_IN', 3600);
    }

    /**
     * Gera um token JWT para um usuário
     * @param int $userId
     * @param string $email
     * @return string
     */
    public function generate(int $userId, string $email): string{
        $payload = [
            'iat' => time(),
            'exp' => time() + $this->expiresIn,
            'sub' => $userId,
            'email' => $email,
        ];

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * Valida um token JWT
     * @param string $token
     * @return object|null
     */
    public function validate(string $token): ?object{
        try {
            return JWT::decode($token, new Key($this->secret, $this->algorithm));
        } catch (\Exception $e) {
            return null;
        }
    }
}

