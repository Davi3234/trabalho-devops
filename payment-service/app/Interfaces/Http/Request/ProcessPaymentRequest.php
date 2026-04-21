<?php

namespace App\Interfaces\Http\Request;

use Illuminate\Http\Request;

class ProcessPaymentRequest extends Request{
    public function rules(): array{
        return [
            'order_id' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:credit_card,pix,boleto',
            'payment_data' => 'sometimes|array',
        ];
    }

    public function validateRequest(): void{
        $this->validate($this->rules());
    }
}
