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
            'user' => $user,
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => User::count() === 0 ? 'admin' : 'user', // first user is admin
            'server_limit' => 3,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function steamLogin(Request $request)
    {
        $request->validate(['steam_id' => 'required|string']);
        
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

        $token = $user->createToken('steam-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
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
