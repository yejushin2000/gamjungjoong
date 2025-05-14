// src/pages/ReviewPage/ReviewRegisterPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import NavigationBar from "../../components/common/NavigationBar";
import Header from "../../components/common/Header";

import starFilled from "../../assets/icons/starFilled.svg";
import starEmpty from "../../assets/icons/starEmpty.svg";
import starHalf from "../../assets/icons/starHalf.svg";

import { postReviewRegist } from "../../api/reviews";
import { useReviewStore } from "../../stores/useReviewStore";

export interface ReviewItemProps {
  itemId: number;
  content: string;
  stars: number;
}

const ReviewRegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // 하드코딩
  const userName = "박수연.";

  const [formData, setFormData] = useState<ReviewItemProps>({
    stars: 0,
    itemId: 4,
    content: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 입력 필드 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStarClick = (value: number) => {
    setFormData((prev) => ({ ...prev, stars: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.stars) {
      alert("별점과 리뷰는 필수 입력 항목입니다.");
      return false;
    }
    if (formData.content.trim().length < 20) {
      alert("리뷰는 20자 이상 작성해주세요.");
      return false;
    }
    return true;
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // let finalDescription = formData.content;

      const submissionData = {
        ...formData,
        content: formData.content.trim(),
      };

      // 상품 등록 API 호출
      // const submissionData = {
      //   ...formData,
      //   content: finalDescription,
      //   stars: formData.stars,
      // };
      console.log("submission: ", submissionData);

      const response = await postReviewRegist(submissionData);

      console.log("등록된 상품 정보:", response);

      if (response.status_code === 200) {
        useReviewStore.getState().addContent({
          content: submissionData.content,
          stars: submissionData.stars,
          createdAt: new Date().toISOString(),
        });
      }

      // 성공 시 리뷰 페이지로 이동
      alert("리뷰가 등록되었습니다.");
      navigate("/reviews");
    } catch (error) {
      console.error("리뷰 등록 오류:", error);
      alert("리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 취소 처리
  const handleCancel = () => {
    navigate(-1);
  };

  const renderStarRating = () => (
    <div className="flex justify-between items-center w-full p-2 border border-gray-300 rounded-md">
      <div className="text-lg ml-4">{formData.stars} 점</div>
      <div className="flex mr-4">
        {[1, 2, 3, 4, 5].map((value) => {
          const half = value - 0.5;
          const icon =
            formData.stars >= value
              ? starFilled
              : formData.stars >= half
              ? starHalf
              : starEmpty;
          return (
            <div key={value} className="relative w-10 h-10">
              <div
                className="absolute w-1/2 h-full left-0 top-0 cursor-pointer z-10"
                onClick={() => handleStarClick(half)}
              />
              <div
                className="absolute w-1/2 h-full right-0 top-0 cursor-pointer z-10"
                onClick={() => handleStarClick(value)}
              />
              <img src={icon} alt={`star-${value}`} className="w-10 h-10" />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="container h-screen mx-auto text-first">
      {/* 통일된 헤더 사용 */}
      <Header showBackButton={true} title="LOGO" hideSearchButton={true} />
      {/* 리뷰작성 제목 */}
      <div className="px-4 pt-4 bg-white">
        <h1 className="text-2xl font-bold">리뷰 작성</h1>
      </div>
      {/* 폼 영역 - 스크롤 문제 해결을 위해 여백 증가 */}
      <div className="font-semibold mb-4 flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* 신뢰도 입력 */}
          <div>
            <label
              htmlFor="title"
              className="block text-md font-medium text-gray-700 mb-1"
            >
              {userName} 님의 물건은 어땠나요?
            </label>
            <label
              htmlFor="title"
              className="block text-md font-medium text-gray-700 mb-1"
            >
              신뢰도를 입력해주세요.
            </label>
            {renderStarRating()}
          </div>

          {/* 리뷰 입력 */}
          <div>
            <label
              htmlFor="description"
              className="block text-md font-medium text-gray-700 mb-1"
            >
              리뷰를 남겨주세요.
            </label>
            <textarea
              id="content"
              name="content"
              rows={6}
              value={formData.content}
              onChange={handleInputChange}
              className="w-full h-auto p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                formData.content.trim().length === 0
                  ? "리뷰를 입력하세요. \n리뷰는 20자 이상 작성해주세요."
                  : "리뷰를 입력하세요."
              }
            />
            <p className="text-end mr-1 text-first/70">
              {formData.content.trim().length}/100
            </p>
          </div>
        </div>
      </div>

      {/* 하단 버튼 영역 - sticky로 변경하여 스크롤과 무관하게 항상 표시 */}
      <div className="flex-1 px-3 py-7 bg-white flex gap-2 grid grid-cols-6">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="col-span-2 flex-1 py-3 bg-first/60 text-white font-medium rounded-md hover:bg-red-600 disabled:bg-red-300"
        >
          취소하기
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="col-span-4 flex-1 py-3 bg-second text-white font-medium rounded-md hover:bg-gray-700 disabled:bg-gray-400"
        >
          {isLoading ? "등록 중..." : "등록하기"}
        </button>
      </div>

      {/* 하단 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <NavigationBar />
      </div>
    </div>
  );
};

export default ReviewRegisterPage;
