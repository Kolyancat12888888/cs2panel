<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Node;
use App\Models\Server;
use App\Models\ActivityLog;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServerController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Server::with(['node', 'owner']);

        if (!$user->isAdmin()) {
            $query->where('owner_id', $user->id);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();

        // Check server limit
        if (!$user->isAdmin() && $user->servers()->count() >= $user->server_limit) {
            return response()->json(['error' => 'You have reached your maximum server limit.'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'node_id' => 'required|exists:nodes,id',
            'port' => 'nullable|integer',
            'default_map' => 'nullable|string',
            'game_type' => 'nullable|integer',
            'game_mode' => 'nullable|integer',
            'max_players' => 'nullable|integer',
            'has_css' => 'nullable|boolean',
            'has_metamod' => 'nullable|boolean',
        ]);

        $node = Node::findOrFail($data['node_id']);

        // Allocate automatic free port if not provided
        $allocatedPort = $data['port'] ?? (27015 + (Server::where('node_id', $node->id)->count() * 10));

        $server = Server::create([
            'uuid' => (string) Str::uuid(),
            'node_id' => $node->id,
            'owner_id' => $user->id,
            'name' => $data['name'],
            'port' => $allocatedPort,
            'rcon_port' => $allocatedPort,
            'rcon_password' => Str::random(16),
            'tv_port' => $allocatedPort + 5,
            'default_map' => $data['default_map'] ?? 'de_mirage',
            'game_type' => $data['game_type'] ?? 0,
            'game_mode' => $data['game_mode'] ?? 1,
            'max_players' => $data['max_players'] ?? 16,
            'has_css' => $data['has_css'] ?? true,
            'has_metamod' => $data['has_metamod'] ?? true,
        ]);

        // Trigger automatic daemon symlink provisioning
        $this->daemon->provisionServer($server, $server->has_css);

        ActivityLog::create([
            'user_id' => $user->id,
            'server_id' => $server->id,
            'action' => 'server.create',
            'description' => "Created server '{$server->name}' with master symlinks",
            'ip_address' => $request->ip(),
        ]);

        return response()->json($server->load('node'), 201);
    }

    public function show($id, Request $request)
    {
        $server = Server::with(['node', 'owner', 'bans', 'adminPrivileges', 'schedules', 'backups'])->findOrFail($id);
        $this->authorizeAccess($request->user(), $server);

        return response()->json($server);
    }

    public function start($id, Request $request)
    {
        $server = Server::with('node')->findOrFail($id);
        $this->authorizeAccess($request->user(), $server);

        $res = $this->daemon->startServer($server);
        $server->update(['status' => 'running']);

        return response()->json(['status' => 'running', 'daemon' => $res]);
    }

    public function stop($id, Request $request)
    {
        $server = Server::with('node')->findOrFail($id);
        $this->authorizeAccess($request->user(), $server);

        $res = $this->daemon->stopServer($server);
        $server->update(['status' => 'offline']);

        return response()->json(['status' => 'offline', 'daemon' => $res]);
    }

    public function restart($id, Request $request)
    {
        $server = Server::with('node')->findOrFail($id);
        $this->authorizeAccess($request->user(), $server);

        $res = $this->daemon->restartServer($server);
        $server->update(['status' => 'running']);

        return response()->json(['status' => 'running', 'daemon' => $res]);
    }

    public function repairSymlinks($id, Request $request)
    {
        $server = Server::with('node')->findOrFail($id);
        $this->authorizeAccess($request->user(), $server);

        $res = $this->daemon->repairSymlinks($server);
        return response()->json(['message' => 'Symlinks checked and repaired successfully', 'details' => $res]);
    }

    public function destroy($id, Request $request)
    {
        $server = Server::findOrFail($id);
        $this->authorizeAccess($request->user(), $server);

        // Stop server before deletion
        try {
            $this->daemon->stopServer($server);
        } catch (\Exception $e) {}

        $server->delete();
        return response()->json(['message' => 'Server deleted successfully']);
    }

    protected function authorizeAccess($user, Server $server)
    {
        if (!$user->isAdmin() && $server->owner_id !== $user->id) {
            abort(403, 'Unauthorized access to this server.');
        }
    }
}
