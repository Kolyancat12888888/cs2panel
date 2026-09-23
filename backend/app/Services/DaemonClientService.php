<?php

namespace App\Services;

use App\Models\Node;
use App\Models\Server;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class DaemonClientService
{
    protected Client $client;

    public function __construct()
    {
        $this->client = new Client([
            'timeout' => 10,
            'http_errors' => false,
        ]);
    }

    protected function getBaseUri(Node $node): string
    {
        return "http://{$node->ip_address}:{$node->daemon_port}/api/v1";
    }

    public function provisionServer(Server $server, bool $installCSS = true): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . '/servers/provision';

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
                'json' => [
                    'uuid' => $server->uuid,
                    'install_css' => $installCSS,
                ],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            Log::error("[DaemonClient] Provision failed for server {$server->uuid}: " . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    public function startServer(Server $server): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/start";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
                'json' => [
                    'port' => $server->port,
                    'rcon_port' => $server->rcon_port,
                    'rcon_pass' => $server->rcon_password,
                    'gslt' => $server->gslt_token ?? '',
                    'default_map' => $server->default_map,
                    'game_type' => $server->game_type,
                    'game_mode' => $server->game_mode,
                    'max_players' => $server->max_players,
                ],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function stopServer(Server $server): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/stop";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function restartServer(Server $server): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/restart";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function executeRcon(Server $server, string $command): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/rcon";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
                'json' => ['command' => $command],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function getRecentLogs(Server $server): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/logs/recent";

        try {
            $resp = $this->client->get($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['logs' => []];
        }
    }

    public function getNodeHealth(Node $node): array
    {
        $url = $this->getBaseUri($node) . "/health";

        try {
            $resp = $this->client->get($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return [
                'status' => 'offline',
                'error' => $e->getMessage(),
            ];
        }
    }

    public function repairSymlinks(Server $server): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/repair-symlinks";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function installCSS(Server $server): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/install-css";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function writeFile(Server $server, string $relPath, string $content): array
    {
        $node = $server->node;
        $url = $this->getBaseUri($node) . "/servers/{$server->uuid}/files/write";

        try {
            $resp = $this->client->post($url, [
                'headers' => ['X-Node-Token' => $node->daemon_secret],
                'json' => [
                    'path' => $relPath,
                    'content' => $content,
                ],
            ]);
            return json_decode($resp->getBody()->getContents(), true) ?? [];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
}


