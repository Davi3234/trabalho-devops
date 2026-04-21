<?php

namespace Database\Seeders;

use App\Infrastructure\Persistence\Eloquent\UserEloquent;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder{

    /**
     * Dados iniciais para utilização.
     * @return void
     */
    public function run(){
        UserEloquent::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => password_hash('admin123', PASSWORD_BCRYPT),
        ]);
    }
}

