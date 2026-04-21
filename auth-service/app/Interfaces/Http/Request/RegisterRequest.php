<?php

namespace App\Interfaces\Http\Request;

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
            'name.required' => 'Nome é obrigatório',
            'name.string' => 'Nome precisa conter letras',
            'name.max' => 'Nome não pode ultrapassar 255 caracteres',
            'email.required' => 'Email é obrigatório',
            'email.email' => 'Email precisa ser um email válido',
            'email.unique' => 'Email já está em uso',
            'password.required' => 'Senha é obrigatório',
            'password.min' => 'Senha precisa ter pelo menos 6 caracteres',
            'password.confirmed' => 'Confirmação de senha não confere',
        ];
    }
}

