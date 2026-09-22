<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlayerStat extends Model
{
    protected $fillable = [
        'server_id',
        'steam_id',
        'player_name',
        'kills',
        'deaths',
        'headshots',
        'mvps',
        'score',
        'rounds_won',
        'rounds_lost',
        'playtime_seconds',
        'last_seen_at',
    ];

    protected $casts = [
        'kills' => 'integer',
        'deaths' => 'integer',
        'headshots' => 'integer',
        'mvps' => 'integer',
        'score' => 'integer',
        'rounds_won' => 'integer',
        'rounds_lost' => 'integer',
        'playtime_seconds' => 'integer',
        'last_seen_at' => 'datetime',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
