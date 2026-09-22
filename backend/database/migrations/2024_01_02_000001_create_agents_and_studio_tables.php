<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('agent_id')->unique();
            $table->string('device_id');
            $table->string('device_name');
            $table->string('agent_token');
            $table->string('status')->default('offline'); // ready, busy, offline, error
            $table->string('os')->default('windows');
            $table->string('arch')->default('x64');
            $table->float('cpu_usage')->default(0);
            $table->integer('ram_usage_mb')->default(0);
            $table->string('active_job_id')->nullable();
            $table->json('capabilities')->nullable();
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->timestamps();
        });

        Schema::create('job_tasks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('agent_id')->nullable();
            $table->foreignId('server_id')->nullable()->constrained('servers')->nullOnDelete();
            $table->string('type'); // plugin.generate, plugin.build, plugin.deploy, etc.
            $table->string('priority')->default('normal');
            $table->string('status')->default('pending');
            $table->integer('progress')->default(0);
            $table->json('payload')->nullable();
            $table->json('result')->nullable();
            $table->json('logs')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('plugin_projects', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('category')->default('gameplay');
            $table->string('version')->default('1.0.0');
            $table->string('author')->default('User');
            $table->boolean('is_public')->default(false);
            $table->json('graph_json')->nullable();
            $table->json('manifest_json')->nullable();
            $table->string('icon')->nullable();
            $table->timestamps();
        });

        Schema::create('graph_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plugin_project_id')->constrained('plugin_projects')->cascadeOnDelete();
            $table->string('version_number');
            $table->string('commit_message')->nullable();
            $table->json('graph_snapshot');
            $table->longText('csharp_source')->nullable();
            $table->integer('node_count')->default(0);
            $table->integer('connection_count')->default(0);
            $table->timestamps();
        });

        Schema::create('match_games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('match_id')->unique();
            $table->string('title');
            $table->string('format')->default('BO1'); // BO1, BO3, BO5
            $table->string('team_1_name')->default('Team Alpha');
            $table->string('team_2_name')->default('Team Bravo');
            $table->integer('team_1_score')->default(0);
            $table->integer('team_2_score')->default(0);
            $table->string('current_map')->default('de_mirage');
            $table->string('status')->default('warmup');
            $table->string('gotv_demo_url')->nullable();
            $table->json('stats_json')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_games');
        Schema::dropIfExists('graph_versions');
        Schema::dropIfExists('plugin_projects');
        Schema::dropIfExists('job_tasks');
        Schema::dropIfExists('agents');
    }
};
