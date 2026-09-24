<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Agent extends Model
{
    protected $fillable = [
        'user_id',
        'agent_id',
        'device_id',
        'device_name',
        'agent_token',
        'status', // 'ready', 'busy', 'offline', 'error'
        'os',
        'arch',
        'cpu_usage',
        'ram_usage_mb',
        'active_job_id',
        'capabilities',
        'last_heartbeat_at',
    ];

    protected $casts = [
        'capabilities' => 'array',
        'cpu_usage' => 'float',
        'ram_usage_mb' => 'integer',
        'last_heartbeat_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function permittedUsers()
    {
        return $this->belongsToMany(User::class, 'user_agent_access');
    }

    public function isOnline(): bool
    {
        return $this->status !== 'offline' && $this->last_heartbeat_at && $this->last_heartbeat_at->diffInSeconds(now()) < 30;
    }
}
