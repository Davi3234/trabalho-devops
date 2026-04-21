<?php

namespace App\Interfaces\Http\Request;

class LoginRequest extends FormRequest {

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
            'email.required' => 'Email é obrigatório',
            'email.email' => 'Email precisa ser um email válido',
            'password.required' => 'Password é obrigatório',
            'password.min' => 'Password precisa ter no mínimo 6 caracteres',
        ];
    }
}

