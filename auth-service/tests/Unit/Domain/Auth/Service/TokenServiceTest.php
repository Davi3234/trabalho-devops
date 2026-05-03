<?php

namespace Tests\Unit\Domain\Auth\Service;

use App\Domain\Auth\Service\TokenService;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use PHPUnit\Framework\TestCase;

class TokenServiceTest extends TestCase
{
    private TokenService $service;

    protected function setUp(): void
    {
        // Set environment variables for JWT
        putenv('JWT_SECRET=test_secret_key_123456789');
        putenv('JWT_EXPIRES_IN=3600');

        $this->service = new TokenService();
    }

    public function testGenerateToken(): void
    {
        $userId = 1;
        $email = 'test@example.com';

        $token = $this->service->generate($userId, $email);

        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }

    public function testGenerateTokenFormat(): void
    {
        $token = $this->service->generate(1, 'user@example.com');

        // JWT tokens have 3 parts separated by dots
        $parts = explode('.', $token);
        $this->assertCount(3, $parts);
    }

    public function testValidateToken(): void
    {
        $userId = 42;
        $email = 'joao@example.com';

        $token = $this->service->generate($userId, $email);
        $payload = $this->service->validate($token);

        $this->assertNotNull($payload);
        $this->assertEquals($userId, $payload->sub);
        $this->assertEquals($email, $payload->email);
    }

    public function testValidateTokenWithValidPayload(): void
    {
        $token = $this->service->generate(5, 'maria@example.com');
        $payload = $this->service->validate($token);

        $this->assertIsObject($payload);
        $this->assertObjectHasAttribute('sub', $payload);
        $this->assertObjectHasAttribute('email', $payload);
        $this->assertObjectHasAttribute('iat', $payload);
        $this->assertObjectHasAttribute('exp', $payload);
    }

    public function testValidateInvalidToken(): void
    {
        $invalidToken = 'invalid.token.here';

        $result = $this->service->validate($invalidToken);

        $this->assertNull($result);
    }

    public function testValidateExpiredToken(): void
    {
        // Create a token that's already expired
        putenv('JWT_EXPIRES_IN=0');
        $service = new TokenService();

        sleep(1); // Ensure token is expired

        $token = $service->generate(1, 'test@example.com');
        $result = $service->validate($token);

        // Expired tokens should return null
        $this->assertNull($result);
    }

    public function testGenerateTokenWithDifferentUsers(): void
    {
        $token1 = $this->service->generate(1, 'user1@example.com');
        $token2 = $this->service->generate(2, 'user2@example.com');

        $this->assertNotEquals($token1, $token2);

        $payload1 = $this->service->validate($token1);
        $payload2 = $this->service->validate($token2);

        $this->assertEquals(1, $payload1->sub);
        $this->assertEquals(2, $payload2->sub);
    }

    public function testTokenContainsIssuedAtTime(): void
    {
        $token = $this->service->generate(1, 'test@example.com');
        $payload = $this->service->validate($token);

        $this->assertNotNull($payload->iat);
        $this->assertIsInt($payload->iat);
        $this->assertGreaterThan(0, $payload->iat);
    }

    public function testTokenContainsExpirationTime(): void
    {
        $token = $this->service->generate(1, 'test@example.com');
        $payload = $this->service->validate($token);

        $this->assertNotNull($payload->exp);
        $this->assertIsInt($payload->exp);
        $this->assertGreaterThan($payload->iat, $payload->exp);
    }

    public function testValidateTokenWithTamperedData(): void
    {
        $token = $this->service->generate(1, 'test@example.com');

        // Tamper with the token
        $parts = explode('.', $token);
        $tamperedToken = $parts[0] . '.tampered.' . $parts[2];

        $result = $this->service->validate($tamperedToken);

        $this->assertNull($result);
    }

    protected function tearDown(): void
    {
        // Clear environment variables
        putenv('JWT_SECRET');
        putenv('JWT_EXPIRES_IN');
    }
}

