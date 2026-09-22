<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oauth_providers', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->unique(); // steam, discord, github, google, vkontakte
            $table->string('name');
            $table->boolean('is_enabled')->default(false);
            $table->text('client_id')->nullable();
            $table->text('client_secret')->nullable();
            $table->string('redirect_url')->nullable();
            $table->json('extra_config')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'provider_name')) {
                $table->string('provider_name')->nullable()->after('password');
            }
            if (!Schema::hasColumn('users', 'provider_id')) {
                $table->string('provider_id')->nullable()->after('provider_name');
            }
        });

        // Seed default supported providers
        $providers = [
            ['provider' => 'steam', 'name' => 'Steam OpenID', 'is_enabled' => false, 'redirect_url' => 'http://localhost:3000/auth/callback/steam'],
            ['provider' => 'discord', 'name' => 'Discord', 'is_enabled' => false, 'redirect_url' => 'http://localhost:3000/auth/callback/discord'],
            ['provider' => 'github', 'name' => 'GitHub', 'is_enabled' => false, 'redirect_url' => 'http://localhost:3000/auth/callback/github'],
            ['provider' => 'google', 'name' => 'Google', 'is_enabled' => false, 'redirect_url' => 'http://localhost:3000/auth/callback/google'],
            ['provider' => 'vkontakte', 'name' => 'VKontakte (VK ID)', 'is_enabled' => false, 'redirect_url' => 'http://localhost:3000/auth/callback/vkontakte'],
        ];

        foreach ($providers as $p) {
            \Illuminate\Support\Facades\DB::table('oauth_providers')->insert(array_merge($p, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_providers');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['provider_name', 'provider_id']);
        });
    }
};
