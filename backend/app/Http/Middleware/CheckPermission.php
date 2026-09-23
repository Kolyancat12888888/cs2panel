<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$permissions
     */
    public function handle(Request $request, Closure $next, ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated. Valid Bearer Token required.',
            ], 401);
        }

        if ($user->is_banned) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been suspended by an administrator.',
            ], 403);
        }

        // If no specific permission requested, allow authenticated
        if (empty($permissions)) {
            return $next($request);
        }

        // Check if user has ANY of the required permissions (or wildcard '*')
        $hasAccess = false;
        foreach ($permissions as $perm) {
            if ($user->hasPermission(trim($perm))) {
                $hasAccess = true;
                break;
            }
        }

        if (!$hasAccess) {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: You do not possess the required permission (' . implode(', ', $permissions) . ').',
                'required_permissions' => $permissions,
            ], 403);
        }

        return $next($request);
    }
}
