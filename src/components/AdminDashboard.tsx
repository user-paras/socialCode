import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Issue } from '../lib/supabase';
import { MapPin, LogOut, CheckCircle, AlertTriangle, Image } from 'lucide-react';
import MapView from './MapView';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
    subscribeToIssues();
  }, []);

  const fetchIssues = async () => {
    const { data } = await supabase
      .from('issues')
      .select('*')
      .eq('status', 'unresolved')
      .order('created_at', { ascending: false });

    if (data) setIssues(data);
  };

  const subscribeToIssues = () => {
    const channel = supabase
      .channel('public:issues')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issues' },
        (payload) => {
          if (payload.new.status === 'unresolved') {
            setIssues((prev) => [payload.new as Issue, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'issues' },
        (payload) => {
          if ((payload.new as Issue).status === 'resolved') {
            setIssues((prev) => prev.filter((issue) => issue.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleResolve = async (issueId: string) => {
    setResolving(issueId);
    try {
      const { error } = await supabase
        .from('issues')
        .update({ status: 'resolved' })
        .eq('id', issueId);

      if (error) throw error;
      
      // Immediately remove the resolved issue from the local state for instant UI update
      setIssues((prev) => prev.filter((issue) => issue.id !== issueId));

    } catch (error) {
      console.error('Error resolving issue:', error);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Manage community issues</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Unresolved Issues</h2>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full">
                  {issues.length}
                </span>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                {issues.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No unresolved issues</p>
                    <p className="text-sm text-gray-500">Great job keeping the community clean!</p>
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1">{issue.title}</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              {issue.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(issue.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {issue.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{issue.description}</p>
                          )}
                          {issue.image_url && (
                            <a
                              href={issue.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mb-3"
                            >
                              <Image className="w-4 h-4" />
                              View Image
                            </a>
                          )}
                          <button
                            onClick={() => handleResolve(issue.id)}
                            disabled={resolving === issue.id}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {resolving === issue.id ? 'Resolving...' : 'Mark as Resolved'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Issues Map</h2>
                <p className="text-sm text-gray-600">All reported issues across the community</p>
              </div>
              <MapView issues={issues} userLocation={null} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
