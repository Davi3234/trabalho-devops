<?php

namespace App\Interfaces\Http\Controller;

use App\Application\UseCase\LoginUser\LoginUserDTO;
use App\Application\UseCase\LoginUser\LoginUserHandler;
use App\Application\UseCase\RegisterUser\RegisterUserDTO;
use App\Application\UseCase\RegisterUser\RegisterUserHandler;
use App\Domain\Exceptions\EmailAlreadyInUseException;
use App\Domain\Exceptions\InvalidPasswordException;
use App\Domain\Exceptions\UserNotFound;
use App\Interfaces\Http\Request\LoginRequest;
use App\Interfaces\Http\Request\RegisterRequest;
use Illuminate\Http\JsonResponse;
use Laravel\Lumen\Routing\Controller as BaseController;

class AuthController extends BaseController{

    public function __construct(
        private LoginUserHandler $loginUserHandler,
        private RegisterUserHandler $registerUserHandler
    ) {
    }

    /**
     * Realiza login de um usuário
     * @param LoginRequest $request
     * @return JsonResponse
     */
    public function login(LoginRequest $request): JsonResponse{
        try {
            $dto = new LoginUserDTO(
                $request->get('email'),
                $request->get('password')
            );

            $response = $this->loginUserHandler->handle($dto);

            return response()->json([
                'success' => true,
                'data' => $response->toArray(),
                'message' => 'Login realizado com sucesso.'
            ], 200);

        } catch (UserNotFound $e) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário e/ou senha incorretos',
                'error' => 'USER_NOT_FOUND'
            ], 401);
        } catch (InvalidPasswordException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
                'error' => 'INVALID_PASSWORD'
            ], 401);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during login',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Registra um novo usuário
     * @param RegisterRequest $request
     * @return JsonResponse
     */
    public function register(RegisterRequest $request): JsonResponse{
        try {
            $dto = new RegisterUserDTO(
                $request->get('name'),
                $request->get('email'),
                $request->get('password')
            );

            $response = $this->registerUserHandler->handle($dto);

            return response()->json([
                'success' => true,
                'data' => $response->toArray(),
                'message' => 'User registered successfully'
            ], 201);
        } catch (EmailAlreadyInUseException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Email already registered',
                'error' => 'EMAIL_IN_USE'
            ], 409);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid input',
                'error' => $e->getMessage()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during registration',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}


