<?php

namespace App\Application\UseCase\LoginUser;

use App\Domain\Auth\Service\TokenService;
use App\Domain\Exceptions\InvalidAutenticationException;
use App\Domain\Exceptions\UserNotFound;
use App\Domain\User\Repository\UserRepositoryInterface;
use App\Domain\User\ValueObject\Email;

class LoginUserHandler{
    public function __construct(
        private UserRepositoryInterface $userRepository,
        private TokenService $tokenService
    ) {
    }

    /**
     * Executa o caso de uso de login
     * @param LoginUserDTO $dto
     * @return LoginUserResponseDTO
     * @throws InvalidAutenticationException
     */
    public function handle(LoginUserDTO $dto): LoginUserResponseDTO{
        $email = new Email($dto->getEmail());

        $user = $this->userRepository->findByEmail($email);

        if ($user === null) {
            throw new UserNotFound($dto->getEmail());
        }

        if (!$user->verifyPassword($dto->getPassword())) {
            throw new InvalidAutenticationException();
        }

        $token = $this->tokenService->generate($user->id(), $user->email()->value());

        return new LoginUserResponseDTO(
            $token,
            $user->id(),
            $user->email()->value(),
            $user->name()
        );
    }
}

