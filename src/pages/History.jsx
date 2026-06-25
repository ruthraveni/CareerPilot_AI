import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { History as HistoryIcon, Loader2, AlertCircle, Calendar, Award, Star } from 'lucide-react';

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/history');
      setHistory(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch interview history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Layout title="Interview History">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <span className="text-slate-500 font-medium">Loading interview history...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Interview History">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Something went wrong</h3>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <button 
            onClick={fetchHistory}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Interview History">
      <div className="max-w-5xl mx-auto">
        {history.length === 0 ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="bg-blue-50 p-4 rounded-3xl text-blue-600 mb-4">
              <HistoryIcon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No interviews recorded</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              You haven't completed any AI Mock Interviews yet. Start an interview to see your progress history!
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Past Sessions</h3>
              <span className="text-xs font-semibold text-slate-400">{history.length} Completed</span>
            </div>
            <div className="divide-y divide-slate-100">
              {history.map((session) => (
                <div key={session.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 flex-shrink-0">
                      <Star className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-800">{session.role}</h4>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs font-semibold">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full uppercase">
                          {session.type}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full uppercase ${
                          session.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
                          session.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {session.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end space-x-8">
                    <div className="flex items-center text-slate-400 text-sm font-semibold">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{new Date(session.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl border border-blue-100 font-extrabold text-sm">
                        <Award className="h-4 w-4 mr-1.5" />
                        <span>Score: {session.final_score}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default History;
