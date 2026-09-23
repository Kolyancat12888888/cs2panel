<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class PanelSetupCommand extends Command
{
    protected $signature = 'setup {--reset-admin : Prompt to create/reset the Super Administrator account}';
    protected $description = 'Interactive setup and environment reconfigurator for CS2Panel (Database, Redis, Drivers, Admin)';

    public function handle(): int
    {
        $this->output->title('===========================================================');
        $this->output->title('          CS2Panel Enterprise Setup & Config Wizard         ');
        $this->output->title('      Database • Redis • Session/Queue Drivers • RBAC       ');
        $this->output->title('===========================================================');

        $envPath = base_path('.env');
        if (!File::exists($envPath)) {
            if (File::exists(base_path('.env.example'))) {
                File::copy(base_path('.env.example'), $envPath);
                $this->info('Created .env from .env.example template.');
            } else {
                File::put($envPath, "APP_NAME=\"CS2Panel\"\nAPP_ENV=local\nAPP_KEY=\nAPP_DEBUG=true\nAPP_URL=http://localhost:8000\n");
                $this->info('Initialized new blank .env file.');
            }
        }

        $envUpdates = [];

        // 1. APP URL & ENV
        $this->line("\n<fg=cyan;options=bold>── Step 1: Application Environment ──</>");
        $appUrl = $this->ask('Application URL (APP_URL)', env('APP_URL', 'http://127.0.0.1:8000'));
        $appEnv = $this->choice('Application Environment (APP_ENV)', ['production', 'local', 'staging'], env('APP_ENV', 'production'));
        $appDebug = $this->confirm('Enable Debug Mode (APP_DEBUG)?', env('APP_DEBUG', false));

        $envUpdates['APP_URL'] = $appUrl;
        $envUpdates['APP_ENV'] = $appEnv;
        $envUpdates['APP_DEBUG'] = $appDebug ? 'true' : 'false';

        // 2. DATABASE CONFIGURATION
        $this->line("\n<fg=cyan;options=bold>── Step 2: Database Configuration ──</>");
        $dbDriver = $this->choice('Database Connection Type', ['sqlite', 'mysql', 'pgsql'], env('DB_CONNECTION', 'sqlite'));
        $envUpdates['DB_CONNECTION'] = $dbDriver;

        if ($dbDriver === 'sqlite') {
            $sqlitePath = $this->ask('SQLite Database Path', env('DB_DATABASE', database_path('database.sqlite')));
            if (!File::exists($sqlitePath) && $sqlitePath === database_path('database.sqlite')) {
                File::ensureDirectoryExists(database_path());
                touch($sqlitePath);
                $this->info("Created SQLite database file at {$sqlitePath}");
            }
            $envUpdates['DB_DATABASE'] = $sqlitePath;
        } else {
            $dbHost = $this->ask('Database Host', env('DB_HOST', '127.0.0.1'));
            $dbPort = $this->ask('Database Port', env('DB_PORT', $dbDriver === 'mysql' ? '3306' : '5432'));
            $dbName = $this->ask('Database Name', env('DB_DATABASE', 'cs2panel'));
            $dbUser = $this->ask('Database Username', env('DB_USERNAME', 'root'));
            $dbPass = $this->secret('Database Password (leave blank for unchanged/empty)', '');

            $envUpdates['DB_HOST'] = $dbHost;
            $envUpdates['DB_PORT'] = $dbPort;
            $envUpdates['DB_DATABASE'] = $dbName;
            $envUpdates['DB_USERNAME'] = $dbUser;
            if ($dbPass !== '') {
                $envUpdates['DB_PASSWORD'] = $dbPass;
            }
        }

        // 3. REDIS CONFIGURATION & LIVE PING TEST
        $this->line("\n<fg=cyan;options=bold>── Step 3: Redis In-Memory Engine ──</>");
        $redisHost = $this->ask('Redis Host', env('REDIS_HOST', '127.0.0.1'));
        $redisPort = $this->ask('Redis Port', env('REDIS_PORT', '6379'));
        $redisPass = $this->secret('Redis Password (optional, press Enter if no password)', '');
        $redisDb = $this->ask('Redis Database Index', env('REDIS_DB', '0'));

        $envUpdates['REDIS_HOST'] = $redisHost;
        $envUpdates['REDIS_PORT'] = $redisPort;
        if ($redisPass !== '') {
            $envUpdates['REDIS_PASSWORD'] = $redisPass;
        }
        $envUpdates['REDIS_DB'] = $redisDb;

        // Perform live Redis Ping
        $this->info("Testing Redis connection to {$redisHost}:{$redisPort}...");
        $redisPing = $this->pingRedis($redisHost, (int)$redisPort, $redisPass ?: env('REDIS_PASSWORD'));
        if ($redisPing['connected']) {
            $this->info("✓ Redis connected successfully! Roundtrip latency: {$redisPing['latency_ms']} ms.");
        } else {
            $this->warn("⚠ Redis warning: " . $redisPing['message']);
            $this->line("  (You can still proceed, but Redis-dependent drivers will fallback if offline)");
        }

        // 4. DRIVER SELECTION
        $this->line("\n<fg=cyan;options=bold>── Step 4: Enterprise Drivers ──</>");
        $sessionDriver = $this->choice(
            'Session Driver (SESSION_DRIVER)',
            ['database', 'redis', 'file', 'cookie'],
            $redisPing['connected'] ? 'redis' : 'database'
        );
        $queueDriver = $this->choice(
            'Queue Connection (QUEUE_CONNECTION)',
            ['database', 'redis', 'sync'],
            $redisPing['connected'] ? 'redis' : 'database'
        );
        $cacheDriver = $this->choice(
            'Cache Store (CACHE_STORE)',
            ['database', 'redis', 'file'],
            $redisPing['connected'] ? 'redis' : 'database'
        );

        $envUpdates['SESSION_DRIVER'] = $sessionDriver;
        $envUpdates['QUEUE_CONNECTION'] = $queueDriver;
        $envUpdates['CACHE_STORE'] = $cacheDriver;

        // 5. WRITE .ENV SAFELY
        $this->line("\n<fg=cyan;options=bold>── Writing Configuration ──</>");
        $this->saveEnv($envUpdates);
        $this->info('✓ Saved all configuration settings to .env (backup created).');

        // Clear and reload config cache
        Artisan::call('config:clear');
        Artisan::call('cache:clear');

        // 6. RUN DATABASE MIGRATIONS & SEEDERS
        if ($this->confirm('Run database migrations and seed system RBAC roles now?', true)) {
            $this->info('Running database migrations...');
            Artisan::call('migrate', ['--force' => true], $this->getOutput());
            $this->info('Seeding RBAC roles and permissions...');
            Artisan::call('db:seed', ['--class' => 'RbacSeeder', '--force' => true], $this->getOutput());
            $this->info('✓ Database schema up to date!');
        }

        // 7. SUPER ADMIN ACCOUNT CREATION / RESET
        $this->line("\n<fg=cyan;options=bold>── Step 5: Super Administrator Account ──</>");
        $existingAdmins = User::whereHas('roles', fn($q) => $q->where('slug', 'superadmin'))->count();

        if ($existingAdmins === 0 || $this->option('reset-admin') || $this->confirm('Create or reset a Super Administrator account?', $existingAdmins === 0)) {
            $adminEmail = $this->ask('SuperAdmin Email Address', 'admin@cs2panel.local');
            $adminName = $this->ask('SuperAdmin Name', 'Super Administrator');
            $adminPass = $this->secret('SuperAdmin Password (min 8 chars)', '');

            while (strlen($adminPass) < 6) {
                $this->error('Password must be at least 6 characters.');
                $adminPass = $this->secret('SuperAdmin Password');
            }

            $user = User::firstOrNew(['email' => $adminEmail]);
            $user->name = $adminName;
            $user->password = Hash::make($adminPass);
            $user->role = 'superadmin';
            $user->server_limit = 100;
            $user->save();

            $superRole = Role::where('slug', 'superadmin')->first();
            if ($superRole) {
                $user->roles()->syncWithoutDetaching([$superRole->id]);
            }
            $user->flushPermissionsCache();

            $this->info("✓ Super Administrator account configured: <fg=green>{$adminEmail}</>");
        }

        // 8. APP KEY CHECK
        if (empty(env('APP_KEY'))) {
            Artisan::call('key:generate', ['--force' => true]);
            $this->info('✓ Generated application encryption key (APP_KEY).');
        }

        $this->output->success('===========================================================');
        $this->output->success('  CS2Panel setup completed successfully! Panel is ready.   ');
        $this->output->success('===========================================================');

        return Command::SUCCESS;
    }

    private function pingRedis(string $host, int $port, ?string $password): array
    {
        $start = microtime(true);
        try {
            $fp = @fsockopen($host, $port, $errno, $errstr, 2.0);
            if (!$fp) {
                return ['connected' => false, 'message' => "Connection refused on {$host}:{$port}"];
            }
            if (!empty($password) && $password !== 'null') {
                fwrite($fp, "*2\r\n$4\r\nAUTH\r\n$" . strlen($password) . "\r\n{$password}\r\n");
                $authResp = fgets($fp);
                if (!str_contains($authResp, '+OK')) {
                    fclose($fp);
                    return ['connected' => false, 'message' => 'Auth error: Invalid password'];
                }
            }
            fwrite($fp, "*1\r\n$4\r\nPING\r\n");
            $resp = fgets($fp);
            fclose($fp);
            $latency = round((microtime(true) - $start) * 1000, 2);
            return ['connected' => true, 'latency_ms' => $latency];
        } catch (\Exception $e) {
            return ['connected' => false, 'message' => $e->getMessage()];
        }
    }

    private function saveEnv(array $data): void
    {
        $envPath = base_path('.env');
        if (!File::exists($envPath)) return;

        File::copy($envPath, base_path('.env.backup.' . time()));
        $content = File::get($envPath);

        foreach ($data as $key => $value) {
            $val = (string)$value;
            if (str_contains($val, ' ') && !str_starts_with($val, '"')) {
                $val = '"' . $val . '"';
            }
            if (preg_match("/^{$key}=.*/m", $content)) {
                $content = preg_replace("/^{$key}=.*/m", "{$key}={$val}", $content);
            } else {
                $content .= "\n{$key}={$val}";
            }
        }

        File::put($envPath, $content);
    }
}
