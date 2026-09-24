<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // User <-> Server Access Pivot
        Schema::create('user_server_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('server_id')->constrained('servers')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['user_id', 'server_id']);
        });

        // User <-> Agent Access Pivot
        Schema::create('user_agent_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('agent_id')->constrained('agents')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['user_id', 'agent_id']);
        });

        // User <-> Canvas / Studio Project Access Pivot
        Schema::create('user_project_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('project_id')->constrained('plugin_projects')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['user_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_project_access');
        Schema::dropIfExists('user_agent_access');
        Schema::dropIfExists('user_server_access');
    }
};
