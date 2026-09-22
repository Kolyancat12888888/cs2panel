<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\OAuthController;

Route::get('/', function () {
    return response()->json([
        'name' => 'CS2Panel Central API',
        'version' => '1.0.0',
        'status' => 'operational',
        'documentation' => '/api/v1/docs',
    ]);
});

// Direct Web OAuth entry points for browser redirects
Route::get('/auth/oauth/{provider}/redirect', [OAuthController::class, 'redirect']);
Route::get('/auth/oauth/{provider}/callback', [OAuthController::class, 'callback']);
Route::post('/auth/oauth/{provider}/callback', [OAuthController::class, 'callback']);
