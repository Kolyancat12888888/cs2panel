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
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SystemSettingsController;
use App\Http\Controllers\Api\AiCopilotController;
use App\Http\Controllers\Api\CrashDoctorController;
use App\Http\Controllers\Api\ServerPackController;
use App\Http\Controllers\Api\FastDlController;

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

// Outbound Agent Gateway (Called by Client AI Agent via Secret Token)
Route::prefix('v1/agent-gateway')->group(function () {
    Route::post('/register', [AgentGatewayController::class, 'register']);
    Route::post('/heartbeat', [AgentGatewayController::class, 'heartbeat']);
    Route::post('/submit-result', [AgentGatewayController::class, 'submitJobResult']);
});

// Protected Authenticated API Routes
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    // Auth & User Profile (Available to all logged-in accounts)
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ─── ADMIN: USERS MANAGEMENT (RBAC) ───
    Route::middleware('permission:users.view')->group(function () {
        Route::get('/admin/users', [UserController::class, 'index']);
        Route::get('/admin/users/{id}', [UserController::class, 'show']);
        Route::get('/admin/users/{id}/resources', [UserController::class, 'getResourceAccess']);
    });
    Route::middleware('permission:users.create')->group(function () {
        Route::post('/admin/users', [UserController::class, 'store']);
    });
    Route::middleware('permission:users.edit')->group(function () {
        Route::put('/admin/users/{id}', [UserController::class, 'update']);
        Route::post('/admin/users/{id}/permissions', [UserController::class, 'updatePermissions']);
        Route::post('/admin/users/{id}/resources', [UserController::class, 'updateResourceAccess']);
    });
    Route::middleware('permission:users.delete')->group(function () {
        Route::delete('/admin/users/{id}', [UserController::class, 'destroy']);
    });

    // ─── ADMIN: ROLES & PERMISSIONS MATRIX ───
    Route::middleware('permission:roles.view')->group(function () {
        Route::get('/admin/roles', [RoleController::class, 'index']);
        Route::get('/admin/roles/permissions', [RoleController::class, 'permissionsList']);
    });
    Route::middleware('permission:roles.manage')->group(function () {
        Route::post('/admin/roles', [RoleController::class, 'store']);
        Route::put('/admin/roles/{id}', [RoleController::class, 'update']);
        Route::delete('/admin/roles/{id}', [RoleController::class, 'destroy']);
    });

    // ─── ADMIN: SYSTEM SETTINGS, REDIS & DRIVERS ───
    Route::middleware('permission:settings.view')->group(function () {
        Route::get('/admin/settings', [SystemSettingsController::class, 'getSettings']);
        Route::get('/admin/oauth/providers', [OAuthController::class, 'adminIndex']);
    });
    Route::middleware('permission:settings.manage')->group(function () {
        Route::post('/admin/settings', [SystemSettingsController::class, 'updateSettings']);
        Route::post('/admin/settings/test-redis', [SystemSettingsController::class, 'testRedis']);
        Route::post('/admin/oauth/providers/{provider}', [OAuthController::class, 'adminUpdate']);
    });

    // ─── CLIENT AI AGENTS ───
    Route::middleware('permission:agents.view')->group(function () {
        Route::get('/agents', [AgentGatewayController::class, 'listAgents']);
        Route::post('/agents/token', [AgentGatewayController::class, 'provisionToken']);
        Route::delete('/agents/{id}', [AgentGatewayController::class, 'destroy']);
    });

    // ─── VISUAL PLUGIN STUDIO (.cs2graph) ───
    Route::middleware('permission:studio.view')->group(function () {
        Route::get('/studio/projects', [PluginStudioController::class, 'index']);
        Route::get('/studio/projects/{id}', [PluginStudioController::class, 'show']);
    });
    Route::middleware('permission:studio.create')->group(function () {
        Route::post('/studio/projects', [PluginStudioController::class, 'store']);
    });
    Route::middleware('permission:studio.edit')->group(function () {
        Route::put('/studio/projects/{id}', [PluginStudioController::class, 'update']);
        Route::post('/studio/ai-generate', [PluginStudioController::class, 'generateAiNodes']);
        Route::post('/studio/ai-generate-async', [PluginStudioController::class, 'dispatchAiGenerate']);
    });
    Route::middleware('permission:studio.build')->group(function () {
        Route::post('/studio/projects/{id}/build', [PluginStudioController::class, 'dispatchBuild']);
    });
    Route::middleware('permission:studio.deploy')->group(function () {
        Route::post('/studio/projects/{id}/deploy', [PluginStudioController::class, 'deployToServer']);
    });

    // Universal Bi-Directional Job Engine
    Route::get('/jobs', [JobController::class, 'index']);
    Route::get('/jobs/{uuid}', [JobController::class, 'show']);
    Route::post('/jobs/{uuid}/cancel', [JobController::class, 'cancel']);

    // ─── MATCH MANAGER ───
    Route::middleware('permission:matches.view')->group(function () {
        Route::get('/matches', [MatchManagerController::class, 'index']);
    });
    Route::middleware('permission:matches.manage')->group(function () {
        Route::post('/matches', [MatchManagerController::class, 'store']);
        Route::post('/matches/{id}/knife', [MatchManagerController::class, 'startKnife']);
        Route::post('/matches/{id}/pause', [MatchManagerController::class, 'pause']);
        Route::post('/matches/{id}/unpause', [MatchManagerController::class, 'unpause']);
    });

    // ─── COMPUTE NODES ───
    Route::middleware('permission:nodes.view')->group(function () {
        Route::get('/nodes', [NodeController::class, 'index']);
        Route::get('/nodes/{id}/benchmark', [NodeController::class, 'benchmark']);
    });
    Route::middleware('permission:nodes.manage')->group(function () {
        Route::post('/nodes', [NodeController::class, 'store']);
    });

    // ─── CS2 SERVERS LIFECYCLE ───
    Route::middleware('permission:servers.view')->group(function () {
        Route::get('/servers', [ServerController::class, 'index']);
        Route::get('/servers/{id}', [ServerController::class, 'show']);
    });
    Route::middleware('permission:servers.create')->group(function () {
        Route::post('/servers', [ServerController::class, 'store']);
    });
    Route::middleware('permission:servers.delete')->group(function () {
        Route::delete('/servers/{id}', [ServerController::class, 'destroy']);
    });
    Route::middleware('permission:servers.power')->group(function () {
        Route::post('/servers/{id}/start', [ServerController::class, 'start']);
        Route::post('/servers/{id}/stop', [ServerController::class, 'stop']);
        Route::post('/servers/{id}/restart', [ServerController::class, 'restart']);
        Route::post('/servers/{id}/repair-symlinks', [ServerController::class, 'repairSymlinks']);
    });

    // ─── RCON & CONSOLE ───
    Route::middleware('permission:servers.console')->group(function () {
        Route::get('/servers/{id}/logs', [RconController::class, 'logs']);
    });
    Route::middleware('permission:servers.rcon')->group(function () {
        Route::post('/servers/{id}/rcon', [RconController::class, 'execute']);
    });

    // ─── FILE MANAGER ───
    Route::middleware('permission:servers.files')->group(function () {
        Route::get('/servers/{id}/files/list', [FileManagerController::class, 'list']);
        Route::get('/servers/{id}/files/read', [FileManagerController::class, 'read']);
        Route::post('/servers/{id}/files/write', [FileManagerController::class, 'write']);
        Route::post('/servers/{id}/files/delete', [FileManagerController::class, 'delete']);
        Route::post('/servers/{id}/files/mkdir', [FileManagerController::class, 'mkdir']);
    });

    // ─── PLUGINS MARKETPLACE ───
    Route::middleware('permission:plugins.view')->group(function () {
        Route::get('/plugins', [PluginController::class, 'index']);
    });
    Route::middleware('permission:plugins.build')->group(function () {
        Route::post('/plugins', [PluginController::class, 'store']);
    });
    Route::middleware('permission:plugins.install')->group(function () {
        Route::post('/servers/{id}/plugins/install-engine', [PluginController::class, 'installEngine']);
        Route::post('/servers/{id}/plugins/reload', [PluginController::class, 'reloadPlugins']);
        Route::post('/servers/{id}/plugins/{pluginId}/install', [PluginController::class, 'install']);
    });

    // ─── WORKSHOP, CVARS, BANS ───
    Route::middleware('permission:servers.edit')->group(function () {
        Route::get('/workshop/maps', [WorkshopController::class, 'index']);
        Route::post('/servers/{id}/workshop/set-map', [WorkshopController::class, 'setMap']);
        Route::get('/cvars/presets', [CvarController::class, 'presets']);
        Route::post('/servers/{id}/cvars/apply-preset/{presetId}', [CvarController::class, 'applyPreset']);
        Route::get('/servers/{id}/bans', [BanController::class, 'index']);
        Route::post('/servers/{id}/bans', [BanController::class, 'store']);
        Route::post('/bans/{id}/unban', [BanController::class, 'unban']);
        Route::get('/servers/{id}/admins', [AdminPrivilegeController::class, 'index']);
        Route::post('/servers/{id}/admins', [AdminPrivilegeController::class, 'store']);
        Route::delete('/admins/{id}', [AdminPrivilegeController::class, 'destroy']);
    });

    // ─── BACKUPS & SCHEDULES ───
    Route::middleware('permission:servers.backups')->group(function () {
        Route::get('/servers/{id}/backups', [BackupController::class, 'index']);
        Route::post('/servers/{id}/backups', [BackupController::class, 'store']);
        Route::delete('/backups/{id}', [BackupController::class, 'destroy']);
    });
    Route::middleware('permission:servers.schedules')->group(function () {
        Route::get('/servers/{id}/schedules', [ScheduleController::class, 'index']);
        Route::post('/servers/{id}/schedules', [ScheduleController::class, 'store']);
        Route::post('/schedules/{id}/toggle', [ScheduleController::class, 'toggle']);
        Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);
    });

    // Player Stats & Leaderboard
    Route::get('/servers/{id}/stats', [PlayerStatsController::class, 'index']);

    // Support Tickets
    Route::get('/tickets', [TicketController::class, 'index']);
    Route::post('/tickets', [TicketController::class, 'store']);
    Route::get('/tickets/{id}', [TicketController::class, 'show']);
    Route::post('/tickets/{id}/reply', [TicketController::class, 'reply']);

    // ─── AI COPILOT & SWARM INTELLIGENCE ───
    Route::get('/copilot/models', [AiCopilotController::class, 'models']);
    Route::post('/copilot/chat', [AiCopilotController::class, 'chat']);
    Route::post('/copilot/analyze-log', [AiCopilotController::class, 'analyzeLog']);

    // ─── AI CRASH DOCTOR & LIVE SENTINEL ───
    Route::get('/servers/{id}/doctor/status', [CrashDoctorController::class, 'status']);
    Route::post('/servers/{id}/doctor/resolve', [CrashDoctorController::class, 'resolveIncident']);

    // ─── 1-CLICK SERVER PACKS ───
    Route::get('/server-packs', [ServerPackController::class, 'index']);
    Route::middleware('permission:servers.create')->group(function () {
        Route::post('/server-packs/deploy', [ServerPackController::class, 'deploy']);
    });

    // ─── FASTDL HTTP ENGINE ───
    Route::get('/servers/{id}/fastdl/assets', [FastDlController::class, 'assets']);
    Route::post('/servers/{id}/fastdl/rebuild', [FastDlController::class, 'rebuild']);

    // ─── AUDIT & ACTIVITY LOGS ───
    Route::middleware('permission:activity.view')->group(function () {
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    });
});
