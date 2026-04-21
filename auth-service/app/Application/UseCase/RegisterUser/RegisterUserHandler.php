<?php

namespace App\Application\UseCase\RegisterUser;

use App\Domain\Exceptions\EmailAlreadyInUseException;
use App\Domain\User\Entity\User;
use App\Domain\User\Repository\UserRepositoryInterface;
use App\Domain\User\ValueObject\Email;
use App\Domain\User\ValueObject\Password;

class RegisterUserHandler{
    public function __construct(
        private UserRepositoryInterface $userRepository
    ) {
    }

    /**
     * Executa o caso de uso de registro
     * @param RegisterUserDTO $dto
     * @return RegisterUserResponseDTO
     * @throws EmailAlreadyInUseException
     */
    public function handle(RegisterUserDTO $dto): RegisterUserResponseDTO{
        $email = new Email($dto->getEmail());

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser !== null) {
            throw new EmailAlreadyInUseException($dto->getEmail());
        }

        $password = Password::fromPlain($dto->getPassword());

        $user = new User(
            0,
            $dto->getName(),
            $email,
            $password
        );

        $id = $this->userRepository->save($user);

        return new RegisterUserResponseDTO(
            $id,
            $user->email()->value(),
            $user->name()
        );
    }
}

