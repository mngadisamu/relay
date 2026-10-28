'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { departmentTemplates } from '@/lib/templates';

export default function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const router = useRouter();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [tone, setTone] = useState<'formal' | 'friendly' | 'urgent'>('formal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchTicketData() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}`);
        const data = await res.json();
        if (data.ticket) {
          setTicket(data.ticket);
          
          // Get template for department
          const dept = data.ticket.department || 'IT';
          const templates = (departmentTemplates as any)[dept] || departmentTemplates.IT;
          const initialTemplate = templates[0];

          // Request initial AI draft
          generateDraft(data.ticket.subject + ': ' + data.ticket.description, dept, initialTemplate, 'formal');
        }
      } catch (err) {
        console.error('Failed to load ticket:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTicketData();
  }, [ticketId]);

  const generateDraft = async (content: string, dept: string, template: string, selectedTone: 'formal' | 'friendly' | 'urgent') => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          ticketContent: content,
          department: dept,
          templateText: template,
          tone: selectedTone,
        }),
      });

      const data = await res.json();
      if (data.draft) {
        setDraft(data.draft);
      }
    } catch (err) {
      console.error('Failed to generate draft:', err);
      setDraft(template);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToneChange = (newTone: 'formal' | 'friendly' | 'urgent') => {
    setTone(newTone);
    if (ticket) {
      const dept = ticket.department || 'IT';
      const templates = (departmentTemplates as any)[dept] || departmentTemplates.IT;
      const index = newTone === 'friendly' ? 1 : newTone === 'urgent' ? 2 : 0;
      generateDraft(ticket.subject + ': ' + ticket.description, dept, templates[index], newTone);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyText: draft,
          tone: tone,
        }),
      });

      if (res.ok) {
        alert('Reply sent successfully! Ticket marked as Answered.');
        router.push('/agent');
      } else {
        alert('Failed to send reply.');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading ticket details...</div>;
  }

  if (!ticket) {
    return <div className="p-8 text-center text-red-500">Ticket not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          <p className="text-sm text-gray-500">Department: <span className="font-semibold">{ticket.department}</span></p>
        </div>
        <button
          onClick={() => router.push('/agent')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Inbox
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket Description</h3>
        <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-md border">{ticket.description}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
              AI-drafted
            </span>
            {isGenerating && <span className="text-xs text-blue-600 animate-pulse">Generating new tone...</span>}
          </div>
          <div className="space-x-1">
            {(['formal', 'friendly', 'urgent'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleToneChange(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-colors ${
                  tone === t ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Edit AI draft here before sending..."
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-md shadow transition-colors disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send Reply & Close Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}