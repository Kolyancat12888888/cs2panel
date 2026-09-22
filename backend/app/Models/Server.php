<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Server extends Model
{
    protected $fillable = [
        'uuid',
        'node_id',
        'owner_id',
        'name',
        'description',
        'port',
        'rcon_port',
        'rcon_password',
        'tv_port',
        'gslt_token',
        'default_map',
        'game_type',
        'game_mode',
        'max_players',
        'status', // 'offline', 'starting', 'running', 'stopping', 'crashed'
        'cpu_limit',
        'memory_limit_mb',
        'disk_limit_mb',
        'has_css',
        'has_metamod',
        'fastdl_enabled',
        'auto_restart_on_crash',
        'last_crash_at',
        'crash_count',
    ];

    protected $casts = [
        'port' => 'integer',
        'rcon_port' => 'integer',
        'tv_port' => 'integer',
        'game_type' => 'integer',
        'game_mode' => 'integer',
        'max_players' => 'integer',
        'cpu_limit' => 'integer',
        'memory_limit_mb' => 'integer',
        'disk_limit_mb' => 'integer',
        'has_css' => 'boolean',
        'has_metamod' => 'boolean',
        'fastdl_enabled' => 'boolean',
        'auto_restart_on_crash' => 'boolean',
        'last_crash_at' => 'datetime',
        'crash_count' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($server) {
            if (empty($server->uuid)) {
                $server->uuid = (string) Str::uuid();
            }
            if (empty($server->rcon_password)) {
                $server->rcon_password = Str::random(16);
            }
        });
    }

    public function node()
    {
        return $this->belongsTo(Node::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function bans()
    {
        return $this->hasMany(Ban::class);
    }

    public function adminPrivileges()
    {
        return $this->hasMany(AdminPrivilege::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    public function backups()
    {
        return $this->hasMany(Backup::class);
    }

    public function playerStats()
    {
        return $this->hasMany(PlayerStat::class);
    }
}
