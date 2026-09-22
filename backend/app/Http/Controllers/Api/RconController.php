<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;

class RconController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function execute($id, Request $request)
    {
        $request->validate(['command' => 'required|string']);
        $server = Server::with('node')->findOrFail($id);

        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        $res = $this->daemon->executeRcon($server, $request->command);
        return response()->json($res);
    }

    public function logs($id, Request $request)
    {
        $server = Server::with('node')->findOrFail($id);

        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        $logs = $this->daemon->getRecentLogs($server);
        return response()->json($logs);
    }
}
