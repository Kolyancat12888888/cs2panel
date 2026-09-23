<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::with(['permissions'])->withCount('users')->get();

        return response()->json([
            'success' => true,
            'roles' => $roles,
        ]);
    }

    public function permissionsList()
    {
        $permissions = Permission::all()->groupBy('module');

        return response()->json([
            'success' => true,
            'modules' => $permissions,
            'all' => Permission::all(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'slug' => 'required|string|max:50|unique:roles,slug',
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'slug' => strtolower($validated['slug']),
            'description' => $validated['description'] ?? null,
            'is_system' => false,
        ]);

        if (!empty($validated['permission_ids'])) {
            $role->permissions()->sync($validated['permission_ids']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully.',
            'role' => $role->load('permissions'),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:50|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        if (isset($validated['name'])) $role->name = $validated['name'];
        if (array_key_exists('description', $validated)) $role->description = $validated['description'];
        $role->save();

        if (array_key_exists('permission_ids', $validated)) {
            $role->permissions()->sync($validated['permission_ids']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Role updated successfully.',
            'role' => $role->load('permissions'),
        ]);
    }

    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'System roles cannot be deleted.',
            ], 422);
        }

        $role->permissions()->detach();
        $role->users()->detach();
        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Role deleted successfully.',
        ]);
    }
}
