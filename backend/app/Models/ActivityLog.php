<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'server_id',
        'action',      // e.g. 'server.start', 'config.edit', 'plugin.install', 'ban.create'
        'description',
        'ip_address',
        'user_agent',
        'properties',  // JSON with before/after diffs
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
