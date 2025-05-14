import React, { useState } from "react";
import Header from "../../components/common/Header";
import NavigationBar from "../../components/common/NavigationBar";
import { useAuthStore } from "../../stores/useUserStore";
import { useNavigate } from "react-router-dom";
import { patchUserInfo } from "../../api/users";

const InfoEditPage: React.FC = () => {
  const navigate = useNavigate();

  const authStore = useAuthStore();
  const currentNickname = authStore.nickname ?? "";
  const [nickname, setNickname] = useState(currentNickname);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSubmit = async () => {
    if (!nickname.trim() || nickname === currentNickname) return;
    if (nickname.trim().length > 10) {
      alert("닉네임은 10자 이하로 작성해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await patchUserInfo(nickname);
      if (response.status === 200) {
        authStore.setNickname(nickname); // ✅ Zustand store 업데이트
        alert("닉네임이 변경되었습니다.");
        navigate("/mypage");
      } else {
        alert("닉네임 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("닉네임 변경 오류:", error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container h-screen mx-auto text-first">
      {/* 통일된 헤더 사용 */}
      <Header showBackButton={true} title="LOGO" hideSearchButton={true} />
      {/* 리뷰작성 제목 */}
      <div className="px-4 pt-4 bg-white">
        <h1 className="text-2xl font-bold">회원정보 변경</h1>
      </div>
      {/* 폼 영역 - 스크롤 문제 해결을 위해 여백 증가 */}
      <div className="font-semibold mb-4 flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div>
            <label
              htmlFor="description"
              className="block text-md font-medium text-gray-700 mb-1"
            >
              닉네임을 변경해주세요.
            </label>
            <input
              id="content"
              name="content"
              value={nickname}
              placeholder="닉네임을 입력하세요."
              onChange={(e) => setNickname(e.target.value)}
              className="w-full h-auto p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-end mr-1 text-first/70">
              {nickname.length}자/10자
            </p>
          </div>
        </div>
      </div>

      {/* 하단 버튼 영역 - sticky로 변경하여 스크롤과 무관하게 항상 표시 */}
      <div className="flex-1 px-3 py-7 bg-white flex gap-2 grid grid-cols-6">
        <button
          type="button"
          onClick={handleCancel}
          className="col-span-2 flex-1 py-3 bg-first/60 text-white font-medium rounded-md hover:bg-red-600 disabled:bg-red-300"
        >
          취소하기
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isLoading || nickname.trim() === "" || nickname === currentNickname
          }
          className="col-span-4 flex-1 py-3 bg-second text-white font-medium rounded-md hover:bg-gray-700 disabled:bg-gray-400"
        >
          {isLoading ? "변경 중..." : "변경하기"}
        </button>
      </div>

      {/* 하단 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <NavigationBar />
      </div>
    </div>
  );
};

export default InfoEditPage;
