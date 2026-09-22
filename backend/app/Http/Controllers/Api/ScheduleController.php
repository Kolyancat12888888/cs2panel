<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\Server;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index($serverId)
    {
        return response()->json(Schedule::where('server_id', $serverId)->get());
    }

    public function store($serverId, Request $request)
    {
        $server = Server::findOrFail($serverId);
        $data = $request->validate([
            'name' => 'required|string',
            'cron_expression' => 'required|string',
            'action_type' => 'required|in:restart,rcon_command,backup,change_map',
            'payload' => 'nullable|string',
        ]);

        $schedule = Schedule::create(array_merge($data, ['server_id' => $server->id]));
        return response()->json($schedule, 201);
    }

    public function toggle($id)
    {
        $schedule = Schedule::findOrFail($id);
        $schedule->update(['is_active' => !$schedule->is_active]);
        return response()->json($schedule);
    }

    public function destroy($id)
    {
        $schedule = Schedule::findOrFail($id);
        $schedule->delete();
        return response()->json(['message' => 'Schedule deleted successfully']);
    }
}
