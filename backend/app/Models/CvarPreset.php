<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CvarPreset extends Model
{
    protected $fillable = [
        'name',
        'game_mode', // 'competitive', 'deathmatch', 'retake', '1v1', 'surf', 'bhop', 'casual'
        'description',
        'cvars_json',
        'is_default',
    ];

    protected $casts = [
        'cvars_json' => 'array',
        'is_default' => 'boolean',
    ];
}
