<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\WorkshopMap;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;

class WorkshopController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index()
    {
        return response()->json(WorkshopMap::all());
    }

    public function setMap($serverId, Request $request)
    {
        $request->validate(['map_name' => 'required|string']);
        $server = Server::with('node')->findOrFail($serverId);

        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        $server->update(['default_map' => $request->map_name]);

        if ($server->status === 'running') {
            try {
                $this->daemon->executeRcon($server, "host_workshop_map {$request->map_name}");
            } catch (\Exception $e) {
                $this->daemon->executeRcon($server, "changelevel {$request->map_name}");
            }
        }

        return response()->json([
            'message' => "Changed active map to {$request->map_name}",
            'server' => $server,
        ]);
    }
}
