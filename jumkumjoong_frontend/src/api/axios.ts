import axios from "axios";
import { useAuthStore } from "../stores/useUserStore";

export const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  // baseURL: "http://localhost:8080/api/",
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});
console.log("🌐 API Base URL:", process.env.REACT_APP_API_URL);

// 요청 시마다 상태에서 accessToken을 가져와서 헤더에 추가
axiosInstance.interceptors.request.use(
  (config) => {
    // 먼저 스토어에서 토큰 확인
    const storeToken = useAuthStore.getState().accessToken;
    // 스토어에 없으면 로컬 스토리지에서 확인
    const localToken = localStorage.getItem("accessToken");

    // 사용할 토큰 결정 (스토어 우선)
    const tokenToUse = storeToken || localToken;
    console.log("🌐 API Base URL:", process.env.REACT_APP_API_URL);

    console.log("🔑 토큰 확인:", {
      스토어: storeToken ? "있음" : "없음",
      로컬스토리지: localToken ? "있음" : "없음",
    });

    if (tokenToUse) {
      config.headers["Authorization"] = `Bearer ${tokenToUse}`;
      console.log("✅ 토큰으로 인증 헤더 설정 완료");

      // 스토어에 토큰이 없지만 로컬 스토리지에는 있는 경우, 스토어 업데이트
      if (!storeToken && localToken) {
        console.log("🔄 로컬 스토리지 토큰으로 스토어 업데이트");
        useAuthStore.getState().setAccessToken(localToken);
      }
    } else {
      console.warn("⚠️ 액세스 토큰이 없습니다.");

      // 개발 환경에서 테스트용 토큰 사용 (선택사항
    }

    return config;
  },
  (error) => {
    console.error("❌ 요청 인터셉터 오류:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 추가 (선택사항)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("📡 API 응답 오류:", {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
    });
    return Promise.reject(error);
  }
);

export default axiosInstance;
