import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, StarHalf } from 'lucide-react';
import RatingModal from './RatingModal';
import api from '../utils/api';

export default function RatingWidget({ featureId, featureName }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['ratingStats', featureId],
    queryFn: async () => {
      const res = await api.get(`/ratings/stats/${featureId}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 animate-pulse bg-[var(--cp-surface)] px-4 py-2 rounded-full border border-[var(--cp-border)] w-64 h-10">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 w-4 bg-[var(--cp-border)] rounded-full"></div>
          ))}
        </div>
        <div className="h-4 bg-[var(--cp-border)] rounded w-16"></div>
      </div>
    );
  }

  const { average = 0, total = 0, user_rating = null, user_comment = '' } = stats || {};

  // Render 5 stars dynamically based on average rating
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(average)) {
        stars.push(<Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />);
      } else if (i === Math.ceil(average) && average % 1 !== 0) {
        stars.push(
          <div key={i} className="relative">
            <Star className="h-4 w-4 text-slate-600" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${(average % 1) * 100}%` }}>
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-slate-600" />);
      }
    }
    return stars;
  };

  return (
    <>
      <div className="flex items-center flex-wrap gap-3 bg-[var(--cp-surface)] px-4 py-2 rounded-full border border-[var(--cp-border)] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm text-[var(--cp-text)]">{average.toFixed(1)}</span>
          <div className="flex gap-0.5">
            {renderStars()}
          </div>
        </div>
        <div className="hidden sm:block w-px h-4 bg-[var(--cp-border)]"></div>
        <div className="text-xs font-semibold text-[var(--cp-text-muted)]">
          {total.toLocaleString()} {total === 1 ? 'user' : 'users'}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-auto sm:ml-2 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded-full"
        >
          {user_rating ? '⭐ Edit Rating' : '⭐ Give Rating'}
        </button>
      </div>

      <RatingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        featureId={featureId}
        featureName={featureName}
        initialRating={user_rating}
        initialComment={user_comment}
      />
    </>
  );
}
