'use client';

import React, { useEffect, useState } from 'react';
import { LifeBuoy, Plus, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface Ticket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: 1, subject: 'Inquiry regarding custom workshop collection auto-download', status: 'open', priority: 'medium', created_at: '2026-09-21 18:20' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', priority: 'medium', message: '' });

  useEffect(() => {
    fetchApi('/tickets').then((data) => {
      if (Array.isArray(data) && data.length > 0) setTickets(data);
    }).catch(() => {});
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/tickets', {
        method: 'POST',
        body: JSON.stringify(newTicket),
      });
      setTickets([res, ...tickets]);
      setIsModalOpen(false);
      setNewTicket({ subject: '', priority: 'medium', message: '' });
    } catch (err: any) {
      alert(`Create ticket failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Support & Assistance</h1>
          <p className="text-xs text-cs2-muted mt-1">
            Direct communication with system administrators and server engineers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cs2-orange text-black font-bold text-xs hover:bg-cs2-orangeHover transition flex items-center gap-2 shadow-lg shadow-cs2-orange/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="p-4 rounded-xl bg-cs2-surface border border-cs2-border flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{t.subject}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-green/20 text-cs2-green">
                  {t.status}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cs2-card text-cs2-orange">
                  {t.priority}
                </span>
              </div>
              <div className="text-xs text-cs2-muted mt-1">
                Ticket ID: <span className="font-mono text-gray-300">#{t.id}</span> | Created: {t.created_at}
              </div>
            </div>

            <button className="px-3 py-1.5 rounded-lg bg-cs2-card hover:bg-cs2-orange hover:text-black text-white text-xs font-bold transition flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Chat</span>
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cs2-surface border border-cs2-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Create Support Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-cs2-muted block mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-cs2-card border border-cs2-border text-white text-xs focus:outline-none focus:border-cs2-orange resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cs2-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-cs2-card text-xs font-bold text-cs2-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cs2-orange text-black text-xs font-bold hover:bg-cs2-orangeHover"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
