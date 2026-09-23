<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Cache;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'steam_id',
        'avatar',
        'role', // legacy fallback column, mapped to primary role
        'server_limit',
        'two_factor_secret',
        'two_factor_enabled',
        'is_banned',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'two_factor_enabled' => 'boolean',
        'server_limit' => 'integer',
        'is_banned' => 'boolean',
    ];

    public function servers()
    {
        return $this->hasMany(Server::class, 'owner_id');
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'user_permissions')->withPivot('granted');
    }

    public function isAdmin(): bool
    {
        if ($this->role === 'admin' || $this->role === 'superadmin') {
            return true;
        }
        return $this->hasRole(['admin', 'superadmin', 'root']);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'superadmin' || $this->hasRole(['superadmin', 'root']);
    }

    public function hasRole(string|array $roles): bool
    {
        $roleList = is_array($roles) ? $roles : [$roles];
        
        $userRoles = $this->roles->pluck('slug')->toArray();
        if ($this->role && !in_array($this->role, $userRoles)) {
            $userRoles[] = $this->role;
        }

        foreach ($roleList as $r) {
            if (in_array(strtolower($r), array_map('strtolower', $userRoles))) {
                return true;
            }
        }
        return false;
    }

    public function getAllPermissions(): array
    {
        // If superadmin, grant wildcard access
        if ($this->isSuperAdmin() || $this->role === 'superadmin') {
            return ['*'];
        }

        $computePerms = function () {
            $perms = [];

            // 1. Collect permissions from assigned roles
            $this->loadMissing('roles.permissions', 'permissions');
            foreach ($this->roles as $role) {
                foreach ($role->permissions as $perm) {
                    $perms[$perm->slug] = true;
                }
            }

            // 2. Apply direct user permission overrides
            foreach ($this->permissions as $directPerm) {
                if ($directPerm->pivot->granted) {
                    $perms[$directPerm->slug] = true;
                } else {
                    unset($perms[$directPerm->slug]);
                }
            }

            // Legacy fallback if user has 'admin' in role column and no roles attached
            if (empty($perms) && $this->role === 'admin') {
                return ['*'];
            }

            // Default minimal permission if empty
            if (empty($perms)) {
                $perms['dashboard.view'] = true;
            }

            return array_keys($perms);
        };

        // Attempt caching with fallback if cache driver fails
        try {
            $cacheKey = 'user_perms_' . $this->id;
            return Cache::remember($cacheKey, 60, $computePerms);
        } catch (\Throwable $e) {
            return $computePerms();
        }
    }

    public function hasPermission(string $permissionSlug): bool
    {
        $all = $this->getAllPermissions();
        if (in_array('*', $all)) {
            return true;
        }
        return in_array($permissionSlug, $all);
    }

    public function flushPermissionsCache(): void
    {
        try {
            Cache::forget('user_perms_' . $this->id);
        } catch (\Throwable $e) {
            // Ignore cache forget errors
        }
    }

    public function assignRole(string|Role $role): self
    {
        $r = is_string($role) ? Role::where('slug', $role)->first() : $role;
        if ($r) {
            $this->roles()->syncWithoutDetaching([$r->id]);
            $this->flushPermissionsCache();
        }
        return $this;
    }

    public function removeRole(string|Role $role): self
    {
        $r = is_string($role) ? Role::where('slug', $role)->first() : $role;
        if ($r) {
            $this->roles()->detach($r->id);
            $this->flushPermissionsCache();
        }
        return $this;
    }
}
