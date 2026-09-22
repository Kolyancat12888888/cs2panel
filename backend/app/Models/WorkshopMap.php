<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkshopMap extends Model
{
    protected $fillable = [
        'workshop_id',
        'title',
        'map_name',
        'preview_url',
        'file_size_bytes',
        'game_mode_tags',
        'author',
    ];

    protected $casts = [
        'workshop_id' => 'integer',
        'file_size_bytes' => 'integer',
        'game_mode_tags' => 'array',
    ];
}
