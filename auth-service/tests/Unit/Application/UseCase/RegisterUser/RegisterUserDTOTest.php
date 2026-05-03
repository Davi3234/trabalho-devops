<?php

namespace Tests\Unit\Application\UseCase\RegisterUser;

use App\Application\UseCase\RegisterUser\RegisterUserDTO;
use App\Application\UseCase\RegisterUser\RegisterUserResponseDTO;
use PHPUnit\Framework\TestCase;

class RegisterUserDTOTest extends TestCase{
    public function testRegisterUserDTO(): void{
        $dto = new RegisterUserDTO('João Silva', 'joao@example.com', 'senha123456');

        $this->assertEquals('João Silva', $dto->getName());
        $this->assertEquals('joao@example.com', $dto->getEmail());
        $this->assertEquals('senha123456', $dto->getPassword());
    }

    public function testRegisterUserDTOWithDifferentData(): void{
        $dto = new RegisterUserDTO('Maria', 'maria@example.com', 'pass654');

        $this->assertIsString($dto->getName());
        $this->assertIsString($dto->getEmail());
        $this->assertIsString($dto->getPassword());
    }

    public function testRegisterUserResponseDTO(): void{
        $responseDTO = new RegisterUserResponseDTO(1, 'usuario@example.com', 'Usuario');

        $this->assertEquals(1, $responseDTO->getUserId());
        $this->assertEquals('usuario@example.com', $responseDTO->getEmail());
        $this->assertEquals('Usuario', $responseDTO->getName());
    }

    public function testRegisterUserResponseDTOToArray(): void{
        $responseDTO = new RegisterUserResponseDTO(2, 'test@example.com', 'Test User');

        $array = $responseDTO->toArray();

        $this->assertIsArray($array);
        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('email', $array);
        $this->assertArrayHasKey('name', $array);
        $this->assertEquals(2, $array['id']);
        $this->assertEquals('test@example.com', $array['email']);
        $this->assertEquals('Test User', $array['name']);
    }

    public function testRegisterUserResponseDTOWithSpecialCharacters(): void{
        $responseDTO = new RegisterUserResponseDTO(5, 'josé@example.com', "José's Name");

        $array = $responseDTO->toArray();

        $this->assertEquals('josé@example.com', $array['email']);
        $this->assertEquals("José's Name", $array['name']);
    }
}

