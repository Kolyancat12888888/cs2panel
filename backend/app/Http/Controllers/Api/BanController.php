<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ban;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;

class BanController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index($serverId)
    {
        return response()->json(Ban::where('server_id', $serverId)->latest()->get());
    }

    public function store($serverId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        $data = $request->validate([
            'steam_id' => 'nullable|string',
            'ip_address' => 'nullable|string',
            'player_name' => 'required|string',
            'ban_type' => 'required|in:ban,mute,gag,ip_ban',
            'reason' => 'required|string',
            'duration_minutes' => 'required|integer',
        ]);

        $ban = Ban::create(array_merge($data, [
            'server_id' => $server->id,
            'admin_name' => $request->user()->name,
            'admin_steam_id' => $request->user()->steam_id,
            'expires_at' => $data['duration_minutes'] > 0 ? now()->addMinutes($data['duration_minutes']) : null,
        ]));

        // Kick/Ban player via RCON if online
        if (!empty($data['steam_id'])) {
            try {
                $this->daemon->executeRcon($server, "css_ban {$data['steam_id']} {$data['duration_minutes']} {$data['reason']}");
            } catch (\Exception $e) {}
        }

        return response()->json($ban, 201);
    }

    public function unban($id, Request $request)
    {
        $ban = Ban::with('server.node')->findOrFail($id);
        $ban->update([
            'is_unbanned' => true,
            'unban_reason' => $request->unban_reason ?? 'Unbanned by admin',
        ]);

        if ($ban->steam_id) {
            try {
                $this->daemon->executeRcon($ban->server, "css_unban {$ban->steam_id}");
            } catch (\Exception $e) {}
        }

        return response()->json(['message' => 'Player unbanned successfully', 'ban' => $ban]);
    }
}
