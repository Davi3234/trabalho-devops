<?php

namespace App\Interfaces\Http\Controller;

use App\Application\UseCase\LoginUser\LoginUserDTO;
use App\Application\UseCase\LoginUser\LoginUserHandler;
use App\Application\UseCase\RegisterUser\RegisterUserDTO;
use App\Application\UseCase\RegisterUser\RegisterUserHandler;
use App\Interfaces\Http\Request\LoginRequest;
use App\Interfaces\Http\Request\RegisterRequest;
use Illuminate\Http\JsonResponse;
use Laravel\Lumen\Routing\Controller as BaseController;
use Symfony\Component\HttpFoundation\Response;
use App\Domain\Auth\Service\TokenService;
use Illuminate\Http\Request;

class AuthController extends BaseController{

    public function __construct(
        private LoginUserHandler $loginUserHandler,
        private RegisterUserHandler $registerUserHandler,
        private TokenService $tokenService
    ) {
    }

    /**
     * Realiza login de um usuário
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse{
        $loginRequest = LoginRequest::createFrom($request);
        $loginRequest->validateRequest();
        $dto = new LoginUserDTO(
            $request->get('email'),
            $request->get('password')
        );

        $response = $this->loginUserHandler->handle($dto);

        return response()->json([
            'success' => true,
            'data' => $response->toArray(),
            'message' => 'Login realizado com sucesso.'
        ], Response::HTTP_OK);
    }

    /**
     * Registra um novo usuário
     * @param Request $request
     * @return JsonResponse
     */
    public function register(Request $request): JsonResponse{

        $registerRequest = RegisterRequest::createFrom($request);
        $registerRequest->validateRequest();

        $dto = new RegisterUserDTO(
            $request->get('name'),
            $request->get('email'),
            $request->get('password')
        );

        $response = $this->registerUserHandler->handle($dto);

        return response()->json([
            'success' => true,
            'data' => $response->toArray(),
            'message' => 'Usuário cadastrado com sucesso.'
        ], Response::HTTP_CREATED);
    }

    /**
     * Valida um token JWT
     * @param Request $request
     * @return JsonResponse
     */
    public function validateToken(Request $request): JsonResponse{
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Token não informado'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $this->tokenService->validate($token);

        if ($payload === null) {
            return response()->json(['error' => 'Token inválido'], Response::HTTP_UNAUTHORIZED);
        }

        return response()->json(['valid' => true, 'user_id' => $payload->sub], Response::HTTP_OK);
    }
}
