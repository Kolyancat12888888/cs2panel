<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUserPayload($user),
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $isFirstUser = User::count() === 0;

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $isFirstUser ? 'superadmin' : 'user',
            'server_limit' => $isFirstUser ? 100 : 2,
        ]);

        // Attach system role
        $roleSlug = $isFirstUser ? 'superadmin' : 'user';
        $role = \App\Models\Role::where('slug', $roleSlug)->first();
        if ($role) {
            $user->roles()->syncWithoutDetaching([$role->id]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUserPayload($user),
        ], 201);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json($this->formatUserPayload($user));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function steamLogin(Request $request)
    {
        $request->validate(['steam_id' => 'required|string']);
        
        $isNew = !User::where('steam_id', $request->steam_id)->exists();
        $user = User::firstOrCreate(
            ['steam_id' => $request->steam_id],
            [
                'name' => $request->player_name ?? 'Steam Player',
                'email' => $request->steam_id . '@steam.cs2panel.local',
                'avatar' => $request->avatar ?? 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
                'role' => 'user',
                'server_limit' => 2,
            ]
        );

        if ($isNew) {
            $defaultRole = \App\Models\Role::where('slug', 'user')->first();
            if ($defaultRole) {
                $user->roles()->syncWithoutDetaching([$defaultRole->id]);
            }
        }

        $token = $user->createToken('steam-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->formatUserPayload($user),
        ]);
    }

    private function formatUserPayload(User $user): array
    {
        $user->loadMissing('roles');
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'role' => $user->role,
            'is_admin' => $user->isAdmin(),
            'is_superadmin' => $user->isSuperAdmin(),
            'server_limit' => $user->server_limit,
            'roles' => $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug]),
            'permissions' => $user->getAllPermissions(),
        ];
    }

    public function systemStatus()
    {
        $hasAdmin = User::where('role', 'admin')->exists();
        $hasNodes = \App\Models\Node::exists();
        $hasAgents = \App\Models\Agent::exists();

        return response()->json([
            'is_installed' => $hasAdmin,
            'has_nodes' => $hasNodes,
            'has_agents' => $hasAgents,
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'database' => config('database.default'),
        ]);
    }
}
