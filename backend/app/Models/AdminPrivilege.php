<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminPrivilege extends Model
{
    protected $fillable = [
        'server_id',
        'steam_id',
        'player_name',
        'group_name', // 'root', 'admin', 'vip', 'vip_plus'
        'flags',      // '@css/root', '@css/ban', '@css/kick', etc.
        'immunity',
        'expires_at',
    ];

    protected $casts = [
        'immunity' => 'integer',
        'expires_at' => 'datetime',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
