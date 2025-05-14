import { Link, useNavigate } from "react-router-dom";

import yeslogo from "../../assets/icons/yeslogo.svg";
import close from "../../assets/icons/close.svg";
import laptop from "../../assets/icons/laptop.svg";
import keyboard from "../../assets/icons/keyboard.svg";
import phone from "../../assets/icons/phone.svg";
import tablet from "../../assets/icons/tablet.svg";
import heart from "../../assets/icons/Heart.svg";
import chat from "../../assets/icons/message-chat.svg";
import settings from "../../assets/icons/settings.svg";
import logout from "../../assets/icons/logout.svg";

import Logout from "../../utils/logout";

interface MenuModalProps {
  onClose: () => void;
}

export default function MenuModal({ onClose }: MenuModalProps) {
  const navigate = useNavigate();

  const categoryActions = [
    {
      id: "laptop",
      icon: <img src={laptop} alt="laptop" className="w-10 h-10" />,
      label: "노트북",
      path: "/goods/list", // 이 경로를 확인
    },
    {
      id: "keyboard",
      icon: <img src={keyboard} alt="keyboard" className="w-10 h-10" />,
      label: "키보드",
      path: "/goods/list",
    },
    {
      id: "phone",
      icon: <img src={phone} alt="phone" className="w-10 h-10" />,
      label: "휴대폰",
      path: "/goods/list",
    },
    {
      id: "tablet",
      icon: <img src={tablet} alt="tablet" className="w-10 h-10" />,
      label: "태블릿",
      path: "/goods/list",
    },
  ];

  const actions = [
    {
      id: "transactions",
      icon: (
        <svg
          className="w-8 h-8 text-gray-700"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
          <path
            fillRule="evenodd"
            d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      label: "거래 내역",
      path: "/transactions", // 이 경로를 확인
    },
    {
      id: "favorites",
      icon: <img src={heart} alt="heart" className="w-8 h-8" />,
      label: "찜한 목록",
      path: "/favorites",
    },
    {
      id: "posts",
      icon: (
        <svg
          className="w-8 h-8 text-gray-700"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
      ),
      label: "내가 작성한 글",
      path: "/my-posts",
    },
    {
      id: "chattings",
      icon: <img src={chat} alt="chat" className="w-8 h-8" />,
      label: "채팅 목록",
      path: "/chatting/list",
    },
  ];

  // 로그아웃 처리
  const handleLogout = () => {
    Logout();
    // 로그인 페이지로 이동
    navigate("/login");
  };

  const handleEditInfo = () => {
    navigate("/edit/nickname");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <header className="sticky top-0 left-0 w-full h-[96px] flex items-center shadow-md bg-white px-4 pt-2 z-10">
        <div>
          <img src={yeslogo} alt="logo" className="w-[96px] h-[96px] block" />
        </div>
        <div className="w-[100%] h-10 self-center px-4 flex justify-end items-center">
          <img src={close} alt="close" className="w-7 h-7" onClick={onClose} />
        </div>
      </header>
      <main className="overflow-y-auto mx-5 mt-4 font-semibold flex  flex-col gap-4 mb-4 flex-1">
        {/* 카테고리 */}
        <div className="flex flex-col gap-4">
          <div className="w-fill h-[44px] bg-fourth/70 justify-center content-center rounded-md">
            <p className="ml-4">카테고리</p>
          </div>
          <div className="mx-2 flex flex-col gap-3">
            {categoryActions.map((action) => (
              <div
                key={action.id}
                onClick={() => {
                  navigate(action.path, { state: action.id });
                  onClose();
                }}
              >
                <div className="flex gap-3 items-center border-b pb-2">
                  {action.icon}
                  <p className="">{action.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 내정보 */}
        <div className="flex flex-col gap-4">
          <div className="w-fill h-[44px] bg-fourth/70 justify-center content-center rounded-md">
            <p className="ml-4">내 정보</p>
          </div>
          <div className="mx-2 flex flex-col gap-3 ">
            {actions.map((action) => (
              <Link
                key={action.id}
                to={action.path}
                className="flex items-center pb-2 border-b border-gray-200 last:border-b-0"
              >
                <div className="mr-4">{action.icon}</div>
                <p className="">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <footer className="sticky bottom-0 w-full shadow-[0_-3px_5px_rgba(0,0,0,0.15)] z-50 p-2 py-6 bg-white">
        <div className="flex divide-x-2 divide-first/30">
          {/* 회원정보변경 */}
          <div
            className="flex flex-1 gap-2 items-center justify-center"
            onClick={handleEditInfo}
          >
            <img src={settings} alt="settings" className="w-7 h-7" />
            <p>회원정보변경</p>
          </div>
          {/* 로그아웃 */}
          <div
            className="flex flex-1 gap-2 items-center justify-center"
            onClick={handleLogout}
          >
            <img src={logout} alt="logout" className="w-7 h-7" />
            <p>로그아웃</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
