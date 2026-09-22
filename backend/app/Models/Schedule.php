<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    protected $fillable = [
        'server_id',
        'name',
        'cron_expression', // e.g. '0 4 * * *'
        'action_type',     // 'restart', 'rcon_command', 'backup', 'change_map'
        'payload',         // command string or map name
        'is_active',
        'last_run_at',
        'next_run_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
