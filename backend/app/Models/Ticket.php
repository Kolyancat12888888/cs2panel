<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    protected $fillable = [
        'user_id',
        'server_id',
        'subject',
        'status',   // 'open', 'in_progress', 'resolved', 'closed'
        'priority', // 'low', 'medium', 'high', 'critical'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function server()
    {
        return $this->belongsTo(Server::class);
    }

    public function messages()
    {
        return $this->hasMany(TicketMessage::class);
    }
}
