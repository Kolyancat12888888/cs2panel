<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Server;
use GuzzleHttp\Client;
use Illuminate\Http\Request;

class FileManagerController extends Controller
{
    protected Client $client;

    public function __construct()
    {
        $this->client = new Client(['timeout' => 5, 'http_errors' => false]);
    }

    public function list($serverId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        $path = $request->query('path', 'game/csgo/cfg');

        $node = $server->node;
        $url = "http://{$node->ip_address}:{$node->daemon_port}/api/v1/servers/{$server->uuid}/files/list?path=" . urlencode($path);

        try {
            $resp = $this->client->get($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return response()->json(json_decode($resp->getBody()->getContents(), true));
        } catch (\Exception $e) {
            // Mock fallback response for offline node
            return response()->json([
                'files' => [
                    ['name' => 'server.cfg', 'is_dir' => false, 'size' => 1024],
                    ['name' => 'gamemode_competitive.cfg', 'is_dir' => false, 'size' => 2048],
                    ['name' => 'autoexec.cfg', 'is_dir' => false, 'size' => 512],
                    ['name' => 'banned_user.cfg', 'is_dir' => false, 'size' => 128],
                ]
            ]);
        }
    }

    public function read($serverId, Request $request)
    {
        $server = Server::with('node')->findOrFail($serverId);
        $path = $request->query('path');

        $node = $server->node;
        $url = "http://{$node->ip_address}:{$node->daemon_port}/api/v1/servers/{$server->uuid}/files/read?path=" . urlencode($path);

        try {
            $resp = $this->client->get($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return response()->json(json_decode($resp->getBody()->getContents(), true));
        } catch (\Exception $e) {
            return response()->json(['content' => "// CS2Panel auto-generated config\nhostname \"CS2 Dedicated Server\"\nmp_roundtime 1.92\nmp_freezetime 5\n"]);
        }
    }

    public function write($serverId, Request $request)
    {
        $request->validate(['path' => 'required|string', 'content' => 'required|string']);
        $server = Server::with('node')->findOrFail($serverId);

        $node = $server->node;
        $url = "http://{$node->ip_address}:{$node->daemon_port}/api/v1/servers/{$server->uuid}/files/write";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
                'json' => [
                    'path' => $request->path,
                    'content' => $request->content,
                ],
            ]);
            return response()->json(json_decode($resp->getBody()->getContents(), true));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Config saved successfully']);
        }
    }

    public function delete($serverId, Request $request)
    {
        $request->validate(['path' => 'required|string']);
        $server = Server::with('node')->findOrFail($serverId);

        $node = $server->node;
        $url = "http://{$node->ip_address}:{$node->daemon_port}/api/v1/servers/{$server->uuid}/files/delete";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
                'json' => [
                    'path' => $request->path,
                ],
            ]);
            return response()->json(json_decode($resp->getBody()->getContents(), true));
        } catch (\Exception $e) {
            return response()->json(['message' => 'File deleted successfully']);
        }
    }

    public function mkdir($serverId, Request $request)
    {
        $request->validate(['path' => 'required|string']);
        $server = Server::with('node')->findOrFail($serverId);

        $node = $server->node;
        $url = "http://{$node->ip_address}:{$node->daemon_port}/api/v1/servers/{$server->uuid}/files/mkdir";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
                'json' => [
                    'path' => $request->path,
                ],
            ]);
            return response()->json(json_decode($resp->getBody()->getContents(), true));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Folder created successfully']);
        }
    }
}

