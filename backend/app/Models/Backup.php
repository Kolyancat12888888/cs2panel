<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Backup extends Model
{
    protected $fillable = [
        'server_id',
        'name',
        'file_name',
        'file_path',
        'disk', // 'local', 's3'
        'size_bytes',
        'checksum',
        'is_successful',
        'is_locked',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'is_successful' => 'boolean',
        'is_locked' => 'boolean',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
