import { axiosInstance } from "./axios";
import { useAuthStore } from "../stores/useUserStore";

interface ReviewRegistProps {
  itemId: number;
  content: string;
  stars: number;
}

// 리뷰 생성
export const postReviewRegist = async (review: ReviewRegistProps) => {
  try {
    const response = await axiosInstance.post("/reviews", {
      itemId: review.itemId,
      content: review.content,
      stars: review.stars,
    });

    console.log("리뷰 등록: ", response);
    return response.data;
  } catch (error) {
    console.log("리뷰 등록 실패: ", error);
    return null;
  }
};

// 리뷰 조회
export const getReview = async () => {
  try {
    const response = await axiosInstance.get("/reviews");
    console.log("리뷰 조회: ", response);
    if (response.data.status_code === 200) {
      return response.data.body.content;
    }
    return [];
  } catch (error) {
    console.log("리뷰 조회 실패: ", error);
    return null;
  }
};

export const getReviewStars = async () => {
  try {
    const response = await axiosInstance.get("/reviews/stars");
    console.log("별점 평균 조회: ", response.data.body);

    return response;
  } catch (error) {
    console.log("별점 평균 조회 실패: ", error);
    return null;
  }
};
