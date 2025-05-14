// src/components/review/ReviewItem.tsx
import React from "react";
import star from "../../assets/icons/starFilled.svg";
import { ReviewState } from "../../stores/useReviewStore";
import { formatDateManually } from "../../utils/dateFormatter";

export interface Review {
  content: string;
  stars: number;
  createdAt: string;
}

interface ReviewItemProps {
  review: ReviewState;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  return (
    <div className="p-4 bg-white rounded-lg mb-3 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <img src={star} alt="star" className="w-5 h-5" />
          <span className="ml-1 font-bold">{review.stars}</span>
        </div>
        <div className="text-gray-500 text-sm">
          {review.createdAt ? (
            <div className="flex gap-1">
              <p>{formatDateManually(review.createdAt).date}</p>
              <p>{formatDateManually(review.createdAt).time}</p>
            </div>
          ) : (
            <p>알 수 없음</p>
          )}
        </div>
      </div>
      <div className="flex justify-between items-start">
        <div className="text-lg">{review.content}</div>
      </div>
    </div>
  );
};

export default ReviewItem;
