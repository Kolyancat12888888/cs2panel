<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('steam_id')->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->string('role')->default('user'); // admin, user
            $table->integer('server_limit')->default(2);
            $table->string('two_factor_secret')->nullable();
            $table->boolean('two_factor_enabled')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('nodes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('fqdn');
            $table->string('ip_address');
            $table->integer('daemon_port')->default(8080);
            $table->integer('sftp_port')->default(2022);
            $table->string('daemon_secret');
            $table->string('master_path')->default('/opt/cs2panel/master_cs2');
            $table->boolean('is_active')->default(true);
            $table->integer('total_ram_mb')->default(32768);
            $table->integer('total_disk_gb')->default(500);
            $table->integer('cpu_cores')->default(8);
            $table->string('location')->default('EU-Frankfurt');
            $table->timestamps();
        });

        Schema::create('servers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('node_id')->constrained('nodes')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('port')->default(27015);
            $table->integer('rcon_port')->default(27015);
            $table->string('rcon_password');
            $table->integer('tv_port')->default(27020);
            $table->string('gslt_token')->nullable();
            $table->string('default_map')->default('de_dust2');
            $table->integer('game_type')->default(0);
            $table->integer('game_mode')->default(1);
            $table->integer('max_players')->default(16);
            $table->string('status')->default('offline');
            $table->integer('cpu_limit')->default(200); // 200% = 2 cores
            $table->integer('memory_limit_mb')->default(4096);
            $table->integer('disk_limit_mb')->default(10240);
            $table->boolean('has_css')->default(true);
            $table->boolean('has_metamod')->default(true);
            $table->boolean('fastdl_enabled')->default(true);
            $table->boolean('auto_restart_on_crash')->default(true);
            $table->timestamp('last_crash_at')->nullable();
            $table->integer('crash_count')->default(0);
            $table->timestamps();
        });

        Schema::create('plugins', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category')->default('gameplay');
            $table->text('description');
            $table->string('author')->default('Community');
            $table->string('version')->default('1.0.0');
            $table->string('download_url');
            $table->string('github_repo')->nullable();
            $table->boolean('requires_css')->default(true);
            $table->boolean('requires_metamod')->default(true);
            $table->longText('default_config_json')->nullable();
            $table->string('icon_url')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->integer('install_count')->default(0);
            $table->timestamps();
        });

        Schema::create('bans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('steam_id')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('player_name')->default('Unknown Player');
            $table->string('ban_type')->default('ban'); // ban, mute, gag, ip_ban
            $table->string('reason')->default('Rule violation');
            $table->string('admin_name')->default('Console');
            $table->string('admin_steam_id')->nullable();
            $table->integer('duration_minutes')->default(0); // 0 = permanent
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_unbanned')->default(false);
            $table->string('unban_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_privileges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('steam_id');
            $table->string('player_name')->default('Admin User');
            $table->string('group_name')->default('admin');
            $table->string('flags')->default('@css/ban @css/kick @css/chat');
            $table->integer('immunity')->default(50);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('name');
            $table->string('cron_expression');
            $table->string('action_type'); // restart, rcon_command, backup, change_map
            $table->text('payload')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();
        });

        Schema::create('backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('name');
            $table->string('file_name');
            $table->string('file_path');
            $table->string('disk')->default('local');
            $table->bigInteger('size_bytes')->default(0);
            $table->string('checksum')->nullable();
            $table->boolean('is_successful')->default(true);
            $table->boolean('is_locked')->default(false);
            $table->timestamps();
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('server_id')->nullable()->constrained('servers')->nullOnDelete();
            $table->string('subject');
            $table->string('status')->default('open');
            $table->string('priority')->default('medium');
            $table->timestamps();
        });

        Schema::create('ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->string('attachment_path')->nullable();
            $table->boolean('is_admin_reply')->default(false);
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('server_id')->nullable()->constrained('servers')->nullOnDelete();
            $table->string('action');
            $table->text('description');
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();
        });

        Schema::create('workshop_maps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workshop_id')->unique();
            $table->string('title');
            $table->string('map_name');
            $table->string('preview_url')->nullable();
            $table->bigInteger('file_size_bytes')->default(0);
            $table->json('game_mode_tags')->nullable();
            $table->string('author')->nullable();
            $table->timestamps();
        });

        Schema::create('cvar_presets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('game_mode');
            $table->text('description')->nullable();
            $table->json('cvars_json');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('player_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('steam_id');
            $table->string('player_name');
            $table->integer('kills')->default(0);
            $table->integer('deaths')->default(0);
            $table->integer('headshots')->default(0);
            $table->integer('mvps')->default(0);
            $table->integer('score')->default(0);
            $table->integer('rounds_won')->default(0);
            $table->integer('rounds_lost')->default(0);
            $table->integer('playtime_seconds')->default(0);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_stats');
        Schema::dropIfExists('cvar_presets');
        Schema::dropIfExists('workshop_maps');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('ticket_messages');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('backups');
        Schema::dropIfExists('schedules');
        Schema::dropIfExists('admin_privileges');
        Schema::dropIfExists('bans');
        Schema::dropIfExists('plugins');
        Schema::dropIfExists('servers');
        Schema::dropIfExists('nodes');
        Schema::dropIfExists('users');
    }
};
