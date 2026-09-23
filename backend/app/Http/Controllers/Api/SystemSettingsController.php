<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class SystemSettingsController extends Controller
{
    public function getSettings()
    {
        $envPath = base_path('.env');
        $envContent = File::exists($envPath) ? File::get($envPath) : '';

        // Test Redis connection status
        $redisStatus = $this->pingRedisInstance(
            config('database.redis.default.host'),
            config('database.redis.default.port'),
            config('database.redis.default.password')
        );

        // Test Database status
        $dbStatus = ['connected' => false, 'message' => ''];
        try {
            DB::connection()->getPdo();
            $dbStatus['connected'] = true;
            $dbStatus['driver'] = DB::connection()->getDriverName();
            $dbStatus['database'] = DB::connection()->getDatabaseName();
        } catch (\Exception $e) {
            $dbStatus['message'] = $e->getMessage();
        }

        return response()->json([
            'success' => true,
            'environment' => [
                'app_name' => config('app.name'),
                'app_env' => config('app.env'),
                'app_debug' => config('app.debug'),
                'app_url' => config('app.url'),
            ],
            'database' => $dbStatus,
            'redis' => [
                'host' => config('database.redis.default.host', '127.0.0.1'),
                'port' => config('database.redis.default.port', 6379),
                'password_set' => !empty(config('database.redis.default.password')),
                'database' => config('database.redis.default.database', '0'),
                'status' => $redisStatus,
            ],
            'drivers' => [
                'session_driver' => config('session.driver', 'file'),
                'queue_driver' => config('queue.default', 'sync'),
                'cache_driver' => config('cache.default', 'file'),
            ],
            'supported_drivers' => [
                'session' => ['file', 'redis', 'database', 'cookie', 'array'],
                'queue' => ['sync', 'redis', 'database'],
                'cache' => ['file', 'redis', 'database', 'array'],
            ],
        ]);
    }

    public function testRedis(Request $request)
    {
        $host = $request->input('host', config('database.redis.default.host', '127.0.0.1'));
        $port = (int)$request->input('port', config('database.redis.default.port', 6379));
        $password = $request->input('password', config('database.redis.default.password'));

        $res = $this->pingRedisInstance($host, $port, $password);

        return response()->json([
            'success' => $res['connected'],
            'message' => $res['message'],
            'latency_ms' => $res['latency_ms'] ?? null,
            'details' => $res,
        ], $res['connected'] ? 200 : 422);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'app_url' => 'nullable|url',
            'app_env' => 'nullable|in:production,local,staging',
            'app_debug' => 'nullable|boolean',
            'redis_host' => 'nullable|string',
            'redis_port' => 'nullable|integer|min:1|max:65535',
            'redis_password' => 'nullable|string',
            'redis_database' => 'nullable|integer|min:0|max:15',
            'session_driver' => 'nullable|in:file,redis,database,cookie,array',
            'queue_driver' => 'nullable|in:sync,redis,database',
            'cache_driver' => 'nullable|in:file,redis,database,array',
        ]);

        $envUpdates = [];

        if (isset($validated['app_url'])) $envUpdates['APP_URL'] = $validated['app_url'];
        if (isset($validated['app_env'])) $envUpdates['APP_ENV'] = $validated['app_env'];
        if (isset($validated['app_debug'])) $envUpdates['APP_DEBUG'] = $validated['app_debug'] ? 'true' : 'false';

        if (isset($validated['redis_host'])) $envUpdates['REDIS_HOST'] = $validated['redis_host'];
        if (isset($validated['redis_port'])) $envUpdates['REDIS_PORT'] = (string)$validated['redis_port'];
        if (array_key_exists('redis_password', $validated)) {
            $envUpdates['REDIS_PASSWORD'] = $validated['redis_password'] ?? 'null';
        }
        if (isset($validated['redis_database'])) $envUpdates['REDIS_DB'] = (string)$validated['redis_database'];

        if (isset($validated['session_driver'])) $envUpdates['SESSION_DRIVER'] = $validated['session_driver'];
        if (isset($validated['queue_driver'])) $envUpdates['QUEUE_CONNECTION'] = $validated['queue_driver'];
        if (isset($validated['cache_driver'])) $envUpdates['CACHE_STORE'] = $validated['cache_driver'];

        // Write updates to .env
        $this->updateEnvFile($envUpdates);

        // Clear and rebuild caches
        try {
            Artisan::call('config:clear');
            Artisan::call('cache:clear');
        } catch (\Exception $e) {
            // Ignore if cache clear throws in development
        }

        return response()->json([
            'success' => true,
            'message' => 'System settings and environment variables updated successfully.',
            'applied_updates' => array_keys($envUpdates),
        ]);
    }

    private function pingRedisInstance(string $host, int $port, ?string $password): array
    {
        $start = microtime(true);
        $timeout = 2.0;

        try {
            if (class_exists(\Redis::class)) {
                $client = new \Redis();
                $connected = @$client->connect($host, $port, $timeout);
                if (!$connected) {
                    return ['connected' => false, 'message' => "Could not connect to Redis at {$host}:{$port} (Connection Refused/Timeout)"];
                }
                if (!empty($password) && $password !== 'null') {
                    $auth = @$client->auth($password);
                    if (!$auth) {
                        return ['connected' => false, 'message' => 'Redis authentication failed: Invalid password.'];
                    }
                }
                $pong = $client->ping();
                $latency = round((microtime(true) - $start) * 1000, 2);
                $client->close();
                return [
                    'connected' => true,
                    'message' => "PONG! Connected to Redis in {$latency} ms.",
                    'latency_ms' => $latency,
                    'driver' => 'php-redis',
                ];
            } else {
                // Fallback socket ping
                $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);
                if (!$fp) {
                    return ['connected' => false, 'message' => "Socket error {$errno}: {$errstr}"];
                }
                fwrite($fp, "*1\r\n$4\r\nPING\r\n");
                $resp = fgets($fp);
                fclose($fp);
                $latency = round((microtime(true) - $start) * 1000, 2);
                return [
                    'connected' => true,
                    'message' => "PONG! Socket connected in {$latency} ms.",
                    'latency_ms' => $latency,
                    'driver' => 'raw-socket',
                ];
            }
        } catch (\Exception $e) {
            return ['connected' => false, 'message' => $e->getMessage()];
        }
    }

    private function updateEnvFile(array $data): void
    {
        $envPath = base_path('.env');
        if (!File::exists($envPath)) {
            return;
        }

        // Backup existing .env
        File::copy($envPath, base_path('.env.backup.' . time()));

        $content = File::get($envPath);

        foreach ($data as $key => $value) {
            $formattedValue = $value;
            if (str_contains($value, ' ') && !str_starts_with($value, '"')) {
                $formattedValue = '"' . $value . '"';
            }

            if (preg_match("/^{$key}=.*/m", $content)) {
                $content = preg_replace("/^{$key}=.*/m", "{$key}={$formattedValue}", $content);
            } else {
                $content .= "\n{$key}={$formattedValue}";
            }
        }

        File::put($envPath, $content);
    }
}
