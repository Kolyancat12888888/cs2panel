<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class JobTask extends Model
{
    protected $table = 'job_tasks';

    protected $fillable = [
        'uuid',
        'user_id',
        'agent_id',
        'server_id',
        'type', // 'plugin.generate', 'plugin.build', 'plugin.test', 'plugin.package', 'plugin.deploy', 'server.restart'
        'priority', // 'low', 'normal', 'high', 'urgent'
        'status', // 'pending', 'running', 'completed', 'failed', 'cancelled'
        'progress',
        'payload',
        'result',
        'logs',
        'started_at',
        'finished_at',
        'error',
    ];

    protected $casts = [
        'payload' => 'array',
        'result' => 'array',
        'logs' => 'array',
        'progress' => 'integer',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($job) {
            if (empty($job->uuid)) {
                $job->uuid = (string) Str::uuid();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function agent()
    {
        return $this->belongsTo(Agent::class, 'agent_id', 'agent_id');
    }
}
