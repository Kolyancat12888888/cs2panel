<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PluginProject extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'name',
        'slug',
        'description',
        'category',
        'version',
        'author',
        'is_public',
        'graph_json', // Active .cs2graph definition
        'manifest_json',
        'icon',
    ];

    protected $casts = [
        'graph_json' => 'array',
        'manifest_json' => 'array',
        'is_public' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($proj) {
            if (empty($proj->uuid)) {
                $proj->uuid = (string) Str::uuid();
            }
            if (empty($proj->slug)) {
                $proj->slug = Str::slug($proj->name);
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function permittedUsers()
    {
        return $this->belongsToMany(User::class, 'user_project_access', 'project_id', 'user_id');
    }

    public function versions()
    {
        return $this->hasMany(GraphVersion::class)->latest();
    }
}
