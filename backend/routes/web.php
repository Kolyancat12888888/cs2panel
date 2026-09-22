<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'CS2Panel Central API',
        'version' => '1.0.0',
        'status' => 'operational',
        'documentation' => '/api/v1/docs',
    ]);
});
