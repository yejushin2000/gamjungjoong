// src/pages/MyPage.tsx
import React, { useEffect, useState } from "react";

import Header from "../../components/common/Header";
import NavigationBar from "../../components/common/NavigationBar";
import ProfileSection from "../../components/mypage/ProfileSection";
import ReviewSection from "../../components/mypage/ReviewSection";
import ActionSection from "../../components/mypage/ActionSection";

import { useAuthStore } from "../../stores/useUserStore";
import { useReviewStore } from "../../stores/useReviewStore";

import { getReview, getReviewStars } from "../../api/reviews";

const MyPage: React.FC = () => {
  const userInfo = useAuthStore();
  const reviewInfo = useReviewStore();
  const [rating, setRating] = useState<number>(3);

  useEffect(() => {
    loadReviewData();
  }, []);

  const loadReviewData = async () => {
    try {
      const [starRes, reviewRes] = await Promise.all([
        getReviewStars(),
        getReview(),
      ]);

      if (reviewRes) {
        reviewInfo.setContent(reviewRes);
      }

      if (starRes) {
        // setRating(starRes);
        console.log(starRes);
      }
    } catch (error) {
      console.log("리뷰 로딩 실패: ", error);
      setRating(3);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 헤더 - 로그아웃 버튼 표시 */}
      <Header showLogout={true} />

      <div className="flex-1 overflow-y-auto">
        {/* 컨텐츠 영역에 좌우 여백 적용 */}
        <div className="max-w-md mx-auto px-4">
          {/* 프로필 섹션 */}
          <ProfileSection
            username={userInfo.nickname ? userInfo.nickname : "user123"}
            rating={rating}
          />

          {/* 리뷰 섹션 */}
          <ReviewSection />

          {/* 액션 섹션 (거래 내역, 찜한 목록, 내가 작성한 글) */}
          <ActionSection />
        </div>
      </div>

      <NavigationBar />
    </div>
  );
};

export default MyPage;
