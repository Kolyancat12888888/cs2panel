<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GraphVersion extends Model
{
    protected $fillable = [
        'plugin_project_id',
        'version_number',
        'commit_message',
        'graph_snapshot',
        'csharp_source',
        'node_count',
        'connection_count',
    ];

    protected $casts = [
        'graph_snapshot' => 'array',
        'node_count' => 'integer',
        'connection_count' => 'integer',
    ];

    public function project()
    {
        return $this->belongsTo(PluginProject::class, 'plugin_project_id');
    }
}
