// src/pages/KakaoRedirectPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const KakaoRedirectPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get("code");
    console.log("인가코드:", code);

    if (!code) {
      console.error("code가 없습니다.");
      return;
    }

    fetch("http://localhost:8080/api/auth/login/kakao", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }), // ✅ 여기서 accessToken이 아니라 code 전달
    })
      .then((response) => {
        if (!response.ok) throw new Error("서버 응답 오류");
        return response.json();
      })
      .then((data) => {
        localStorage.setItem("accessToken", data.token);
        console.log("로그인 성공:", data);
        // JWT 저장 등 후처리
        navigate("/"); // 홈으로 이동
      })
      .catch((error) => {
        console.error("로그인 실패:", error);
      });
  }, [navigate]);

  // return (
  //   <div className="h-screen flex justify-center items-center">
  //     <p>로그인 처리 중입니다...</p>
  //   </div>
  // );
};

export default KakaoRedirectPage;
