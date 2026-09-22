<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminPrivilege;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;

class AdminPrivilegeController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index($serverId)
    {
        return response()->json(AdminPrivilege::where('server_id', $serverId)->get());
    }

    public function store($serverId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        $data = $request->validate([
            'steam_id' => 'required|string',
            'player_name' => 'required|string',
            'group_name' => 'required|string',
            'flags' => 'required|string',
            'immunity' => 'nullable|integer',
            'days' => 'nullable|integer',
        ]);

        $admin = AdminPrivilege::create([
            'server_id' => $server->id,
            'steam_id' => $data['steam_id'],
            'player_name' => $data['player_name'],
            'group_name' => $data['group_name'],
            'flags' => $data['flags'],
            'immunity' => $data['immunity'] ?? 50,
            'expires_at' => !empty($data['days']) ? now()->addDays($data['days']) : null,
        ]);

        return response()->json($admin, 201);
    }

    public function destroy($id)
    {
        $admin = AdminPrivilege::findOrFail($id);
        $admin->delete();
        return response()->json(['message' => 'Admin privilege revoked successfully']);
    }
}
