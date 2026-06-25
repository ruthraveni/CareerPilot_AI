import Layout from '../components/Layout';
import { Sparkles } from 'lucide-react';

function ComingSoon({ title }) {
  return (
    <Layout title={title}>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="bg-blue-50 p-4 rounded-3xl text-blue-600 mb-6 animate-bounce">
          <Sparkles className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Module Under Construction</h2>
        <p className="text-slate-500 mt-2 max-w-sm text-sm leading-relaxed">
          We are building the {title} module. This feature will be implemented in the upcoming development phases.
        </p>
      </div>
    </Layout>
  );
}

export default ComingSoon;
