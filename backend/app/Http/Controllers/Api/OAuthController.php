<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OAuthProvider;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;

class OAuthController extends Controller
{
    /**
     * Public list of enabled OAuth providers for login / register forms
     */
    public function listPublicProviders()
    {
        $providers = OAuthProvider::where('is_enabled', true)
            ->select(['id', 'provider', 'name', 'redirect_url'])
            ->get();

        return response()->json($providers);
    }

    /**
     * Get redirect URL for OAuth authorization
     */
    public function redirect(Request $request, string $provider)
    {
        $record = OAuthProvider::where('provider', $provider)->where('is_enabled', true)->first();

        if (!$record) {
            return response()->json(['error' => "OAuth provider '{$provider}' is disabled or not configured."], 400);
        }

        $this->configureDriver($record);

        try {
            if ($provider === 'steam') {
                // Steam uses OpenID 2.0 without stateless method
                $targetUrl = Socialite::driver('steam')->redirect()->getTargetUrl();
            } else {
                $targetUrl = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();
            }

            return response()->json(['url' => $targetUrl]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to initialize OAuth redirect: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Handle OAuth callback from provider
     */
    public function callback(Request $request, string $provider)
    {
        $record = OAuthProvider::where('provider', $provider)->where('is_enabled', true)->first();

        if (!$record) {
            return response()->json(['error' => "OAuth provider '{$provider}' is not enabled."], 400);
        }

        $this->configureDriver($record);

        try {
            if ($provider === 'steam') {
                $socialUser = Socialite::driver('steam')->user();
            } else {
                $socialUser = Socialite::driver($provider)->stateless()->user();
            }

            $providerId = (string) $socialUser->getId();
            $email = $socialUser->getEmail();
            $name = $socialUser->getName() ?? $socialUser->getNickname() ?? "{$provider}_user_{$providerId}";
            $avatar = $socialUser->getAvatar();

            if (!$email) {
                $email = "{$provider}_{$providerId}@oauth.cs2panel.local";
            }

            // Find existing user by provider_id or email
            $user = User::where(function ($query) use ($provider, $providerId, $email) {
                $query->where('provider_name', $provider)->where('provider_id', $providerId);
            })->orWhere('email', $email)->first();

            if ($user) {
                $user->provider_name = $provider;
                $user->provider_id = $providerId;
                if ($avatar && !$user->avatar) {
                    $user->avatar = $avatar;
                }
                $user->save();
            } else {
                $isFirstUser = User::count() === 0;
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => null,
                    'provider_name' => $provider,
                    'provider_id' => $providerId,
                    'avatar' => $avatar,
                    'role' => $isFirstUser ? 'admin' : 'user',
                    'server_limit' => $isFirstUser ? 10 : 3,
                ]);
            }

            $token = $user->createToken("oauth-{$provider}-token")->plainTextToken;

            // If requested via browser GET navigation, redirect to frontend with token
            if ($request->wantsJson()) {
                return response()->json([
                    'token' => $token,
                    'user' => $user,
                ]);
            }

            $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
            $userDataJson = urlencode(json_encode($user));
            return redirect("{$frontendUrl}/auth/callback?token={$token}&user={$userDataJson}");

        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'OAuth authentication failed: ' . $e->getMessage()], 400);
            }
            $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
            $errMsg = urlencode($e->getMessage());
            return redirect("{$frontendUrl}/login?error={$errMsg}");
        }
    }

    /**
     * Admin: List all OAuth providers and their configuration
     */
    public function adminIndex()
    {
        return response()->json(OAuthProvider::orderBy('id')->get());
    }

    /**
     * Admin: Update provider configuration
     */
    public function adminUpdate(Request $request, string $provider)
    {
        $validated = $request->validate([
            'is_enabled' => 'required|boolean',
            'client_id' => 'nullable|string',
            'client_secret' => 'nullable|string',
            'redirect_url' => 'nullable|string',
            'extra_config' => 'nullable|array',
        ]);

        $record = OAuthProvider::updateOrCreate(
            ['provider' => $provider],
            [
                'name' => $request->name ?? ucfirst($provider),
                'is_enabled' => $validated['is_enabled'],
                'client_id' => $validated['client_id'] ?? null,
                'client_secret' => $validated['client_secret'] ?? null,
                'redirect_url' => $validated['redirect_url'] ?? null,
                'extra_config' => $validated['extra_config'] ?? null,
            ]
        );

        return response()->json([
            'message' => "OAuth provider '{$provider}' updated successfully.",
            'provider' => $record,
        ]);
    }

    /**
     * Dynamic driver configuration from DB values
     */
    private function configureDriver(OAuthProvider $provider): void
    {
        $config = [
            'client_id' => $provider->client_id,
            'client_secret' => $provider->client_secret,
            'redirect' => $provider->redirect_url,
        ];

        if ($provider->provider === 'steam') {
            $config['api_key'] = $provider->client_secret ?? $provider->client_id;
        }

        if (!empty($provider->extra_config)) {
            $config = array_merge($config, $provider->extra_config);
        }

        Config::set("services.{$provider->provider}", $config);
    }
}
