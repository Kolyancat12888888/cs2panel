<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['roles', 'permissions'])->withCount('servers');

        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', $s)
                  ->orWhere('email', 'like', $s)
                  ->orWhere('steam_id', 'like', $s);
            });
        }

        if ($request->filled('role')) {
            $roleSlug = $request->role;
            $query->whereHas('roles', function ($q) use ($roleSlug) {
                $q->where('slug', $roleSlug);
            });
        }

        $users = $query->orderBy('id', 'desc')->paginate($request->input('per_page', 25));

        // Format user list with permissions array
        $transformed = $users->getCollection()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'steam_id' => $u->steam_id,
                'avatar' => $u->avatar,
                'server_limit' => $u->server_limit,
                'servers_count' => $u->servers_count,
                'is_banned' => (bool)$u->is_banned,
                'roles' => $u->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug]),
                'permissions' => $u->getAllPermissions(),
                'created_at' => $u->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformed,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'steam_id' => 'nullable|string|max:50',
            'server_limit' => 'nullable|integer|min:0|max:100',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'steam_id' => $validated['steam_id'] ?? null,
            'server_limit' => $validated['server_limit'] ?? 2,
            'role' => 'user',
        ]);

        if (!empty($validated['role_ids'])) {
            $user->roles()->sync($validated['role_ids']);
        } else {
            // Assign default 'user' role
            $defaultRole = Role::where('slug', 'user')->first();
            if ($defaultRole) {
                $user->roles()->sync([$defaultRole->id]);
            }
        }

        $user->flushPermissionsCache();

        return response()->json([
            'success' => true,
            'message' => 'User account created successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug]),
                'permissions' => $user->getAllPermissions(),
            ],
        ], 201);
    }

    public function show($id)
    {
        $user = User::with(['roles.permissions', 'permissions'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'steam_id' => $user->steam_id,
                'avatar' => $user->avatar,
                'server_limit' => $user->server_limit,
                'is_banned' => (bool)$user->is_banned,
                'roles' => $user->roles,
                'direct_permissions' => $user->permissions->map(fn($p) => [
                    'id' => $p->id,
                    'slug' => $p->slug,
                    'name' => $p->name,
                    'granted' => (bool)$p->pivot->granted,
                ]),
                'all_permissions' => $user->getAllPermissions(),
                'created_at' => $user->created_at?->toISOString(),
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'steam_id' => 'nullable|string|max:50',
            'server_limit' => 'nullable|integer|min:0|max:100',
            'is_banned' => 'nullable|boolean',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (!empty($validated['password'])) $user->password = Hash::make($validated['password']);
        if (array_key_exists('steam_id', $validated)) $user->steam_id = $validated['steam_id'];
        if (isset($validated['server_limit'])) $user->server_limit = $validated['server_limit'];
        if (isset($validated['is_banned'])) {
            // Prevent banning self
            if ($user->id === $request->user()->id && $validated['is_banned']) {
                return response()->json(['success' => false, 'message' => 'You cannot ban your own account.'], 422);
            }
            $user->is_banned = $validated['is_banned'];
        }

        $user->save();

        if (array_key_exists('role_ids', $validated)) {
            $user->roles()->sync($validated['role_ids']);
        }

        $user->flushPermissionsCache();

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug]),
                'permissions' => $user->getAllPermissions(),
            ],
        ]);
    }

    public function updatePermissions(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'permissions' => 'required|array', // array of { permission_id: int, granted: bool }
            'permissions.*.permission_id' => 'required|exists:permissions,id',
            'permissions.*.granted' => 'required|boolean',
        ]);

        // Sync direct permissions
        $syncData = [];
        foreach ($validated['permissions'] as $item) {
            $syncData[$item['permission_id']] = ['granted' => $item['granted']];
        }

        $user->permissions()->sync($syncData);
        $user->flushPermissionsCache();

        return response()->json([
            'success' => true,
            'message' => 'User custom permissions updated.',
            'permissions' => $user->getAllPermissions(),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'You cannot delete your own account.'], 422);
        }

        if ($user->isSuperAdmin() && User::whereHas('roles', fn($q) => $q->where('slug', 'superadmin'))->count() <= 1) {
            return response()->json(['success' => false, 'message' => 'Cannot delete the only Super Administrator.'], 422);
        }

        $user->flushPermissionsCache();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }
}
