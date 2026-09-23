<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_roles');
    }

    public function givePermissionTo(string|Permission $permission): self
    {
        $perm = is_string($permission) 
            ? Permission::firstOrCreate(['slug' => $permission], ['name' => ucfirst(str_replace('.', ' ', $permission))]) 
            : $permission;

        $this->permissions()->syncWithoutDetaching([$perm->id]);
        return $this;
    }

    public function revokePermissionTo(string|Permission $permission): self
    {
        $perm = is_string($permission) ? Permission::where('slug', $permission)->first() : $permission;
        if ($perm) {
            $this->permissions()->detach($perm->id);
        }
        return $this;
    }

    public function syncPermissions(array $permissionIds): self
    {
        $this->permissions()->sync($permissionIds);
        return $this;
    }
}
