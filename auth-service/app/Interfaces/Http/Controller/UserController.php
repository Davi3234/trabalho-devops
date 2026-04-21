<?php

namespace App\Interfaces\Http\Controller;

use App\Domain\User\Repository\UserRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Laravel\Lumen\Routing\Controller as BaseController;

class UserController extends BaseController{

    public function __construct(
        private UserRepositoryInterface $userRepository
    ) {
    }

    /**
     * Retorna o perfil do usuário autenticado
     *
     * @return JsonResponse
     */
    public function profile(): JsonResponse{
        try {
            $user = request()->attributes->get('user');

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                    'error' => 'USER_NOT_FOUND'
                ], 404);
            }

            $userEntity = $this->userRepository->findById($user->sub);

            if (!$userEntity) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                    'error' => 'USER_NOT_FOUND'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $userEntity->id(),
                    'name' => $userEntity->name(),
                    'email' => $userEntity->email()->value(),
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

