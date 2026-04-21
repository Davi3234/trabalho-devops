<?php

namespace App\Interfaces\Http\Request;

use Illuminate\Http\Request;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Response;

abstract class FormRequest extends Request{

    public function validateRequest(): void{
        $factory = app(ValidationFactory::class);

        $validator = $factory->make(
            $this->all(),
            $this->rules(),
            $this->messages()
        );

        if ($validator->fails()) {
            throw new HttpResponseException(
                response()->json([
                    'errors' => $validator->errors()
                ], Response::HTTP_UNPROCESSABLE_ENTITY)
            );
        }
    }


    abstract public function rules(): array;

    public function messages(): array{
        return [];
    }
}
