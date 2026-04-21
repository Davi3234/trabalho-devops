<?php

namespace App\Domain\User\Repository;

use App\Domain\User\Entity\User;
use App\Domain\User\ValueObject\Email;

interface UserRepositoryInterface{

    public function save(User $user): int;

    public function findByEmail(Email $email): ?User;

    public function findById(int $id): ?User;
}
