<?php

namespace Tests\Unit\Interfaces\Http\Request;

use App\Interfaces\Http\Request\LoginRequest;
use PHPUnit\Framework\TestCase;

class LoginRequestTest extends TestCase
{
    private LoginRequest $request;

    protected function setUp(): void
    {
        $this->request = new LoginRequest();
    }

    public function testAuthorizeReturnsTrue(): void
    {
        $this->assertTrue($this->request->authorize());
    }

    public function testRulesIncludesEmail(): void
    {
        $rules = $this->request->rules();

        $this->assertArrayHasKey('email', $rules);
        $this->assertStringContainsString('required', $rules['email']);
        $this->assertStringContainsString('email', $rules['email']);
    }

    public function testRulesIncludesPassword(): void
    {
        $rules = $this->request->rules();

        $this->assertArrayHasKey('password', $rules);
        $this->assertStringContainsString('required', $rules['password']);
        $this->assertStringContainsString('min:6', $rules['password']);
    }

    public function testRulesDoesNotRequireNameOrConfirmation(): void
    {
        $rules = $this->request->rules();

        $this->assertArrayNotHasKey('name', $rules);
        $this->assertArrayNotHasKey('password_confirmation', $rules);
    }

    public function testMessagesForEmail(): void
    {
        $messages = $this->request->messages();

        $this->assertArrayHasKey('email.required', $messages);
        $this->assertArrayHasKey('email.email', $messages);
        $this->assertEquals('Email é obrigatório', $messages['email.required']);
        $this->assertEquals('Email precisa ser um email válido', $messages['email.email']);
    }

    public function testMessagesForPassword(): void
    {
        $messages = $this->request->messages();

        $this->assertArrayHasKey('password.required', $messages);
        $this->assertArrayHasKey('password.min', $messages);
    }

    public function testPasswordMinimumLength(): void
    {
        $rules = $this->request->rules();

        $this->assertStringContainsString('min:6', $rules['password']);
    }
}

