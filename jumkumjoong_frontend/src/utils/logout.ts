// utils/logout.ts
import { useAuthStore } from "../stores/useUserStore";

const logout = () => {
  // 로그아웃 로직 구현
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  // Zustand store에서 사용자 상태 제거
  const {
    removeAccessToken,
    removeRefreshToken,
    removeNickname,
    removeEmail,
    removeStatus,
  } = useAuthStore.getState();

  removeAccessToken();
  removeRefreshToken();
  removeNickname();
  removeEmail();
  removeStatus();
};

export default logout;
