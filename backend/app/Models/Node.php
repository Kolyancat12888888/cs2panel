<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Node extends Model
{
    protected $fillable = [
        'name',
        'fqdn',
        'ip_address',
        'daemon_port',
        'sftp_port',
        'daemon_secret',
        'master_path',
        'is_active',
        'total_ram_mb',
        'total_disk_gb',
        'cpu_cores',
        'location',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'daemon_port' => 'integer',
        'sftp_port' => 'integer',
        'total_ram_mb' => 'integer',
        'total_disk_gb' => 'integer',
        'cpu_cores' => 'integer',
    ];

    public function servers()
    {
        return $this->hasMany(Server::class);
    }
}
