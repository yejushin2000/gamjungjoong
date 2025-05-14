// src/components/common/NavigationBar.tsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import plusCircle from "../../assets/icons/PlusCircle.svg";
import heart from "../../assets/icons/Heart.svg";
import userProfile from "../../assets/icons/user-profile.svg";
import messageChat from "../../assets/icons/message-chat.svg";
import menu from "../../assets/icons/menu.svg";
import { useChatContext } from "../../contexts/ChatContext";
import MenuModal from "./MenuModal";

// API 응답 인터페이스 정의
interface ChatRoomItem {
  roomId: string;
  chattingUserNickname: string;
  nonReadCount: number;
  lastMessage: string;
  postTitle: string;
}

interface PageInfo {
  pageNumber: number;
  pageSize: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

interface ResponseBody {
  content: ChatRoomItem[];
  pageable: PageInfo;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

interface ApiResponse {
  body: ResponseBody;
  status_code: number;
}

// NavigationBarProps 인터페이스 정의
interface NavigationBarProps {
  activeMenu?: "home" | "favorite" | "add" | "my" | "chat";
}

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

const NavigationBar: React.FC<NavigationBarProps> = ({
  activeMenu = "home",
}) => {
  // ChatContext에서 읽지 않은 메시지 수 가져오기 (기존 로직 유지)
  const { unreadMessageCount: contextUnreadCount } = useChatContext();

  // 메뉴 모달 열림 여부
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 로컬 안읽은 메시지 수 상태
  const [localUnreadCount, setLocalUnreadCount] = useState(0);

  // interval ID를 저장하기 위한 ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 이전 nonReadCount 총합을 저장하기 위한 ref
  const previousTotalCountRef = useRef<number>(0);

  // API로부터 채팅방 목록 가져오기
  const loadChatRooms = async () => {
    try {
      // 현재 액세스 토큰 가져오기
      const accessToken = localStorage.getItem("accessToken");

      // API 호출
      const response = await axios.get<ApiResponse>(
        `${BASE_URL}/chatting?page=0&size=10`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken || ""}`,
          },
        }
      );

      if (response.data && response.data.status_code === 200) {
        const responseBody = response.data.body;

        if (responseBody && Array.isArray(responseBody.content)) {
          // 모든 채팅방의 nonReadCount 합산
          const totalUnreadCount = responseBody.content.reduce(
            (total, room) => {
              return total + (room.nonReadCount || 0);
            },
            0
          );

          // 이전 값과 비교하여 변경되었는지 확인
          if (totalUnreadCount !== previousTotalCountRef.current) {
            console.log(
              `[NavigationBar] 안읽은 메시지 수 변경 감지: ${previousTotalCountRef.current} → ${totalUnreadCount}`
            );

            // 새로운 메시지가 도착한 경우 (count가 증가한 경우)
            if (totalUnreadCount > previousTotalCountRef.current) {
              console.log("🔔 새로운 메시지가 도착했습니다!");
              // 여기에 알림음이나 다른 효과를 추가할 수 있습니다
            }

            // 값이 변경되었으므로 업데이트
            setLocalUnreadCount(totalUnreadCount);
            previousTotalCountRef.current = totalUnreadCount;

            // ChatContext에도 업데이트 (선택사항)
            // setUnreadMessageCount(totalUnreadCount);
          }
        }
      }
    } catch (error) {
      console.error("[NavigationBar] 채팅방 목록 로딩 오류:", error);
      // 에러 발생 시에도 UI는 유지하되, 콘솔에만 로그 출력
    }
  };

  // 컴포넌트 마운트 시 1초마다 API 호출 시작
  useEffect(() => {
    // 초기 로드
    loadChatRooms();

    // 1초마다 API 호출
    intervalRef.current = setInterval(() => {
      loadChatRooms();
    }, 1000);

    // cleanup 함수: 컴포넌트 언마운트 시 interval 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 표시할 안읽은 메시지 수 결정 (context 값과 local 값 중 큰 값 사용)
  const displayUnreadCount = Math.max(contextUnreadCount, localUnreadCount);

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log("[NavigationBar] 표시할 안읽은 메시지 수:", displayUnreadCount);
  }, [displayUnreadCount]);

  return (
    <>
      <footer className="sticky bottom-0 w-[100%] flex gap-2 shadow-[0_-3px_5px_rgba(0,0,0,0.15)] z-50 p-2 pb-3 bg-white">
        {/* 메뉴 */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="w-full justify-items-center pt-2"
        >
          <img src={menu} alt="menu" className="w-[40px]" />
          <p className="font-semibold text-first/70">메뉴</p>
        </button>
        {/* 찜 */}
        <Link
          to="/favorites"
          className="w-full gap-2 justify-items-center pt-2"
        >
          <img src={heart} alt="heart" className="w-[40px]" />
          <p className="font-semibold text-first/70">찜</p>
        </Link>
        {/* 등록 */}
        <Link
          to="/goods/register"
          className="w-full gap-2 justify-items-center pt-2"
        >
          <img src={plusCircle} alt="plusCircle" className="w-[40px]" />
          <p className="font-semibold text-first/70">등록</p>
        </Link>
        {/* MY */}
        <Link to="/mypage" className="w-full gap-2 justify-items-center pt-2">
          <img src={userProfile} alt="userProfile" className="w-[40px]" />
          <p className="font-semibold text-first/70">MY</p>
        </Link>
        {/* 채팅 */}
        <Link
          to="/chatting/list"
          className="w-full gap-2 justify-items-center pt-2 relative"
        >
          <div className="relative flex flex-col items-center">
            <img src={messageChat} alt="messageChat" className="w-[40px]" />

            {/* 읽지 않은 메시지가 있을 때만 배지 표시 */}
            {displayUnreadCount > 0 && (
              <span className="absolute top-0 right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {displayUnreadCount > 99 ? "99+" : displayUnreadCount}
              </span>
            )}

            <p className="font-semibold text-first/70">채팅</p>
          </div>
        </Link>
      </footer>
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white">
          <MenuModal onClose={() => setIsMenuOpen(false)} />
        </div>
      )}
    </>
  );
};

export default NavigationBar;
