<?php

$compiledPath = storage_path('framework/views');
if (!is_dir($compiledPath)) {
    @mkdir($compiledPath, 0775, true);
}

return [
    'paths' => [
        resource_path('views'),
    ],
    'compiled' => env(
        'VIEW_COMPILED_PATH',
        realpath($compiledPath) ?: $compiledPath
    ),
];
