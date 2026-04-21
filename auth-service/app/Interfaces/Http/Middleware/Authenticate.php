<?php

namespace App\Interfaces\Http\Middleware;

use App\Domain\Auth\Service\TokenService;
use App\Interfaces\Exceptions\InvalidTokenException;
use Closure;
use Illuminate\Http\Request;

class Authenticate{
    private TokenService $tokenService;

    public function __construct(TokenService $tokenService){
        $this->tokenService = $tokenService;
    }

    /**
     * Interceptador da requisição.
     * @param  Request  $request
     * @param  Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next){
        $token = $this->extractToken($request);

        if (!$token) {
            throw new InvalidTokenException();
        }

        $payload = $this->tokenService->validate($token);

        if (!$payload) {
            throw new InvalidTokenException();
        }

        $request->attributes->add(['user' => $payload]);

        return $next($request);
    }

    /**
     * Extrai o token do header Authorization
     * @param  Request  $request
     * @return string|null
     */
    private function extractToken(Request $request): ?string{
        $header = $request->header('Authorization');

        if (!$header) {
            return null;
        }

        if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
            return $matches[1];
        }

        return null;
    }
}

