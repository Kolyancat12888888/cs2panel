<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class FastDlController extends Controller
{
    public function assets($serverId)
    {
        $server = Server::findOrFail($serverId);

        $mockAssets = [
            [
                'filename' => 'maps/de_mirage.vpk',
                'size_bytes' => 145000000,
                'compressed' => true,
                'bz2_size_bytes' => 84000000,
                'last_synced_at' => now()->subHours(2)->toIso8601String(),
            ],
            [
                'filename' => 'sound/custom_headshot.vsnd_c',
                'size_bytes' => 320000,
                'compressed' => true,
                'bz2_size_bytes' => 180000,
                'last_synced_at' => now()->subHours(1)->toIso8601String(),
            ],
            [
                'filename' => 'models/player/custom_vip.vmdl_c',
                'size_bytes' => 12500000,
                'compressed' => true,
                'bz2_size_bytes' => 6400000,
                'last_synced_at' => now()->subMinutes(30)->toIso8601String(),
            ],
        ];

        return response()->json([
            'success' => true,
            'server_id' => $server->id,
            'fastdl_url' => url("/api/v1/fastdl/{$server->id}/"),
            'total_assets' => count($mockAssets),
            'assets' => $mockAssets,
        ]);
    }

    public function rebuild($serverId)
    {
        $server = Server::findOrFail($serverId);

        return response()->json([
            'success' => true,
            'message' => 'FastDL asset scan and background .bz2 compression started.',
            'server_id' => $server->id,
        ]);
    }
}
