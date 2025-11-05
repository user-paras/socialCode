import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Issue } from '../lib/supabase';
import { MapPin, Upload, AlertCircle, CheckCircle, LogOut, Camera, FileText } from 'lucide-react';
import MapView from './MapView';

const CATEGORIES = [
  'Pothole',
  'Littering',
  'Water Stagnation',
  'Broken Streetlight',
  'Other',
];

export default function UserDashboard() {
  const { user, profile, signOut } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.warn('Could not get location:', error);
        setUserLocation([28.6139, 77.209]);
      }
    );

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      setMessage({ type: 'error', text: 'Please upload an image' });
      return;
    }

    if (!userLocation) {
      setMessage({ type: 'error', text: 'Unable to get your location. Please enable location services.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const filePath = `public/${user!.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('issue_images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('issue_images')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('issues').insert({
        title,
        description,
        category,
        image_url: publicUrlData.publicUrl,
        latitude: userLocation[0],
        longitude: userLocation[1],
        user_id: user!.id,
        status: 'unresolved',
      });

      if (insertError) throw insertError;

      setMessage({ type: 'success', text: 'Issue reported successfully!' });
      setTitle('');
      setDescription('');
      setCategory('');
      setImageFile(null);
      const fileInput = document.getElementById('issue-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
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
              <h1 className="text-xl font-bold text-gray-900">CivicReport</h1>
              <p className="text-sm text-gray-600">Welcome, {profile?.username}</p>
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
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">Report New Issue</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="issue-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    id="issue-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="e.g., Large pothole on Main St."
                  />
                </div>

                <div>
                  <label htmlFor="issue-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="issue-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                    placeholder="Add more details..."
                  />
                </div>

                <div>
                  <label htmlFor="issue-category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="issue-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="issue-image" className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Image
                  </label>
                  <div className="relative">
                    <input
                      id="issue-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <Camera className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {message && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-lg ${
                      message.type === 'error'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    {message.type === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm ${message.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                      {message.text}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-5 h-5" />
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Community Issues Map</h2>
                <p className="text-sm text-gray-600">View all reported issues in your area</p>
              </div>
              <MapView issues={issues} userLocation={userLocation} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
