// src/components/mypage/ReviewSection.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ReviewState, useReviewStore } from "../../stores/useReviewStore";
import { formatDateManually } from "../../utils/dateFormatter";
import star from "../../assets/icons/starFilled.svg";

const ReviewSection: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewState[]>([]);
  const reviewInfo = useReviewStore();

  // 샘플 리뷰 데이터를 가져오는 함수 (실제로는 API 호출)
  useEffect(() => {
    // 최신 3개만 표시
    setReviews(reviewInfo.content.slice(0, 3));
  }, []);

  return (
    <div className="bg-white rounded-lg mt-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          리뷰 ({reviewInfo.content.length})
        </h2>
        <Link to="/reviews" className="text-gray-500 text-sm">
          전체 보기
        </Link>
      </div>

      <div className="space-y-3">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div
              key={review.createdAt}
              className="py-2 border-b flex flex-col gap-2"
            >
              {review.createdAt ? (
                <div className="flex justify-between pppp">
                  {/* 별점 */}
                  <div className="flex gap-1 items-center">
                    <img src={star} alt="star" className="w-5 h-5" />
                    <p className="font-semibold">{review.stars}</p>
                  </div>
                  {/* 작성 일자 */}
                  <div className="flex gap-1">
                    <p>{formatDateManually(review.createdAt).date}</p>
                    <p>{formatDateManually(review.createdAt).time}</p>
                  </div>
                </div>
              ) : (
                <p>--</p>
              )}
              <div className="text-gray-800">
                {review.content && review.content.length > 20
                  ? `${review.content?.slice(0, 20)}...`
                  : review.content}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-2 text-gray-500">
            작성된 리뷰가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
