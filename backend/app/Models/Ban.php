<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ban extends Model
{
    protected $fillable = [
        'server_id',
        'steam_id',
        'ip_address',
        'player_name',
        'ban_type', // 'ban', 'mute', 'gag', 'ip_ban'
        'reason',
        'admin_name',
        'admin_steam_id',
        'duration_minutes', // 0 = permanent
        'expires_at',
        'is_unbanned',
        'unban_reason',
    ];

    protected $casts = [
        'duration_minutes' => 'integer',
        'expires_at' => 'datetime',
        'is_unbanned' => 'boolean',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
