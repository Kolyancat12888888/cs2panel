<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Node;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NodeController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index()
    {
        $nodes = Node::withCount('servers')->get();

        // Attach live real-time hardware status from Daemon
        $result = $nodes->map(function ($node) {
            $health = $this->daemon->getNodeHealth($node);
            return [
                'id' => $node->id,
                'name' => $node->name,
                'fqdn' => $node->fqdn,
                'ip_address' => $node->ip_address,
                'daemon_port' => $node->daemon_port,
                'sftp_port' => $node->sftp_port,
                'location' => $node->location,
                'is_active' => ($health['status'] ?? '') === 'online',
                'servers_count' => $node->servers_count,
                'hardware' => $health['hardware'] ?? [
                    'cpu_model' => 'Pending Connection...',
                    'cpu_cores' => $node->cpu_cores,
                    'cpu_usage_pct' => 0,
                    'ram_total_mb' => $node->total_ram_mb,
                    'ram_used_mb' => 0,
                    'ram_usage_pct' => 0,
                    'disk_total_gb' => $node->total_disk_gb,
                    'disk_free_gb' => 0,
                    'disk_usage_pct' => 0,
                    'os' => 'Linux',
                    'uptime_seconds' => 0,
                ],
                'master_healthy' => $health['master_healthy'] ?? false,
                'master_message' => $health['master_message'] ?? 'Waiting for Daemon ping',
            ];
        });

        return response()->json($result);
    }

    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Admin only');
        }

        $data = $request->validate([
            'name' => 'required|string',
            'fqdn' => 'required|string',
            'ip_address' => 'required|string',
            'daemon_port' => 'required|integer',
            'sftp_port' => 'required|integer',
            'daemon_secret' => 'nullable|string',
            'master_path' => 'nullable|string',
            'location' => 'nullable|string',
        ]);

        // Auto-generate strong crypto token if not provided
        if (empty($data['daemon_secret'])) {
            $data['daemon_secret'] = 'node_sec_' . bin2hex(random_bytes(24));
        }

        $node = Node::create($data);
        return response()->json($node, 201);
    }

    public function benchmark($id)
    {
        $node = Node::findOrFail($id);
        $health = $this->daemon->getNodeHealth($node);

        return response()->json([
            'node_id' => $node->id,
            'node_name' => $node->name,
            'status' => $health['status'] ?? 'offline',
            'hardware' => $health['hardware'] ?? null,
            'master_healthy' => $health['master_healthy'] ?? false,
        ]);
    }
}
