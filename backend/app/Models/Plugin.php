<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plugin extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'category',
        'description',
        'author',
        'version',
        'download_url',
        'github_repo',
        'requires_css',
        'requires_metamod',
        'default_config_json',
        'icon_url',
        'is_featured',
        'install_count',
    ];

    protected $casts = [
        'requires_css' => 'boolean',
        'requires_metamod' => 'boolean',
        'is_featured' => 'boolean',
        'install_count' => 'integer',
    ];
}
