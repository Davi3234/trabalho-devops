<?php

namespace Tests\Unit\Interfaces\Http\Middleware;

use App\Domain\Auth\Service\TokenService;
use App\Interfaces\Exceptions\InvalidTokenException;
use App\Interfaces\Http\Middleware\Authenticate;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class AuthenticateTest extends TestCase
{
    private Authenticate $middleware;
    private TokenService $tokenService;

    protected function setUp(): void
    {
        $this->tokenService = \Mockery::mock(TokenService::class);
        $this->middleware = new Authenticate($this->tokenService);
    }

    public function testHandleWithValidToken(): void
    {
        $payload = (object)['sub' => 1, 'email' => 'user@example.com'];

        $this->tokenService->shouldReceive('validate')
            ->once()
            ->andReturn($payload);

        $request = \Mockery::mock(Request::class);
        $request->shouldReceive('header')
            ->with('Authorization')
            ->andReturn('Bearer valid_token');

        $request->shouldReceive('attributes->add')
            ->once();

        $next = function($req) { return 'next_response'; };

        $result = $this->middleware->handle($request, $next);

        $this->assertEquals('next_response', $result);

        \Mockery::close();
    }

    public function testHandleWithoutToken(): void
    {
        $request = \Mockery::mock(Request::class);
        $request->shouldReceive('header')
            ->with('Authorization')
            ->andReturn(null);

        $next = function($req) { return 'next_response'; };

        $this->expectException(InvalidTokenException::class);
        $this->middleware->handle($request, $next);

        \Mockery::close();
    }

    public function testHandleWithInvalidToken(): void
    {
        $this->tokenService->shouldReceive('validate')
            ->once()
            ->andReturn(null);

        $request = \Mockery::mock(Request::class);
        $request->shouldReceive('header')
            ->with('Authorization')
            ->andReturn('Bearer invalid_token');

        $next = function($req) { return 'next_response'; };

        $this->expectException(InvalidTokenException::class);
        $this->middleware->handle($request, $next);

        \Mockery::close();
    }

    public function testHandleWithMalformedAuthHeader(): void
    {
        $request = \Mockery::mock(Request::class);
        $request->shouldReceive('header')
            ->with('Authorization')
            ->andReturn('InvalidFormat');

        $next = function($req) { return 'next_response'; };

        $this->expectException(InvalidTokenException::class);
        $this->middleware->handle($request, $next);

        \Mockery::close();
    }

    public function testHandleAddsUserToRequest(): void
    {
        $payload = (object)['sub' => 42, 'email' => 'test@example.com'];

        $this->tokenService->shouldReceive('validate')
            ->once()
            ->andReturn($payload);

        $request = \Mockery::mock(Request::class);
        $request->shouldReceive('header')
            ->with('Authorization')
            ->andReturn('Bearer token_123');

        $attributes = \Mockery::mock();
        $attributes->shouldReceive('add')
            ->once()
            ->with(['user' => $payload]);

        $request->attributes = $attributes;

        $next = function($req) { return 'next_response'; };

        $result = $this->middleware->handle($request, $next);

        $this->assertEquals('next_response', $result);

        \Mockery::close();
    }

    public function testTokenExtractionWithBearer(): void
    {
        $payload = (object)['sub' => 1];

        $this->tokenService->shouldReceive('validate')
            ->once()
            ->with('actual_token')
            ->andReturn($payload);

        $request = \Mockery::mock(Request::class);
        $request->shouldReceive('header')
            ->with('Authorization')
            ->andReturn('Bearer actual_token');

        $request->shouldReceive('attributes->add');

        $next = function($req) { return true; };

        $this->middleware->handle($request, $next);

        \Mockery::close();
    }

    public function testTokenExtractionWithcase sensitive(): void
    {
        $payload = (object)['sub' => 1];

        $this->tokenService->shouldReceive('validate')
            ->once()
            ->andReturn($payload);

        $request = \Mockery::mock(Request::class);
        $request->shouldReceive('header')
            ->with('Authorization')
            ->andReturn('bearer case_test_token'); // lowercase bearer

        $request->shouldReceive('attributes->add');

        $next = function($req) { return true; };

        $this->middleware->handle($request, $next);

        \Mockery::close();
    }
}

