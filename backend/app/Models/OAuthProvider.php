<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OAuthProvider extends Model
{
    protected $table = 'oauth_providers';

    protected $fillable = [
        'provider',
        'name',
        'is_enabled',
        'client_id',
        'client_secret',
        'redirect_url',
        'extra_config',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'extra_config' => 'array',
    ];
}
