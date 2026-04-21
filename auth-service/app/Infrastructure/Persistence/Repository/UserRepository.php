<?php

namespace App\Infrastructure\Persistence\Repository;

use App\Domain\User\Entity\User;
use App\Domain\User\Repository\UserRepositoryInterface;
use App\Domain\User\ValueObject\Email;
use App\Domain\User\ValueObject\Password;
use App\Infrastructure\Persistence\Eloquent\UserEloquent;

class UserRepository implements UserRepositoryInterface{

    /**
     * Salva um usuário no banco de dados
     * @param User $user
     * @return int
     */
    public function save(User $user): int{
        $userEloquent = UserEloquent::create([
            'name' => $user->name(),
            'email' => $user->email()->value(),
            'password' => $user->password()->hashed(),
        ]);

        return $userEloquent->id;
    }

    /**
     * Busca um usuário pelo email
     * @param Email $email
     * @return User|null
     */
    public function findByEmail(Email $email): ?User{
        $userEloquent = UserEloquent::where('email', $email->value())->first();

        if ($userEloquent === null) {
            return null;
        }

        return $this->toDomain($userEloquent);
    }

    /**
     * Busca um usuário pelo ID
     * @param int $id
     * @return User|null
     */
    public function findById(int $id): ?User{
        $userEloquent = UserEloquent::find($id);

        if ($userEloquent === null) {
            return null;
        }

        return $this->toDomain($userEloquent);
    }

    /**
     * Converte um modelo Eloquent para a entidade do domínio
     * @param UserEloquent $userEloquent
     * @return User
     */
    private function toDomain(UserEloquent $userEloquent): User{
        return new User(
            $userEloquent->id,
            $userEloquent->name,
            new Email($userEloquent->email),
            new Password($userEloquent->password)
        );
    }
}


