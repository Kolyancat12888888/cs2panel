<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobTask;
use Illuminate\Http\Request;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = JobTask::with('agent');

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->latest()->paginate(25));
    }

    public function show($uuid)
    {
        $job = JobTask::where('uuid', $uuid)->with('agent')->firstOrFail();
        return response()->json($job);
    }

    public function cancel($uuid)
    {
        $job = JobTask::where('uuid', $uuid)->firstOrFail();
        $job->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Job cancelled successfully', 'job' => $job]);
    }
}
