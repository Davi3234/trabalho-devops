<?php

namespace App\Interfaces\Http\Request;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest{

    /**
     * Determina se o usuário ta autorizado para poder fazer a requisição.
     * @return bool
     */
    public function authorize(): bool{
        return true;
    }

    /**
     * Retorna as regras para poder fazer a requisição.
     * @return array
     */
    public function rules(): array{
        return [
            'email' => 'required|email',
            'password' => 'required|min:6',
        ];
    }

    /**
     * Mensagens para validações.
     * @return array
     */
    public function messages(): array{
        return [
            'email.required' => 'Email is required',
            'email.email' => 'Email must be a valid email address',
            'password.required' => 'Password is required',
            'password.min' => 'Password must be at least 6 characters',
        ];
    }
}

