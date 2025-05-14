// src/components/common/Header.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import yeslogo from "../../assets/icons/yeslogo.svg";
import search from "../../assets/icons/Search.svg";
import logout from "../../utils/logout";

interface HeaderProps {
  onSearch?: () => void;
  showBackButton?: boolean;
  title?: string;
  hideSearchButton?: boolean; // 검색 버튼 숨김 옵션
  showLogout?: boolean; // 로그아웃 버튼 표시 옵션 추가
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  showBackButton = false,
  title = "LOGO",
  hideSearchButton = false,
  showLogout = false, // 기본값은 로그아웃 버튼 숨김
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // 검색어 입력 처리
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 검색 처리
  const handleSearch = async () => {
    try {
      console.log("검색어: ", searchTerm);
      navigate("/goods/list", { state: searchTerm });
    } catch (error) {
      console.log("검색 실패: ", error);
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 left-0 w-full h-[96px] flex items-center shadow-md bg-white px-4 pt-2 z-10">
      <Link to="/">
        <img src={yeslogo} alt="logo" className="w-[96px] h-[96px] block" />
      </Link>

      {/* 로그아웃 버튼 또는 검색창 표시 */}
      {showLogout ? (
        <div className="w-[100%] h-10 self-center px-4 flex justify-end">
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600"
          >
            <span>로그아웃</span>
            <svg
              className="w-6 h-6 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      ) : !hideSearchButton ? (
        <div className="flex w-[100%] h-10 self-center rounded-md bg-fourth text-first/70 px-4">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="검색어를 입력하세요."
            className="w-[100%] h-10 self-center rounded-md bg-fourth text-first/70"
          />
          <img
            src={search}
            alt="search"
            className="w-6"
            onClick={handleSearch}
          />
        </div>
      ) : (
        <p className="w-[100%] h-10 self-center px-4"></p>
      )}
    </header>
  );
};

export default Header;
