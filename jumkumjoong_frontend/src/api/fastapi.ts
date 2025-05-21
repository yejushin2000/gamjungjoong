// src/api/fastapi.ts
import axios from "axios";
import { useAuthStore } from "../stores/useUserStore";

const fastapiInstance = axios.create({
  baseURL: "http://3.39.9.184:8000", // 예: http://localhost:8000, 
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
  },
});

fastapiInstance.interceptors.request.use(
  (config) => {
    const storeToken = useAuthStore.getState().accessToken;
    const localToken = localStorage.getItem("accessToken");
    const tokenToUse = storeToken || localToken;

    if (tokenToUse) {
      config.headers["Authorization"] = `Bearer ${tokenToUse}`;
      if (!storeToken && localToken) {
        useAuthStore.getState().setAccessToken(localToken);
      }
    } else {
      console.warn("⚠️ FastAPI: 액세스 토큰이 없습니다.");
    }

    return config;
  },
  (error) => {
    console.error("❌ FastAPI 요청 인터셉터 오류:", error);
    return Promise.reject(error);
  }
);

fastapiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("📡 FastAPI 응답 오류:", {
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export default fastapiInstance;