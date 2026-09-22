<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MatchGame;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MatchManagerController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index()
    {
        return response()->json(MatchGame::with('server')->latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'server_id' => 'required|exists:servers,id',
            'title' => 'required|string',
            'format' => 'required|in:BO1,BO3,BO5',
            'team_1_name' => 'required|string',
            'team_2_name' => 'required|string',
            'current_map' => 'required|string',
        ]);

        $server = Server::with('node')->findOrFail($data['server_id']);

        $match = MatchGame::create(array_merge($data, [
            'match_id' => 'match_' . Str::random(8),
            'status' => 'warmup',
            'team_1_score' => 0,
            'team_2_score' => 0,
        ]));

        // Load MatchZy configuration on server via RCON
        try {
            $this->daemon->executeRcon($server, "matchzy_loadmatch {$match->match_id}");
        } catch (\Exception $e) {}

        return response()->json($match, 201);
    }

    public function startKnife($id)
    {
        $match = MatchGame::with('server.node')->findOrFail($id);
        $match->update(['status' => 'knife']);

        try {
            $this->daemon->executeRcon($match->server, 'mp_warmup_end 1');
            $this->daemon->executeRcon($match->server, 'say [CS2Panel] Starting KNIFE ROUND for side selection!');
        } catch (\Exception $e) {}

        return response()->json(['message' => 'Knife round started', 'match' => $match]);
    }

    public function pause($id)
    {
        $match = MatchGame::with('server.node')->findOrFail($id);
        $match->update(['status' => 'paused']);

        try {
            $this->daemon->executeRcon($match->server, 'mp_pause_match');
        } catch (\Exception $e) {}

        return response()->json(['message' => 'Match paused', 'match' => $match]);
    }

    public function unpause($id)
    {
        $match = MatchGame::with('server.node')->findOrFail($id);
        $match->update(['status' => 'live']);

        try {
            $this->daemon->executeRcon($match->server, 'mp_unpause_match');
        } catch (\Exception $e) {}

        return response()->json(['message' => 'Match unpaused', 'match' => $match]);
    }
}
