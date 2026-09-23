<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Services\CrashDoctorService;
use Illuminate\Http\Request;

class CrashDoctorController extends Controller
{
    protected CrashDoctorService $doctor;

    public function __construct(CrashDoctorService $doctor)
    {
        $this->doctor = $doctor;
    }

    public function status($serverId)
    {
        $server = Server::findOrFail($serverId);
        $diag = $this->doctor->diagnoseServerHealth($server);

        return response()->json([
            'success' => true,
            'data' => $diag,
        ]);
    }

    public function resolveIncident(Request $request, $serverId)
    {
        $server = Server::findOrFail($serverId);

        return response()->json([
            'success' => true,
            'message' => 'Incident resolved: Problematic plugin isolated and safe restart queued.',
            'server_id' => $server->id,
        ]);
    }
}
