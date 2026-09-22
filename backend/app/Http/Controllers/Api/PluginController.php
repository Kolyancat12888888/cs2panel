<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plugin;
use App\Models\Server;
use App\Services\DaemonClientService;
use Illuminate\Http\Request;

class PluginController extends Controller
{
    protected DaemonClientService $daemon;

    public function __construct(DaemonClientService $daemon)
    {
        $this->daemon = $daemon;
    }

    public function index()
    {
        return response()->json(Plugin::all());
    }

    public function install($serverId, $pluginId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        $plugin = Plugin::findOrFail($pluginId);

        if (!$request->user()->isAdmin() && $server->owner_id !== $request->user()->id) {
            abort(403);
        }

        $plugin->increment('install_count');

        // Trigger RCON reload of CounterStrikeSharp plugins if server is active
        try {
            $this->daemon->executeRcon($server, 'css_plugins reload');
        } catch (\Exception $e) {}

        return response()->json([
            'message' => "Plugin '{$plugin->name}' installed successfully to server {$server->name}",
            'plugin' => $plugin,
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Admin only');
        }

        $data = $request->validate([
            'name' => 'required|string',
            'slug' => 'required|string|unique:plugins',
            'category' => 'required|string',
            'description' => 'required|string',
            'author' => 'nullable|string',
            'version' => 'nullable|string',
            'download_url' => 'required|url',
            'github_repo' => 'nullable|string',
        ]);

        $plugin = Plugin::create($data);
        return response()->json($plugin, 201);
    }
}
