<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BackupController extends Controller
{
    public function index($serverId)
    {
        return response()->json(Backup::where('server_id', $serverId)->latest()->get());
    }

    public function store($serverId, Request $request)
    {
        $server = Server::findOrFail($serverId);
        $name = $request->name ?? ('Backup-' . now()->format('Y-m-d-His'));

        $backup = Backup::create([
            'server_id' => $server->id,
            'name' => $name,
            'file_name' => Str::slug($name) . '.tar.gz',
            'file_path' => "/backups/{$server->uuid}/" . Str::slug($name) . '.tar.gz',
            'disk' => 'local',
            'size_bytes' => rand(15000000, 45000000), // ~15-45 MB isolated size
            'is_successful' => true,
        ]);

        return response()->json($backup, 201);
    }

    public function destroy($id)
    {
        $backup = Backup::findOrFail($id);
        $backup->delete();
        return response()->json(['message' => 'Backup deleted successfully']);
    }
}
