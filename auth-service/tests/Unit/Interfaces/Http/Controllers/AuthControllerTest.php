<?php

namespace Tests\Unit\Interfaces\Http\Controllers;

use App\Application\UseCase\LoginUser\LoginUserHandler;
use App\Application\UseCase\LoginUser\LoginUserResponseDTO;
use App\Application\UseCase\RegisterUser\RegisterUserHandler;
use App\Application\UseCase\RegisterUser\RegisterUserResponseDTO;
use App\Domain\Auth\Service\TokenService;
use Laravel\Lumen\Testing\TestCase;
use Mockery;

class AuthControllerTest extends TestCase{
    public function createApplication(){
        return require __DIR__ . '/../../../../bootstrap/app.php';
    }

    public function testLoginSuccess(){
        $handler = Mockery::mock(LoginUserHandler::class);
        $responseDTO = new LoginUserResponseDTO('jwt_token_123', 1, 'joao@example.com', 'João Silva');

        $handler->shouldReceive('handle')
            ->once()
            ->andReturn($responseDTO);

        $this->app->instance(LoginUserHandler::class, $handler);

        $this->json('POST', '/login', [
            'email' => 'joao@example.com',
            'password' => 'senha123456'
        ])
        ->seeJson([
            'success' => true,
            'message' => 'Login realizado com sucesso.'
        ])
        ->assertResponseOk();
    }

    public function testRegisterSuccess(){
        $handler = Mockery::mock(RegisterUserHandler::class);
        $responseDTO = new RegisterUserResponseDTO(1, 'maria@example.com', 'Maria Silva');

        $handler->shouldReceive('handle')
            ->once()
            ->andReturn($responseDTO);

        $this->app->instance(RegisterUserHandler::class, $handler);

        $this->json('POST', '/register', [
            'name' => 'Maria Silva',
            'email' => 'maria@example.com',
            'password' => 'senha654321',
            'password_confirmation' => 'senha654321'
        ])
        ->seeJson([
            'success' => true,
            'message' => 'Usuário cadastrado com sucesso.'
        ])
        ->assertResponseStatus(201);
    }

    public function testValidateTokenSuccess()
    {
        $tokenService = Mockery::mock(TokenService::class);

        $payload = (object)['sub' => 1, 'email' => 'user@example.com'];

        $tokenService->shouldReceive('validate')
            ->once()
            ->andReturn($payload);

        $this->app->instance(TokenService::class, $tokenService);

        $this->json('POST', '/validate-token', [], [
            'HTTP_AUTHORIZATION' => 'Bearer valid_jwt_token'
        ])
        ->seeJson([
            'valid' => true,
            'user_id' => 1
        ])
        ->assertResponseOk();
    }

    public function testValidateTokenWithoutToken()
    {
        $this->json('POST', '/validate-token')
            ->seeJson(['error' => 'Token não informado'])
            ->assertResponseStatus(401);
    }

    public function testValidateTokenWithInvalidToken()
    {
        $tokenService = Mockery::mock(TokenService::class);

        $tokenService->shouldReceive('validate')
            ->once()
            ->andReturn(null);

        $this->app->instance(TokenService::class, $tokenService);

        $this->json('POST', '/validate-token', [], [
            'HTTP_AUTHORIZATION' => 'Bearer invalid_jwt_token'
        ])
        ->seeJson(['error' => 'Token inválido'])
        ->assertResponseStatus(401);
    }

    public function testLoginWithInvalidEmail()
    {
        $this->json('POST', '/login', [
            'email' => 'invalid-email',
            'password' => 'senha123456'
        ])
        ->assertResponseStatus(422);
    }

    public function testRegisterWithMissingFields()
    {
        $this->json('POST', '/register', [
            'name' => 'Usuario',
            'email' => 'usuario@example.com'
            // Missing password
        ])
        ->assertResponseStatus(422);
    }

    public function testLoginResponseStructure()
    {
        $handler = Mockery::mock(LoginUserHandler::class);
        $responseDTO = new LoginUserResponseDTO('token_abc', 5, 'test@example.com', 'Test User');

        $handler->shouldReceive('handle')
            ->once()
            ->andReturn($responseDTO);

        $this->app->instance(LoginUserHandler::class, $handler);

        $response = $this->json('POST', '/login', [
            'email' => 'test@example.com',
            'password' => 'password123456'
        ]);

        $this->assertResponseOk();
    }

    public function testRegisterResponseStructure()
    {
        $handler = Mockery::mock(RegisterUserHandler::class);
        $responseDTO = new RegisterUserResponseDTO(10, 'newuser@example.com', 'New User');

        $handler->shouldReceive('handle')
            ->once()
            ->andReturn($responseDTO);

        $this->app->instance(RegisterUserHandler::class, $handler);

        $response = $this->json('POST', '/register', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123456',
            'password_confirmation' => 'password123456'
        ]);

        $this->assertResponseStatus(201);
    }
}

