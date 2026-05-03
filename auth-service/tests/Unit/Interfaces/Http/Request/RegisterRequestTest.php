<?php

namespace Tests\Unit\Interfaces\Http\Request;

use App\Interfaces\Http\Request\RegisterRequest;
use PHPUnit\Framework\TestCase;

class RegisterRequestTest extends TestCase
{
    private RegisterRequest $request;

    protected function setUp(): void
    {
        $this->request = new RegisterRequest();
    }

    public function testAuthorizeReturnsTrue(): void
    {
        $this->assertTrue($this->request->authorize());
    }

    public function testRulesIncludesName(): void
    {
        $rules = $this->request->rules();

        $this->assertArrayHasKey('name', $rules);
        $this->assertStringContainsString('required', $rules['name']);
        $this->assertStringContainsString('string', $rules['name']);
        $this->assertStringContainsString('max:255', $rules['name']);
    }

    public function testRulesIncludesEmail(): void
    {
        $rules = $this->request->rules();

        $this->assertArrayHasKey('email', $rules);
        $this->assertStringContainsString('required', $rules['email']);
        $this->assertStringContainsString('email', $rules['email']);
        $this->assertStringContainsString('unique:users,email', $rules['email']);
    }

    public function testRulesIncludesPassword(): void
    {
        $rules = $this->request->rules();

        $this->assertArrayHasKey('password', $rules);
        $this->assertStringContainsString('required', $rules['password']);
        $this->assertStringContainsString('min:6', $rules['password']);
        $this->assertStringContainsString('confirmed', $rules['password']);
    }

    public function testMessagesForName(): void
    {
        $messages = $this->request->messages();

        $this->assertArrayHasKey('name.required', $messages);
        $this->assertArrayHasKey('name.string', $messages);
        $this->assertArrayHasKey('name.max', $messages);
    }

    public function testMessagesForEmail(): void
    {
        $messages = $this->request->messages();

        $this->assertArrayHasKey('email.required', $messages);
        $this->assertArrayHasKey('email.email', $messages);
        $this->assertArrayHasKey('email.unique', $messages);
    }

    public function testMessagesForPassword(): void
    {
        $messages = $this->request->messages();

        $this->assertArrayHasKey('password.required', $messages);
        $this->assertArrayHasKey('password.min', $messages);
        $this->assertArrayHasKey('password.confirmed', $messages);
    }

    public function testPasswordConfirmationMessage(): void
    {
        $messages = $this->request->messages();

        $this->assertEquals(
            'Confirmação de senha não confere',
            $messages['password.confirmed']
        );
    }
}

