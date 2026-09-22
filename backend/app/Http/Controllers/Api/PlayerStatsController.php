<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlayerStat;
use App\Models\Server;
use Illuminate\Http\Request;

class PlayerStatsController extends Controller
{
    public function index($serverId)
    {
        $stats = PlayerStat::where('server_id', $serverId)
            ->orderByDesc('kills')
            ->limit(100)
            ->get();

        return response()->json($stats);
    }
}
