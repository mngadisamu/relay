import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AgentHome() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  // Fetch tickets for the agent's department, joined with classifications
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*, classifications(*)')
    .eq('department', profile.department || 'IT')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Inbox</h1>
          <p className="text-sm text-gray-600">
            Department: <span className="font-semibold">{profile.department || 'IT'}</span>
          </p>
        </div>
        <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
          Logged in as {profile.full_name || 'Agent'}
        </div>
      </div>

      <div className="bg-white shadow border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Incoming Requests
          </h3>
          <span className="text-xs text-gray-500">Most urgent first, then oldest</span>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50">
            Error loading tickets: {error.message}
          </div>
        )}

        {!tickets || tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No tickets found for your department right now.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tickets.map((ticket: any) => {
              const classification = ticket.classifications?.[0];
              const isNeedsReview = classification?.confidence < 0.6 || ticket.status === 'Needs review';

              return (
                <li key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/agent/ticket/${ticket.id}`} className="block px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-semibold text-gray-900">
                            {ticket.subject || 'Untitled Request'}
                          </span>
                          {isNeedsReview && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                              Needs review
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {ticket.description}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                          ticket.status === 'Answered' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {ticket.status || 'Pending'}
                        </span>
                        <div className="text-xs text-gray-400">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}