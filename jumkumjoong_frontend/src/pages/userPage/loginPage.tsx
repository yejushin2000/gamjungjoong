import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import yeslogo from "../../assets/icons/yeslogo.svg";
import kakaologo from "../../assets/icons/kakaoLogin.svg"; // 카카오 로고 아이콘 (작은 사이즈)
import { postLoginUser } from "../../api/users";

declare global {
  interface Window {
    Kakao: any;
  }
}

const JS_KEY = process.env.REACT_APP_JS_KEY;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ 1. Kakao SDK 로드 및 초기화
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://developers.kakao.com/sdk/js/kakao.js";
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(JS_KEY);
        console.log("Kakao SDK 초기화:", window.Kakao.isInitialized());
      }
    };
    document.head.appendChild(script);
  }, []);

  // ✅ 2. 로그인 처리 함수
  const handleKakaoLogin = () => {
    setLoading(true);
    setError("");

    if (!window.Kakao) {
      setError("Kakao SDK 로드 실패");
      setLoading(false);
      return;
    }

    window.Kakao.Auth.loginForm({
      // window.Kakao.Auth.login({
      scope: "profile_nickname, account_email",
      success: async function (authObj: any) {
        const accessToken = authObj.access_token;
        console.log("카카오 access_token:", accessToken);

        try {
          const res = await postLoginUser(accessToken); // 👉 백엔드로 전송
          console.log("로그인 성공:", res);
          // localStorage.setItem("jwt", res.data.accessToken); // 필요시 저장
          navigate("/");
        } catch (err) {
          setError("백엔드 로그인 실패");
        } finally {
          setLoading(false);
        }
      },
      fail: function (err: any) {
        console.error("카카오 로그인 실패:", err);
        setError("카카오 로그인 실패");
        setLoading(false);
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 bg-white text-first">
      <div className="flex flex-col  mb-5 mt-0 pt-0">
        <p className="text-second underline underline-offset-4 font-semibold text-[24px] text-first mt-1">
          중고 전자기기 거래,
        </p>
        <p className="whitespace-prep-wrap font-semibold text-[20px] text-first mt-1">
          "감정중"으로 안심하고 시작하세요
        </p>
      </div>
      <img src={yeslogo} alt="감정중 로고" className="w-[240px] " />
      <p className="text-first text-[16px] text-center mb-2">
        로그인 후 이용해주세요.
      </p>

      <button
        onClick={handleKakaoLogin}
        // onClick={handleKakaoLogin}
        className=" w-full max-w-[320px] flex items-center justify-center gap-2 shadow hover:brightness-105"
        disabled={loading}
      >
        <img src={kakaologo} alt="kakao" className="" />
        {/* 카카오로 간편 로그인 */}
      </button>

      {loading && (
        <p className="text-sm text-gray-500 mt-2">로그인 중입니다...</p>
      )}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <div className="border-t border-gray-200 w-full max-w-[320px] my-6"></div>

      <button
        onClick={() => navigate(-1)}
        className="text-red-500 text-sm underline underline-offset-2 hover:text-red-600"
      >
        뒤로가기
      </button>
    </div>
  );
};

export default LoginPage;
