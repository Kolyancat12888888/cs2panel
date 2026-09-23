<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        $permissionsByModule = [
            'Dashboard' => [
                ['slug' => 'dashboard.view', 'name' => 'View Dashboard & Analytics', 'description' => 'Access overview statistics and dashboard'],
            ],
            'Servers' => [
                ['slug' => 'servers.view', 'name' => 'View Game Servers', 'description' => 'Browse server list and status'],
                ['slug' => 'servers.create', 'name' => 'Create Game Server', 'description' => 'Deploy new CS2 instances'],
                ['slug' => 'servers.edit', 'name' => 'Edit Server Configuration', 'description' => 'Modify server settings and cvars'],
                ['slug' => 'servers.delete', 'name' => 'Delete Game Server', 'description' => 'Destroy server instance and wipe files'],
                ['slug' => 'servers.power', 'name' => 'Control Server Power', 'description' => 'Start, stop, and restart game servers'],
                ['slug' => 'servers.console', 'name' => 'Access Web Console & Logs', 'description' => 'Live server logs and console view'],
                ['slug' => 'servers.rcon', 'name' => 'Execute RCON Commands', 'description' => 'Send raw administrative commands'],
                ['slug' => 'servers.files', 'name' => 'Manage Server Files', 'description' => 'File manager read, edit, delete, upload'],
                ['slug' => 'servers.backups', 'name' => 'Manage Backups', 'description' => 'Create and restore server backups'],
                ['slug' => 'servers.schedules', 'name' => 'Manage Cron Schedules', 'description' => 'Automated tasks and restarts'],
            ],
            'Plugin Studio' => [
                ['slug' => 'studio.view', 'name' => 'View Visual Studio', 'description' => 'Open node graph editor and view projects'],
                ['slug' => 'studio.create', 'name' => 'Create Plugin Projects', 'description' => 'Design new CS2 visual plugins'],
                ['slug' => 'studio.edit', 'name' => 'Edit Plugin Node Graphs', 'description' => 'Modify node connections and logic'],
                ['slug' => 'studio.build', 'name' => 'Compile & Build Plugins', 'description' => 'Dispatch .NET 8 builds to AI Agent'],
                ['slug' => 'studio.deploy', 'name' => 'Deploy Plugins to Servers', 'description' => '1-Click deploy compiled .dll to CS2 instances'],
            ],
            'Client AI Agents' => [
                ['slug' => 'agents.view', 'name' => 'View AI Agents', 'description' => 'List connected client agents and device health'],
                ['slug' => 'agents.manage', 'name' => 'Manage AI Agents & Tasks', 'description' => 'Assign jobs, tokens, and restart agents'],
            ],
            'Matches & Tournaments' => [
                ['slug' => 'matches.view', 'name' => 'View Matches', 'description' => 'View match lobbies and tournament brackets'],
                ['slug' => 'matches.manage', 'name' => 'Manage Matches', 'description' => 'Create matches, pause, knife rounds, record demos'],
            ],
            'Node Cluster' => [
                ['slug' => 'nodes.view', 'name' => 'View Compute Nodes', 'description' => 'Monitor CPU, RAM and cluster nodes'],
                ['slug' => 'nodes.manage', 'name' => 'Manage Compute Nodes', 'description' => 'Add new daemon nodes and run benchmarks'],
            ],
            'Marketplace & Plugins' => [
                ['slug' => 'plugins.view', 'name' => 'Browse Marketplace', 'description' => 'View public plugins and Metamod extensions'],
                ['slug' => 'plugins.install', 'name' => 'Install Plugins', 'description' => 'Install Metamod and CSSharp plugins to servers'],
                ['slug' => 'plugins.build', 'name' => 'Upload & Build Plugins', 'description' => 'Publish custom plugins to store'],
            ],
            'User & Role Management' => [
                ['slug' => 'users.view', 'name' => 'View Users', 'description' => 'Browse registered user directory'],
                ['slug' => 'users.create', 'name' => 'Create User Accounts', 'description' => 'Create new panel accounts manually'],
                ['slug' => 'users.edit', 'name' => 'Edit Users & Permissions', 'description' => 'Modify roles, custom overrides, and limits'],
                ['slug' => 'users.delete', 'name' => 'Delete & Ban Users', 'description' => 'Suspend or delete user accounts'],
                ['slug' => 'roles.view', 'name' => 'View Roles', 'description' => 'View system roles and permission sets'],
                ['slug' => 'roles.manage', 'name' => 'Manage Roles & Matrix', 'description' => 'Create, modify and delete custom roles'],
            ],
            'System & Infrastructure' => [
                ['slug' => 'settings.view', 'name' => 'View System Settings', 'description' => 'View environment status, Redis, and drivers'],
                ['slug' => 'settings.manage', 'name' => 'Manage Redis & System Drivers', 'description' => 'Configure Redis, Sessions, Queues, .env'],
                ['slug' => 'activity.view', 'name' => 'View Audit Logs', 'description' => 'Browse security activity and audit logs'],
            ],
        ];

        // 1. Create all permissions
        $createdPermMap = [];
        foreach ($permissionsByModule as $module => $perms) {
            foreach ($perms as $p) {
                $permModel = Permission::firstOrCreate(
                    ['slug' => $p['slug']],
                    [
                        'name' => $p['name'],
                        'module' => $module,
                        'description' => $p['description'],
                    ]
                );
                $createdPermMap[$p['slug']] = $permModel->id;
            }
        }

        // 2. Create Roles
        // SuperAdmin (Full System Access)
        $superAdminRole = Role::firstOrCreate(
            ['slug' => 'superadmin'],
            [
                'name' => 'Super Administrator',
                'description' => 'Unrestricted root access to the entire CS2 platform and cluster',
                'is_system' => true,
            ]
        );
        $superAdminRole->permissions()->sync(array_values($createdPermMap));

        // Administrator (Full Operational Access)
        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Administrator',
                'description' => 'Full administrative access to servers, studio, agents, and users',
                'is_system' => true,
            ]
        );
        $adminRole->permissions()->sync(array_values($createdPermMap));

        // Operator (Server & Studio Management)
        $operatorRole = Role::firstOrCreate(
            ['slug' => 'operator'],
            [
                'name' => 'Server Operator',
                'description' => 'Manage game servers, deploy plugins, control matches and console',
                'is_system' => true,
            ]
        );
        $operatorPerms = [
            'dashboard.view',
            'servers.view', 'servers.power', 'servers.console', 'servers.rcon', 'servers.files', 'servers.backups',
            'studio.view', 'studio.create', 'studio.edit', 'studio.build', 'studio.deploy',
            'agents.view',
            'matches.view', 'matches.manage',
            'plugins.view', 'plugins.install',
        ];
        $operatorRole->permissions()->sync(array_intersect_key($createdPermMap, array_flip($operatorPerms)));

        // User / Standard (Minimal Default: Dashboard Only)
        $userRole = Role::firstOrCreate(
            ['slug' => 'user'],
            [
                'name' => 'Standard User',
                'description' => 'Default non-privileged account. Only dashboard is accessible.',
                'is_system' => true,
            ]
        );
        $userRole->permissions()->sync([$createdPermMap['dashboard.view']]);

        // 3. Attach SuperAdmin role to existing admin users
        $admins = User::where('role', 'admin')->orWhere('id', 1)->get();
        foreach ($admins as $admin) {
            $admin->roles()->syncWithoutDetaching([$superAdminRole->id, $adminRole->id]);
            $admin->flushPermissionsCache();
        }

        // Attach user role to all other users
        $regularUsers = User::where('role', '!=', 'admin')->where('id', '!=', 1)->get();
        foreach ($regularUsers as $u) {
            $u->roles()->syncWithoutDetaching([$userRole->id]);
            $u->flushPermissionsCache();
        }
    }
}
