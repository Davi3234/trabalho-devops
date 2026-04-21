<?php

namespace App\Interfaces\Http\Request;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest{

    /**
     * Determina se o usuário ta autorizado para fazer a requisição
     * @return bool
     */
    public function authorize(): bool{
        return true;
    }

    /**
     * Retorna as validações para fazer a requisição
     * @return array
     */
    public function rules(): array{
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6|confirmed',
        ];
    }

    /**
     * Mensagens para validações.
     * @return array
     */
    public function messages(): array{
        return [
            'name.required' => 'Name is required',
            'name.string' => 'Name must be a string',
            'name.max' => 'Name must not exceed 255 characters',
            'email.required' => 'Email is required',
            'email.email' => 'Email must be a valid email address',
            'email.unique' => 'Email is already registered',
            'password.required' => 'Password is required',
            'password.min' => 'Password must be at least 6 characters',
            'password.confirmed' => 'Password confirmation does not match',
        ];
    }
}

