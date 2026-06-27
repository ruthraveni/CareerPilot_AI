import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';

export default function RatingModal({ isOpen, onClose, featureId, featureName, initialRating, initialComment }) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialComment || '');
  
  const queryClient = useQueryClient();

  const { mutate: submitRating, isPending } = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error('Please select a star rating.');
      const res = await api.post(`/ratings/${featureId}`, { rating, comment });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      // Invalidate to refetch the fresh average and user rating dynamically
      queryClient.invalidateQueries({ queryKey: ['ratingStats', featureId] });
      queryClient.invalidateQueries({ queryKey: ['ratingHistory'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit rating. Please try again.');
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--cp-border)] flex items-center justify-between bg-[var(--cp-surface)]">
          <h3 className="font-bold text-lg text-[var(--cp-text)]">Rate {featureName}</h3>
          <button 
            onClick={onClose}
            className="text-[var(--cp-text-muted)] hover:text-[var(--cp-text)] transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4 mb-6">
            <p className="text-[var(--cp-text-muted)] text-sm font-medium text-center">
              How was your experience using this feature?
            </p>
            <div className="flex items-center space-x-2" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star 
                    className={`h-10 w-10 ${
                      (hoverRating || rating) >= star 
                        ? 'text-amber-400 fill-amber-400' 
                        : 'text-slate-600 hover:text-slate-500'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--cp-text)]">
              <MessageSquare className="h-4 w-4 text-[var(--cp-text-muted)]" />
              Additional Feedback (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you liked or how we can improve..."
              className="w-full bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-xl p-3 text-sm text-[var(--cp-text)] placeholder-[var(--cp-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-28"
              maxLength={500}
            />
            <div className="text-right text-xs text-[var(--cp-text-muted)]">
              {comment.length}/500
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--cp-surface)] border-t border-[var(--cp-border)] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--cp-text)] hover:bg-[var(--cp-border)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => submitRating()}
            disabled={isPending || rating === 0}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting</>
            ) : (
              'Submit Rating'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
