// src/components/review/ReviewItem.tsx
import React from 'react';

export interface Review {
  id: number;
  content: string;
  rating: number;
  date: string;
}

interface ReviewItemProps {
  review: Review;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  return (
    <div className="p-4 bg-white rounded-lg mb-3 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="text-lg">{review.content}</div>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="ml-1 font-bold">{review.rating}</span>
        </div>
        <div className="text-gray-500 text-sm">{review.date}</div>
      </div>
    </div>
  );
};

export default ReviewItem;