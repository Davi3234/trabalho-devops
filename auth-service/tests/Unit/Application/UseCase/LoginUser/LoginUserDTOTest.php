<?php

namespace Tests\Unit\Application\UseCase\LoginUser;

use App\Application\UseCase\LoginUser\LoginUserDTO;
use App\Application\UseCase\LoginUser\LoginUserResponseDTO;
use PHPUnit\Framework\TestCase;

class LoginUserDTOTest extends TestCase{
    public function testLoginUserDTO(): void{
        $dto = new LoginUserDTO('joao@example.com', 'senha123456');

        $this->assertEquals('joao@example.com', $dto->getEmail());
        $this->assertEquals('senha123456', $dto->getPassword());
    }

    public function testLoginUserDTOWithDifferentData(): void{
        $dto = new LoginUserDTO('test@test.com', 'pass555');

        $this->assertIsString($dto->getEmail());
        $this->assertIsString($dto->getPassword());
    }

    public function testLoginUserResponseDTO(): void{
        $responseDTO = new LoginUserResponseDTO('jwt_token_123', 1, 'user@example.com', 'User');

        $this->assertEquals('jwt_token_123', $responseDTO->getToken());
        $this->assertEquals(1, $responseDTO->getUserId());
        $this->assertEquals('user@example.com', $responseDTO->getEmail());
        $this->assertEquals('User', $responseDTO->getName());
    }

    public function testLoginUserResponseDTOToArray(): void{
        $responseDTO = new LoginUserResponseDTO('token_abc', 2, 'maria@example.com', 'Maria');

        $array = $responseDTO->toArray();

        $this->assertIsArray($array);
        $this->assertArrayHasKey('token', $array);
        $this->assertArrayHasKey('user', $array);

        $this->assertEquals('token_abc', $array['token']);
        $this->assertIsArray($array['user']);
        $this->assertEquals(2, $array['user']['id']);
        $this->assertEquals('maria@example.com', $array['user']['email']);
        $this->assertEquals('Maria', $array['user']['name']);
    }

    public function testLoginUserResponseDTOStructure(): void{
        $responseDTO = new LoginUserResponseDTO('long_jwt_token_xyz', 99, 'admin@example.com', 'Admin User');

        $array = $responseDTO->toArray();

        $this->assertCount(2, $array);
        $this->assertCount(3, $array['user']);
    }

    public function testLoginUserResponseDTOWithSpecialCharacters(): void{
        $responseDTO = new LoginUserResponseDTO('token_spec', 10, 'josé@example.com', "José's Full Name");

        $array = $responseDTO->toArray();

        $this->assertEquals('josé@example.com', $array['user']['email']);
        $this->assertEquals("José's Full Name", $array['user']['name']);
    }
}

