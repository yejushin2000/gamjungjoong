// src/pages/chattingPage/chatListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate 추가
import Header from "../../components/common/Header";
import NavigationBar from "../../components/common/NavigationBar";
import chatting from "../../assets/icons/message-chat.svg";
import ChatItem from "../../components/chat/chatItem";
import axios, { isAxiosError } from "axios"; // axios와 isAxiosError import
import { axiosInstance } from "../../api/axios"; // axiosInstance import 경로 확인
import { deleteChatRoom } from "../../api/chat";
import {
  GoodsItemDetailProps,
  GoodsDetailProps,
} from "../../components/goods/GoodsItem";
import { useChatContext } from "../../contexts/ChatContext"; // ChatContext import 확인

// localStorage에 저장할 키
const CHAT_REFRESH_KEY = "chatListRefresh";
const CHAT_CONTEXT_KEY = "chatContextInfo";
const BASE_URL = process.env.REACT_APP_API_URL;

// 채팅방 정보 인터페이스
interface ChatRoomItem {
  roomId: string;
  chattingUserNickname: string;
  nonReadCount: number;
  lastMessage: string;
  postTitle: string;
  createdAt?: string;
  lastUpdatedAt?: string;
}

// 로컬에 저장된 컨텍스트 정보
interface ChatContextInfo {
  sellerName: string;
  itemTitle: string;
  createdAt: string;
}

// 통합된 채팅방 정보
interface EnhancedChatRoomItem extends ChatRoomItem {
  sellerNameFromContext?: string;
  itemTitleFromContext?: string;
  isSelected?: boolean;
}

// 페이징 정보 인터페이스
interface PageInfo {
  pageNumber: number;
  pageSize: number;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

// 정렬 정보 인터페이스
interface SortInfo {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

// 응답 본문 인터페이스
interface ResponseBody {
  content: ChatRoomItem[];
  pageable: PageInfo;
  size: number;
  number: number;
  sort: SortInfo;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// API 응답 인터페이스
interface ApiResponse {
  body: ResponseBody;
  status_code: number;
}

const ChatListPage: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<EnhancedChatRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [pageNumber, setPageNumber] = useState(0);
  // 새로고침 상태를 로컬스토리지 값으로 초기화
  const [refreshTrigger, setRefreshTrigger] = useState<string | null>(
    localStorage.getItem(CHAT_REFRESH_KEY)
  );
  // 선택된 채팅방 상태 추가
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const navigate = useNavigate(); // navigate 함수 가져오기

  const { unreadMessageCount, markRoomAsRead } = useChatContext();

  // 로컬 저장 컨텍스트 정보 가져오기
  const getChatContext = (): Record<string, ChatContextInfo> => {
    const contextString = localStorage.getItem(CHAT_CONTEXT_KEY);
    return contextString ? JSON.parse(contextString) : {};
  };

  const updateTotalUnreadCount = useCallback(() => {
    // 채팅방 목록에서 모든 nonReadCount 합산
    const totalUnread = chatRooms.reduce(
      (total, room) => total + (room.nonReadCount || 0),
      0
    );

    console.log(
      "📊 채팅방 목록에서 계산된 전체 안읽은 메시지 수:",
      totalUnread
    );

    // unreadMessagesByRoom 객체 생성
    const unreadMessagesByRoom: Record<string, number> = {};

    // 각 채팅방의 안읽은 메시지 수를 객체에 저장
    chatRooms.forEach((room) => {
      if (room.nonReadCount > 0) {
        unreadMessagesByRoom[room.roomId] = room.nonReadCount;
      }
    });

    // 디버깅을 위한 로그
    console.log("📱 각 채팅방 별 안읽은 메시지 수:", unreadMessagesByRoom);

    // 로컬 스토리지에 저장 (앱 리로드 시 유지)
    localStorage.setItem("totalUnreadMessages", totalUnread.toString());
    localStorage.setItem(
      "unreadMessagesByRoom",
      JSON.stringify(unreadMessagesByRoom)
    );
  }, [chatRooms]);

  // 채팅방 목록 로드 함수
  const loadChatRooms = async (page: number = 0, retryCount: number = 0) => {
    try {
      setLoading(true);
      setError(null);

      // 현재 액세스 토큰 가져오기
      const accessToken = localStorage.getItem("accessToken");
      console.log(`채팅방 목록 조회 API 호출 (페이지: ${page})...`, {
        hasToken: !!accessToken,
      });

      // API 호출
      const response = await axios.get<ApiResponse>(
        `${BASE_URL}/chatting?page=${page}&size=10`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken || ""}`,
          },
        }
      );

      if (response.data && response.data.status_code === 200) {
        console.log("채팅방 목록 조회 성공:", response.data);

        const responseBody = response.data.body;

        if (responseBody && Array.isArray(responseBody.content)) {
          // 로컬 컨텍스트 정보 가져오기
          const chatContext = getChatContext();

          // API 응답 채팅방 목록에 컨텍스트 정보 추가
          const enhancedRooms = responseBody.content.map((room) => {
            const contextInfo = chatContext[room.roomId];
            return {
              ...room,
              // contextInfo의 sellerName을 우선적으로 사용, 없으면 API 응답의 chattingUserNickname 사용
              chattingUserNickname:
                contextInfo?.sellerName ||
                room.chattingUserNickname ||
                "알 수 없음",
              // contextInfo의 itemTitle을 우선적으로 사용, 없으면 API 응답의 postTitle 사용
              postTitle:
                contextInfo?.itemTitle || room.postTitle || "알 수 없는 상품",
              // 컨텍스트 정보 보존
              sellerNameFromContext: contextInfo?.sellerName,
              itemTitleFromContext: contextInfo?.itemTitle,
              // 초기 선택 상태 false로 설정
              isSelected: room.roomId === selectedRoomId,
            };
          });

          if (page === 0) {
            // 첫 페이지일 경우 목록 교체
            setChatRooms(enhancedRooms);
          } else {
            // 추가 페이지일 경우 목록에 추가
            setChatRooms((prev) => [...prev, ...enhancedRooms]);
          }

          // 페이징 정보 업데이트
          setIsLastPage(responseBody.last);
          setPageNumber(responseBody.number);
        }
      } else {
        console.error("채팅방 목록 조회 실패:", response.data);
        setError("채팅방 목록을 가져오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("채팅방 목록 로딩 오류:", error);
      setError("채팅방 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      localStorage.removeItem(CHAT_REFRESH_KEY);
    }
  };
  const handleChatClick = (chat: EnhancedChatRoomItem) => {
    // 필요한 정보 localStorage에 저장
    localStorage.setItem("currentRoomId", chat.roomId);
    localStorage.setItem("currentChatUserNickname", chat.chattingUserNickname);

    // 프로그래매틱 네비게이션
    navigate(`/chatting/${chat.roomId}`, {
      state: {
        roomId: chat.roomId,
        chattingUserNickname: chat.chattingUserNickname,
        postTitle: chat.postTitle,
      },
    });
  };

  // 채팅방 삭제 함수
  const handleDeleteChatRoom = async (
    roomId: string,
    event?: React.MouseEvent
  ) => {
    try {
      // 이벤트 전파 중지 (Link 클릭 방지) - event가 있는 경우에만
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      // 사용자 확인
      if (!window.confirm("정말로 이 채팅방을 삭제하시겠습니까?")) {
        return;
      }

      // 현재 액세스 토큰 가져오기
      const accessToken = localStorage.getItem("accessToken");
      console.log("🔍 채팅방 삭제 요청:", {
        roomId: roomId,
        type: typeof roomId,
        hasToken: !!accessToken,
      });

      // 로딩 상태 추가
      setLoading(true);

      // 채팅방 삭제 API 호출
      const response = await axiosInstance.delete(`/chatting/${roomId}`, {
        // 추가 디버깅을 위한 설정
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || ""}`,
        },
      });

      console.log("🎉 채팅방 삭제 응답:", response);

      if (response.status === 200) {
        // 성공적으로 삭제된 경우 로컬 상태에서 제거
        setChatRooms((prev) => prev.filter((room) => room.roomId !== roomId));

        // 선택 상태 초기화
        setSelectedRoomId(null);

        // localStorage에서 해당 채팅방 관련 정보 제거
        localStorage.removeItem(`token_${roomId}`);

        // 현재 활성화된 룸 ID가 삭제한 룸 ID와 같으면 제거
        if (localStorage.getItem("currentRoomId") === roomId) {
          localStorage.removeItem("currentRoomId");
          localStorage.removeItem("currentChatUserNickname");
          localStorage.removeItem("currentPostTitle");
        }

        // localStorage의 채팅 컨텍스트에서도 제거
        const chatContext = getChatContext();
        delete chatContext[roomId];
        localStorage.setItem(CHAT_CONTEXT_KEY, JSON.stringify(chatContext));

        // 성공 메시지 표시
        alert("채팅방이 삭제되었습니다.");
      } else {
        console.error("채팅방 삭제 실패:", response);
        alert("채팅방 삭제에 실패했습니다.");
      }
    } catch (error) {
      // Axios 오류의 경우 더 자세한 정보 로깅
      if (axios.isAxiosError(error)) {
        console.error("❌ 채팅방 삭제 오류:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });

        // 토큰 만료 오류인 경우
        if (error.response?.status === 401) {
          alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
          // 필요한 경우 로그인 페이지로 리다이렉트
          // window.location.href = '/login';
          return;
        }
      } else {
        console.error("❌ 일반 오류:", error);
      }

      alert("채팅방 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 채팅방 선택 핸들러
  const handleSelectChatRoom = (roomId: string) => {
    // 이미 선택된 채팅방이면 선택 해제, 아니면 선택
    setSelectedRoomId((prev) => (prev === roomId ? null : roomId));
  };

  // 컴포넌트 마운트 시 채팅방 목록 조회
  useEffect(() => {
    loadChatRooms();
  }, [refreshTrigger]); // refreshTrigger가 변경될 때마다 다시 로드

  // chatRooms 상태가 변경될 때마다 안읽은 메시지 수 업데이트
  useEffect(() => {
    updateTotalUnreadCount();
  }, [chatRooms, updateTotalUnreadCount]);

  // 추가 채팅방 로드 함수
  const loadMoreChatRooms = () => {
    if (!isLastPage && !loading) {
      loadChatRooms(pageNumber + 1);
    }
  };

  // 스크롤 이벤트 처리
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // 스크롤이 하단에 도달하면 추가 데이터 로드
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMoreChatRooms();
    }
  };

  // localStorage 변경 감지
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CHAT_REFRESH_KEY && e.newValue) {
        setRefreshTrigger(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 헤더 */}
      <Header title="LOGO" showBackButton={false} hideSearchButton={false} />

      {/* 채팅 목록 타이틀 */}
      <div className="px-4 py-3 border-b">
        <h1 className="text-xl font-bold">채팅</h1>
      </div>

      {/* 채팅 목록 */}
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {chatRooms.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {chatRooms.map((chat) => (
              <ChatItem
                key={chat.roomId}
                roomId={chat.roomId}
                chattingUserNickname={chat.chattingUserNickname}
                nonReadCount={chat.nonReadCount}
                lastMessage={chat.lastMessage}
                postTitle={chat.postTitle}
                createdAt={chat.createdAt}
                lastUpdatedAt={chat.lastUpdatedAt}
                isSelected={chat.roomId === selectedRoomId}
                onSelect={(roomId) => {
                  // 여기서 navigate 실행
                  console.log(
                    "💾 전달할 닉네임 확인:",
                    chat.chattingUserNickname
                  );

                  // 로컬 스토리지에 정확한 값 저장
                  try {
                    localStorage.setItem("currentRoomId", chat.roomId);
                    localStorage.setItem(
                      "currentChatUserNickname",
                      chat.chattingUserNickname
                    );
                    localStorage.setItem(
                      "currentPostTitle",
                      chat.postTitle || ""
                    );

                    // 현재 액세스 토큰 저장
                    const currentToken = localStorage.getItem("accessToken");
                    if (currentToken) {
                      localStorage.setItem(
                        `token_${chat.roomId}`,
                        currentToken
                      );
                    }

                    // 저장 후 확인 로그
                    const storedNickname = localStorage.getItem(
                      "currentChatUserNickname"
                    );
                    console.log("💾 저장된 정보 확인:", {
                      roomId: chat.roomId,
                      nickname: storedNickname,
                      postTitle: chat.postTitle,
                      저장성공여부:
                        storedNickname === chat.chattingUserNickname
                          ? "✅ 성공"
                          : "❌ 실패",
                    });
                  } catch (error) {
                    console.error("로컬스토리지 저장 중 오류:", error);
                  }

                  // 네비게이션 수행
                  navigate(`/chatting/${chat.roomId}`, {
                    state: {
                      roomId: chat.roomId,
                      chattingUserNickname: chat.chattingUserNickname,
                      postTitle: chat.postTitle,
                      accessToken: localStorage.getItem("accessToken"),
                    },
                  });

                  // 기존 선택 핸들러도 실행
                  handleSelectChatRoom(roomId);
                }}
                onDelete={(e) => handleDeleteChatRoom(chat.roomId, e)}
              />
            ))}
          </ul>
        ) : !loading && !error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>채팅 내역이 없습니다.</p>
          </div>
        ) : null}

        {/* 로딩 표시 - 페이지 하단에 표시 */}
        {loading && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        {/* 오류 메시지 */}
        {error && (
          <div className="flex justify-center items-center py-4 text-red-500">
            {error}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 바 */}
      <NavigationBar />
    </div>
  );
};

export default ChatListPage;
