<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Node;
use App\Models\Server;
use App\Models\PluginProject;
use App\Models\Agent;
use App\Models\JobTask;
use App\Models\MatchGame;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PlatformApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Node $node;
    protected Server $server;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@cs2panel.local',
            'password' => bcrypt('secret123'),
            'role' => 'admin',
        ]);

        $this->node = Node::create([
            'name' => 'Frankfurt Node-01',
            'fqdn' => 'fra01.cs2panel.local',
            'ip_address' => '127.0.0.1',
            'daemon_secret' => 'supersecrettoken',
        ]);

        $this->server = Server::create([
            'node_id' => $this->node->id,
            'owner_id' => $this->user->id,
            'name' => 'Scrim Server #1',
            'rcon_password' => 'rconpass123',
        ]);
    }

    public function test_agent_gateway_registration_and_heartbeat()
    {
        // 1. Register Agent
        $regResponse = $this->postJson('/api/v1/agent-gateway/register', [
            'agent_id' => 'agent_pc_01',
            'device_id' => 'dev_123',
            'device_name' => 'DESKTOP-RYZEN9',
            'agent_token' => 'sec_token',
            'os' => 'windows',
            'arch' => 'x64',
            'capabilities' => ['dotnet', 'counterstrikesharp_sdk'],
        ]);

        $regResponse->assertStatus(200);
        $this->assertDatabaseHas('agents', ['agent_id' => 'agent_pc_01']);

        // 2. Heartbeat
        $hbResponse = $this->postJson('/api/v1/agent-gateway/heartbeat', [
            'agent_id' => 'agent_pc_01',
            'status' => 'ready',
            'cpu_usage' => 12.5,
            'ram_usage_mb' => 4096,
        ]);

        $hbResponse->assertStatus(200);
        $hbResponse->assertJson(['status' => 'acknowledged']);
    }

    public function test_plugin_studio_project_creation_and_versioning()
    {
        $this->actingAs($this->user);

        // 1. Create Project
        $createRes = $this->postJson('/api/v1/studio/projects', [
            'name' => 'VIP Jump Trails',
            'description' => 'Custom trails for VIPs',
            'category' => 'Economy',
        ]);

        $createRes->assertStatus(201);
        $projectId = $createRes->json('id');
        $this->assertDatabaseHas('plugin_projects', ['id' => $projectId]);
        $this->assertDatabaseHas('graph_versions', ['plugin_project_id' => $projectId]);

        // 2. Update Project Graph with new snapshot
        $updateRes = $this->putJson("/api/v1/studio/projects/{$projectId}", [
            'graph_json' => [
                'nodes' => [['id' => 'node_1', 'type' => 'event.round_start']],
                'connections' => [],
            ],
            'commit_message' => 'Added round start hook',
        ]);

        $updateRes->assertStatus(200);
        $this->assertEquals(2, PluginProject::find($projectId)->versions()->count());
    }

    public function test_job_dispatch_and_submission()
    {
        $this->actingAs($this->user);

        $project = PluginProject::create([
            'user_id' => $this->user->id,
            'name' => 'Retakes Core',
            'category' => 'Gamemode',
        ]);

        // Dispatch Build
        $buildRes = $this->postJson("/api/v1/studio/projects/{$project->id}/build");
        $buildRes->assertStatus(202);

        $jobUuid = $buildRes->json('job.uuid');
        $this->assertNotNull($jobUuid);

        // Submit Job Result from agent
        $submitRes = $this->postJson('/api/v1/agent-gateway/submit-result', [
            'job_id' => $jobUuid,
            'agent_id' => 'agent_pc_01',
            'status' => 'success',
            'progress' => 100,
            'logs' => ['Compiled RetakesCore.dll successfully'],
            'artifact' => ['dll_path' => '/bin/RetakesCore.dll'],
        ]);

        $submitRes->assertStatus(200);
        $this->assertDatabaseHas('job_tasks', [
            'uuid' => $jobUuid,
            'status' => 'completed',
            'progress' => 100,
        ]);
    }

    public function test_match_manager_flow()
    {
        $this->actingAs($this->user);

        // Create Match
        $matchRes = $this->postJson('/api/v1/matches', [
            'server_id' => $this->server->id,
            'title' => 'Scrim NAVI vs FAZE',
            'format' => 'BO3',
            'team_1_name' => 'NAVI',
            'team_2_name' => 'FAZE',
            'current_map' => 'de_mirage',
        ]);

        $matchRes->assertStatus(201);
        $matchId = $matchRes->json('id');

        // Start Knife
        $knifeRes = $this->postJson("/api/v1/matches/{$matchId}/knife");
        $knifeRes->assertStatus(200);
        $this->assertDatabaseHas('match_games', ['id' => $matchId, 'status' => 'knife']);

        // Pause
        $pauseRes = $this->postJson("/api/v1/matches/{$matchId}/pause");
        $pauseRes->assertStatus(200);
        $this->assertDatabaseHas('match_games', ['id' => $matchId, 'status' => 'paused']);
    }
}
