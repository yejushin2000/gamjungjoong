import { axiosInstance } from "./axios";
import { useAuthStore } from "../stores/useUserStore";

// 로그인 및 회원가입
export const postLoginUser = async (accessToken: string): Promise<any> => {
  try {
    const response = await axiosInstance.post("/auth/login/kakao", {
      accessToken,
    });

    console.log("로그인/회원가입: ", response);
    if (response.data.status_code === 200) {
      const serverAccessToken = response.data.body.accessToken;
      const refreshToken = response.data.body.refreshToken;

      // 로컬 스토리지에 토큰 저장
      localStorage.setItem('accessToken', serverAccessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Zustand 스토어 업데이트
      useAuthStore.getState().setAccessToken(serverAccessToken);
      useAuthStore.getState().setRefreshToken(refreshToken);
    }
    return response.data;
  } catch (error) {
    console.log("로그인/회원가입 실패: ", error);
    return null;
  }
};

// 회원페이지 조회
export const getUserInfo = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get("/users");

    if (response.data.status_code === 200) {
      const nickname = response.data.body.nickname;
      const email = response.data.body.email;
      const status = response.data.body.status;

      useAuthStore.getState().setNickname(nickname);
      useAuthStore.getState().setEmail(email);
      useAuthStore.getState().setStatus(status);
    }
    return response.data;
  } catch (error) {
    console.log("회원정보 조회 실패: ", error);
    return null;
  }
};

// 리뷰 조회
export const getUserReview = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get("/users/reviews");

    console.log("리뷰 조회: ", response);
    return response;
  } catch (error) {
    console.log("리뷰 조회 실패: ", error);
    return null;
  }
};

// 정보 수정
export const patchUserInfo = async (nickname: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch("/users", {
      nickname: nickname,
    });

    console.log("정보 수정: ", response);
    return response;
  } catch (error) {
    console.log("정보 수정 실패: ", error);
    return null;
  }
};
