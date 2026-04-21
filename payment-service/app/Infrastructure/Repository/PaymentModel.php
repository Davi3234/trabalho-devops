<?php

namespace App\Infrastructure\Repository;

use Illuminate\Database\Eloquent\Model;

class PaymentModel extends Model{
    protected $table = 'payments';
    protected $fillable = [
        'id',
        'order_id',
        'amount',
        'method',
        'status',
        'gateway_response',
        'created_at',
        'updated_at',
    ];

    public $timestamps = true;
    public $incrementing = false;
    protected $keyType = 'string';
}
