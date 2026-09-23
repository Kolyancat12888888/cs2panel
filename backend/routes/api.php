<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OAuthController;
use App\Http\Controllers\Api\ServerController;
use App\Http\Controllers\Api\NodeController;
use App\Http\Controllers\Api\RconController;
use App\Http\Controllers\Api\PluginController;
use App\Http\Controllers\Api\WorkshopController;
use App\Http\Controllers\Api\CvarController;
use App\Http\Controllers\Api\BanController;
use App\Http\Controllers\Api\AdminPrivilegeController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\FileManagerController;
use App\Http\Controllers\Api\PlayerStatsController;
use App\Http\Controllers\Api\AgentGatewayController;
use App\Http\Controllers\Api\PluginStudioController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\MatchManagerController;

/*
|--------------------------------------------------------------------------
| CS2Panel REST API Routes (v1)
|--------------------------------------------------------------------------
*/

// Public Authentication & Outbound Agent Gateway
Route::prefix('v1/auth')->group(function () {
    Route::get('/system-status', [AuthController::class, 'systemStatus']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/steam', [AuthController::class, 'steamLogin']);

    // OAuth multi-provider endpoints
    Route::get('/oauth/providers', [OAuthController::class, 'listPublicProviders']);
    Route::get('/oauth/{provider}/redirect', [OAuthController::class, 'redirect']);
    Route::get('/oauth/{provider}/callback', [OAuthController::class, 'callback']);
    Route::post('/oauth/{provider}/callback', [OAuthController::class, 'callback']);
});

// Outbound Agent Gateway (Called by Client AI Agent)
Route::prefix('v1/agent-gateway')->group(function () {
    Route::post('/register', [AgentGatewayController::class, 'register']);
    Route::post('/heartbeat', [AgentGatewayController::class, 'heartbeat']);
    Route::post('/submit-result', [AgentGatewayController::class, 'submitJobResult']);
});

// Protected API Routes
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    // Auth & User
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Admin OAuth Management
    Route::get('/admin/oauth/providers', [OAuthController::class, 'adminIndex']);
    Route::post('/admin/oauth/providers/{provider}', [OAuthController::class, 'adminUpdate']);

    // Connected Client AI Agents
    Route::get('/agents', [AgentGatewayController::class, 'listAgents']);

    // Visual Plugin Studio (.cs2graph Node Editor)
    Route::get('/studio/projects', [PluginStudioController::class, 'index']);
    Route::post('/studio/projects', [PluginStudioController::class, 'store']);
    Route::get('/studio/projects/{id}', [PluginStudioController::class, 'show']);
    Route::put('/studio/projects/{id}', [PluginStudioController::class, 'update']);
    Route::post('/studio/ai-generate', [PluginStudioController::class, 'generateAiNodes']);
    Route::post('/studio/ai-generate-async', [PluginStudioController::class, 'dispatchAiGenerate']);
    Route::post('/studio/projects/{id}/build', [PluginStudioController::class, 'dispatchBuild']);
    Route::post('/studio/projects/{id}/deploy', [PluginStudioController::class, 'deployToServer']);

    // Universal Bi-Directional Job Engine
    Route::get('/jobs', [JobController::class, 'index']);
    Route::get('/jobs/{uuid}', [JobController::class, 'show']);
    Route::post('/jobs/{uuid}/cancel', [JobController::class, 'cancel']);

    // Match Manager (BO1/BO3/BO5, Knife, Pauses, Demos)
    Route::get('/matches', [MatchManagerController::class, 'index']);
    Route::post('/matches', [MatchManagerController::class, 'store']);
    Route::post('/matches/{id}/knife', [MatchManagerController::class, 'startKnife']);
    Route::post('/matches/{id}/pause', [MatchManagerController::class, 'pause']);
    Route::post('/matches/{id}/unpause', [MatchManagerController::class, 'unpause']);

    // Nodes (Admin / Cluster Overview)
    Route::get('/nodes', [NodeController::class, 'index']);
    Route::post('/nodes', [NodeController::class, 'store']);
    Route::get('/nodes/{id}/benchmark', [NodeController::class, 'benchmark']);

    // CS2 Servers Lifecycle
    Route::get('/servers', [ServerController::class, 'index']);
    Route::post('/servers', [ServerController::class, 'store']);
    Route::get('/servers/{id}', [ServerController::class, 'show']);
    Route::delete('/servers/{id}', [ServerController::class, 'destroy']);
    Route::post('/servers/{id}/start', [ServerController::class, 'start']);
    Route::post('/servers/{id}/stop', [ServerController::class, 'stop']);
    Route::post('/servers/{id}/restart', [ServerController::class, 'restart']);
    Route::post('/servers/{id}/repair-symlinks', [ServerController::class, 'repairSymlinks']);

    // RCON & Web Console
    Route::post('/servers/{id}/rcon', [RconController::class, 'execute']);
    Route::get('/servers/{id}/logs', [RconController::class, 'logs']);

    // File Manager & Config Editor
    Route::get('/servers/{id}/files/list', [FileManagerController::class, 'list']);
    Route::get('/servers/{id}/files/read', [FileManagerController::class, 'read']);
    Route::post('/servers/{id}/files/write', [FileManagerController::class, 'write']);
    Route::post('/servers/{id}/files/delete', [FileManagerController::class, 'delete']);
    Route::post('/servers/{id}/files/mkdir', [FileManagerController::class, 'mkdir']);

    // Plugins Marketplace
    Route::get('/plugins', [PluginController::class, 'index']);
    Route::post('/plugins', [PluginController::class, 'store']);
    Route::post('/servers/{id}/plugins/{pluginId}/install', [PluginController::class, 'install']);

    // Steam Workshop Maps
    Route::get('/workshop/maps', [WorkshopController::class, 'index']);
    Route::post('/servers/{id}/workshop/set-map', [WorkshopController::class, 'setMap']);

    // Cvars & Game Mode Presets
    Route::get('/cvars/presets', [CvarController::class, 'presets']);
    Route::post('/servers/{id}/cvars/apply-preset/{presetId}', [CvarController::class, 'applyPreset']);

    // Bans, Mutes & Admins
    Route::get('/servers/{id}/bans', [BanController::class, 'index']);
    Route::post('/servers/{id}/bans', [BanController::class, 'store']);
    Route::post('/bans/{id}/unban', [BanController::class, 'unban']);

    Route::get('/servers/{id}/admins', [AdminPrivilegeController::class, 'index']);
    Route::post('/servers/{id}/admins', [AdminPrivilegeController::class, 'store']);
    Route::delete('/admins/{id}', [AdminPrivilegeController::class, 'destroy']);

    // Backups & Schedules
    Route::get('/servers/{id}/backups', [BackupController::class, 'index']);
    Route::post('/servers/{id}/backups', [BackupController::class, 'store']);
    Route::delete('/backups/{id}', [BackupController::class, 'destroy']);

    Route::get('/servers/{id}/schedules', [ScheduleController::class, 'index']);
    Route::post('/servers/{id}/schedules', [ScheduleController::class, 'store']);
    Route::post('/schedules/{id}/toggle', [ScheduleController::class, 'toggle']);
    Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);

    // Player Stats & Leaderboard
    Route::get('/servers/{id}/stats', [PlayerStatsController::class, 'index']);

    // Support Tickets
    Route::get('/tickets', [TicketController::class, 'index']);
    Route::post('/tickets', [TicketController::class, 'store']);
    Route::get('/tickets/{id}', [TicketController::class, 'show']);
    Route::post('/tickets/{id}/reply', [TicketController::class, 'reply']);

    // Audit & Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
});
