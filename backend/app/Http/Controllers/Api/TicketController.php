<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Ticket::with(['user', 'server']);

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        return response()->json($query->latest()->get());
    }

    public function show($id, Request $request)
    {
        $ticket = Ticket::with(['user', 'server', 'messages.user'])->findOrFail($id);
        if (!$request->user()->isAdmin() && $ticket->user_id !== $request->user()->id) {
            abort(403);
        }
        return response()->json($ticket);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'subject' => 'required|string',
            'server_id' => 'nullable|exists:servers,id',
            'priority' => 'required|in:low,medium,high,critical',
            'message' => 'required|string',
        ]);

        $ticket = Ticket::create([
            'user_id' => $request->user()->id,
            'server_id' => $data['server_id'] ?? null,
            'subject' => $data['subject'],
            'priority' => $data['priority'],
            'status' => 'open',
        ]);

        TicketMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'message' => $data['message'],
            'is_admin_reply' => false,
        ]);

        return response()->json($ticket->load('messages'), 201);
    }

    public function reply($id, Request $request)
    {
        $request->validate(['message' => 'required|string']);
        $ticket = Ticket::findOrFail($id);

        $msg = TicketMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'message' => $request->message,
            'is_admin_reply' => $request->user()->isAdmin(),
        ]);

        $ticket->update(['status' => $request->user()->isAdmin() ? 'in_progress' : 'open']);

        return response()->json($msg->load('user'));
    }
}
