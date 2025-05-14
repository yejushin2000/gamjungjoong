// src/pages/ReviewListPage.tsx
import React from "react";
import Header from "../../components/common/Header";
import NavigationBar from "../../components/common/NavigationBar";
import ReviewItem from "../../components/review/ReviewItem";
import { Link } from "react-router-dom";
import { useReviewStore } from "../../stores/useReviewStore";

const ReviewListPage: React.FC = () => {
  const reviewInfo = useReviewStore();

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 헤더에 hideSearchButton 속성 추가 */}
      <Header showBackButton={true} title="나의 리뷰" hideSearchButton={true} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-baseline">
            <h1 className="text-2xl font-bold mb-4">나의 리뷰</h1>

            <Link
              to={"/reviews/register"}
              className="border rounded-md bg-third text-white px-3 py-2"
            >
              리뷰 작성
            </Link>
          </div>

          {reviewInfo.content.length > 0 ? (
            <div className="space-y-3">
              {[...reviewInfo.content]
                .sort(
                  (a, b) =>
                    new Date(
                      b.createdAt || new Date().toISOString()
                    ).getTime() -
                    new Date(a.createdAt || new Date().toISOString()).getTime()
                )
                .map((review) => (
                  <ReviewItem key={review.createdAt} review={review} />
                ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              작성한 리뷰가 없습니다.
            </div>
          )}
        </div>
      </div>

      <NavigationBar />
    </div>
  );
};

export default ReviewListPage;
