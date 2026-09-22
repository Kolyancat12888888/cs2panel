<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchGame extends Model
{
    protected $fillable = [
        'server_id',
        'match_id',
        'title',
        'format', // 'BO1', 'BO3', 'BO5'
        'team_1_name',
        'team_2_name',
        'team_1_score',
        'team_2_score',
        'current_map',
        'status', // 'warmup', 'knife', 'live', 'paused', 'finished'
        'gotv_demo_url',
        'stats_json',
    ];

    protected $casts = [
        'team_1_score' => 'integer',
        'team_2_score' => 'integer',
        'stats_json' => 'array',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
