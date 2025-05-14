// src/pages/chattingPage/chatPage.tsx - 디버깅 코드 추가된 버전
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import nologo from "../../assets/icons/nologo.svg";
import useChat from "../../hooks/useChat";
import {
  ChatUser,
  Message,
  ChatRouteState,
  ChatMessageParams,
  ChatMessageDTO,
  WebSocketMessage,
  MessageType,
  SendWebSocketMessage,
  ReceiveWebSocketMessage,
} from "../../types/chat";
import { getChatMessages, getUserChatInfo, readChatRoom } from "../../api/chat";
import { useChatContext } from "../../contexts/ChatContext";
import { format, isToday, isYesterday } from "date-fns";
import { useChatService } from "../../poviders/ChatServiceProvider";

const ChatPage: React.FC = () => {
  const { chatid } = useParams<{ chatid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<ChatUser | null>(() => {
    // 1. location.state에서 chattingUserNickname 확인 (최우선)
    const stateNickname = location.state?.chattingUserNickname;

    // 2. localStorage에서 nickname 확인 (두번째 우선순위)
    const storedNickname = localStorage.getItem("currentChatUserNickname");

    console.log("🔍 ChatPage 닉네임 데이터 확인:", {
      stateNickname,
      storedNickname,
      locationState: location.state,
      allLocalStorage: Object.keys(localStorage).map((key) => ({
        key,
        value: localStorage.getItem(key),
      })),
    });

    // 닉네임 결정 (우선순위: state > localStorage > 기본값)
    const finalNickname = stateNickname || storedNickname || "채팅 상대";
    console.log("✅ 최종 사용할 닉네임:", finalNickname);

    return {
      id: 0, // ID는 API 응답에서 업데이트 예정
      name: finalNickname,
    };
  });
  const hasCheckedReadStatus = useRef(false);
  const processedRoomIds = useRef(new Set<string>());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const readStatusCache: { [key: string]: boolean } = {};
  // 페이지네이션 관련 상태
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [oldScrollHeight, setOldScrollHeight] = useState<number>(0);

  // 사용자 ID 상태 추가
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
    // 로컬 스토리지에서 userId 초기값 설정
    const storedUserId = localStorage.getItem("userId");
    return storedUserId ? parseInt(storedUserId, 10) : null;
  });

  // API 디버깅을 위한 상태 추가
  const [apiStatus, setApiStatus] = useState<string>("아직 API 호출 전");
  const [manualFetchResult, setManualFetchResult] = useState<string>("");

  // ChatContext 사용 (읽음 표시를 위해)
  const { markRoomAsRead } = useChatContext();
  const chatService = useChatService(); // chatService 추가
  const getReadStatusKey = (roomId: string) =>
    `persistent_read_status_${roomId}`;

  const [roomId, setRoomId] = useState<string>(() => {
    // 1. URL 파라미터에서 roomId 확인 (최우선) - chatid는 항상 있어야 함
    const urlRoomId = chatid;

    // 2. location state에서 roomId 확인
    const stateRoomId = location.state?.roomId;

    // 3. localStorage에서 roomId 확인
    const storedRoomId = localStorage.getItem("currentRoomId");

    console.log("🔍 ChatPage 마운트 시 roomId 설정:", {
      urlRoomId,
      stateRoomId,
      storedRoomId,
    });

    // 우선순위 순서: URL > state > localStorage
    let finalRoomId = "";

    if (urlRoomId) {
      console.log("✅ URL 파라미터에서 roomId 사용:", urlRoomId);
      finalRoomId = urlRoomId;
    } else if (stateRoomId) {
      console.log("✅ location.state에서 roomId 사용:", stateRoomId);
      finalRoomId = stateRoomId;
    } else if (storedRoomId) {
      console.log("✅ localStorage에서 roomId 사용:", storedRoomId);
      finalRoomId = storedRoomId;
    } else {
      console.error(
        "❌ roomId를 찾을 수 없음! 채팅 목록으로 리다이렉트합니다."
      );
      // 비동기로 리다이렉트 처리
      setTimeout(() => {
        navigate("/chatting");
      }, 100);
    }

    // 최종 선택된 roomId를 localStorage에 저장
    if (finalRoomId) {
      localStorage.setItem("currentRoomId", finalRoomId);
    }

    return finalRoomId;
  });

  // 사용자 ID 가져오기 - 향상된 디버깅
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await getUserChatInfo();
        // 성공 시 로컬 스토리지에 저장 (아래 2번 참조)
      } catch (error) {
        console.error("사용자 ID 요청 실패:", error);
      }
    };
    fetchUserId(); // 조건문 제거 → 무조건 실행
  }, []);

  // 날짜 포맷팅 함수
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);

    if (isToday(date)) {
      // 오늘이면 시간만 표시
      return format(date, "p");
    } else if (isYesterday(date)) {
      // 어제면 '어제' 표시
      return format(date, "어제 p");
    } else {
      // 그 외의 경우 날짜와 시간 표시
      return format(date, "yy.MM.dd p");
    }
  };

  // 사용자 ID 수동 테스트 함수
  const manualFetchUserId = async () => {
    try {
      setApiStatus("수동 API 호출 시작...");
      const response = await getUserChatInfo();
      console.log("수동 API 호출 결과:", response);
      setApiStatus(`수동 API 호출 결과: ${JSON.stringify(response)}`);
    } catch (error) {
      console.error("수동 API 호출 오류:", error);
      setApiStatus(`수동 API 호출 오류: ${error}`);
    }
  };

  // 웹소켓 메시지 처리 함수 - currentUserId와 비교하여 내 메시지인지 판단
  const processWebSocketMessage = (
    message: WebSocketMessage
  ): Message | null => {
    if (message.type === MessageType.MESSAGE) {
      const messageData = message as SendWebSocketMessage;

      const isMyMessage = messageData.sender === currentUserId;

      // user?.name을 우선적으로 사용하고, 없거나 '상대방'인 경우 location.state에서 가져옴
      const recipientName =
        user?.name && user.name !== "상대방" && user.name !== "채팅 상대"
          ? user.name
          : location.state?.chattingUserNickname ||
            localStorage.getItem("currentChatUserNickname") ||
            "채팅 상대";

      return {
        id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        text: messageData.message,
        timestamp: messageData.createdAt,
        isMe: isMyMessage,
        userName: isMyMessage ? "나" : recipientName,
        read: isMyMessage,
        receivedAt: messageData.createdAt,
      };
    }

    return null;
  };

  // useChat 훅 사용 - currentUserId가 변경될 때 다시 초기화하고 processWebSocketMessage 함수 전달
  const {
    messages,
    newMessage,
    isConnected,
    sendMessage,
    handleInputChange,
    handleKeyPress,
    setInitialMessages,
    addOlderMessages,
  } = useChat({
    roomId: roomId || "", // null인 경우 빈 문자열 전달
    userId: currentUserId ?? 0, // null일 경우 0 사용
    recipientName: user?.name || "",
    processMessage: processWebSocketMessage,
  });
  const saveMessageReadStatus = (messageId: string, read: boolean) => {
    if (!roomId) {
      console.error("roomId가 없어 읽음 상태를 저장할 수 없습니다.");
      return;
    }

    const roomKey = `chat_read_status_${roomId}`;
    let readStatuses: { [key: string]: boolean } = {};

    // 기존 저장된 상태 확인
    const savedStatuses = localStorage.getItem(roomKey);
    if (savedStatuses) {
      try {
        readStatuses = JSON.parse(savedStatuses);
      } catch (e) {
        console.error("읽음 상태 파싱 오류:", e);
        readStatuses = {};
      }
    }

    // 상태 업데이트
    readStatuses[messageId] = read;

    // 메모리 캐시에도 저장
    readStatusCache[messageId] = read;

    // 로컬 스토리지에 저장
    localStorage.setItem(roomKey, JSON.stringify(readStatuses));
    console.log(
      `메시지 ID ${messageId}의 읽음 상태 ${read}로 저장됨 (채팅방: ${roomId})`
    );
  };

  const getMessageReadStatus = (messageId: string): boolean | null => {
    if (!roomId) {
      console.error("roomId가 없어 읽음 상태를 확인할 수 없습니다.");
      return null;
    }

    const roomKey = getReadStatusKey(roomId);

    // 1. 로컬 스토리지 확인
    const localStatuses = localStorage.getItem(roomKey);
    if (localStatuses) {
      try {
        const readStatuses = JSON.parse(localStatuses);
        if (messageId in readStatuses) {
          console.log(
            `메시지 ID ${messageId}의 로컬 읽음 상태: ${readStatuses[messageId]}`
          );
          return readStatuses[messageId];
        }
      } catch (e) {
        console.error("로컬 스토리지 읽음 상태 파싱 오류:", e);
      }
    }

    // 2. 세션 스토리지 확인 (브라우저 충돌 등으로 로컬 스토리지가 손상된 경우 대비)
    const sessionStatuses = sessionStorage.getItem(roomKey);
    if (sessionStatuses) {
      try {
        const readStatuses = JSON.parse(sessionStatuses);
        if (messageId in readStatuses) {
          console.log(
            `메시지 ID ${messageId}의 세션 읽음 상태: ${readStatuses[messageId]} (복구됨)`
          );
          // 로컬 스토리지에 복구
          localStorage.setItem(roomKey, sessionStatuses);
          return readStatuses[messageId];
        }
      } catch (e) {
        console.error("세션 스토리지 읽음 상태 파싱 오류:", e);
      }
    }

    return null; // 저장된 상태가 없음
  };

  useEffect(() => {
    // 채팅방 초기화 시 로컬 스토리지 상태 검증
    const validateLocalStorage = () => {
      if (!roomId) return;

      const roomKey = getReadStatusKey(roomId);
      const savedStatuses = localStorage.getItem(roomKey);

      console.log(`채팅방 ${roomId} 초기화 - 로컬 저장 읽음 상태 확인`);

      if (savedStatuses) {
        try {
          const readStatuses = JSON.parse(savedStatuses);
          const statusCount = Object.keys(readStatuses).length;
          console.log(`저장된 읽음 상태 수: ${statusCount}개`);
        } catch (e) {
          console.error("읽음 상태 파싱 오류, 초기화합니다:", e);
          localStorage.setItem(roomKey, JSON.stringify({}));
        }
      } else {
        console.log("저장된 읽음 상태 없음, 새로 초기화합니다.");
        localStorage.setItem(roomKey, JSON.stringify({}));
      }
    };

    validateLocalStorage();
  }, [roomId]);

  // 메시지 ID 생성 함수 - ChatPage.tsx에 추가
  const generateMessageId = (dto: ChatMessageDTO): string => {
    // 타임스탬프 추출
    const timestamp = new Date(dto.createdAt).getTime();

    // 메시지 내용 기반 간단한 해시 생성
    const text = dto.message || "";

    // 모든 메시지가 동일한 규칙으로 ID 가짐
    return `msg_${timestamp}_${text.substring(0, Math.min(10, text.length))}_${
      dto.senderId || "unknown"
    }`;
  };

  // DTO를 클라이언트 메시지 형식으로 변환하는 함수
  const convertToClientMessage = (dto: ChatMessageDTO): Message => {
    // 메시지 발신자가 현재 사용자인지 확인
    const isMe =
      dto.senderId !== undefined
        ? dto.senderId === currentUserId
        : dto.toSend === true;

    // 상대방 닉네임 설정
    const recipientName =
      user?.name && user.name !== "상대방" && user.name !== "채팅 상대"
        ? user.name
        : location.state?.chattingUserNickname ||
          localStorage.getItem("currentChatUserNickname") ||
          "채팅 상대";

    // 일관된 메시지 ID 생성
    const messageId = generateMessageId(dto);

    // 읽음 상태 처리 수정
    let isRead = !isMe; // 상대방 메시지는 항상 true (내가 보고 있으므로)

    // 내가 보낸 메시지인 경우만 읽음 상태 확인
    if (isMe) {
      console.log(`내가 보낸 메시지 ID ${messageId} 읽음 상태 확인 중...`);

      // 1. 메모리 캐시 확인 (가장 빠른 접근)
      if (messageId in readStatusCache) {
        isRead = readStatusCache[messageId];
        console.log(
          `메시지 ID ${messageId}의 메모리 캐시 읽음 상태: ${
            isRead ? "읽음" : "읽지 않음"
          }`
        );
      } else {
        // 2. 로컬 스토리지 확인
        const roomKey = `chat_read_status_${roomId}`;
        const savedStatuses = localStorage.getItem(roomKey);

        if (savedStatuses) {
          try {
            const readStatuses = JSON.parse(savedStatuses);
            if (messageId in readStatuses) {
              isRead = readStatuses[messageId];
              // 메모리 캐시에 저장
              readStatusCache[messageId] = isRead;
              console.log(
                `메시지 ID ${messageId}의 로컬 저장 읽음 상태: ${
                  isRead ? "읽음" : "읽지 않음"
                } (캐시에 저장)`
              );
            } else {
              // 서버 데이터 확인
              if ("readAt" in dto && dto.readAt) {
                isRead = true;
              } else if ("isRead" in dto && dto.isRead === true) {
                isRead = true;
              } else if ("read" in dto && (dto as any).read === true) {
                isRead = true;
              }

              // 결정된 상태를 로컬 스토리지와 메모리 캐시에 저장
              readStatuses[messageId] = isRead;
              localStorage.setItem(roomKey, JSON.stringify(readStatuses));
              readStatusCache[messageId] = isRead;
              console.log(
                `메시지 ID ${messageId}의 서버 읽음 상태: ${
                  isRead ? "읽음" : "읽지 않음"
                } (로컬+캐시에 저장)`
              );
            }
          } catch (e) {
            console.error("읽음 상태 파싱 오류:", e);
            // 오류 발생 시 새 객체 생성하여 현재 상태 저장
            const newReadStatuses: { [key: string]: boolean } = {};
            newReadStatuses[messageId] = isRead;
            localStorage.setItem(roomKey, JSON.stringify(newReadStatuses));
            readStatusCache[messageId] = isRead;
          }
        } else {
          // 로컬 스토리지에 저장된 상태가 없으면 새로 생성
          const newReadStatuses: { [key: string]: boolean } = {};
          newReadStatuses[messageId] = isRead;
          localStorage.setItem(roomKey, JSON.stringify(newReadStatuses));
          readStatusCache[messageId] = isRead;
          console.log(
            `메시지 ID ${messageId}의 초기 읽음 상태: ${
              isRead ? "읽음" : "읽지 않음"
            } (새로 저장)`
          );
        }
      }
    }

    return {
      id: messageId,
      text: dto.message || "",
      timestamp: dto.createdAt,
      isMe: isMe,
      userName: isMe ? "나" : recipientName,
      read: isRead,
      receivedAt: dto.createdAt,
    };
  };

  // 이전 메시지 불러오기 함수
  const loadMessages = async (isInitialLoad = false) => {
    if (isLoading || (!hasMore && !isInitialLoad)) return;

    setIsLoading(true);

    try {
      // 페이지네이션 파라미터 설정
      const params: ChatMessageParams = {
        page: isInitialLoad ? 0 : currentPage + 1, // 초기 로드는 0페이지, 이후는 다음 페이지
        size: 20, // 한 번에 가져올 메시지 수
        sort: "createdAt,desc", // 최신 메시지부터 정렬
      };

      // API 호출
      const response = await getChatMessages(roomId, params);

      // API 응답 확인 및 안전한 접근
      if (
        response &&
        response.status_code === 200 &&
        response.body &&
        response.body.content &&
        Array.isArray(response.body.content)
      ) {
        // 닉네임 추출 - location.state에서 chattingUserNickname을 우선적으로 사용
        const chattingUserNickname =
          location.state?.chattingUserNickname ||
          (chatid === "1"
            ? "AI의 신예훈"
            : chatid === "2"
            ? "재드래곤"
            : "맥북헤이터");

        // 채팅 상대방 정보 설정
        if (isInitialLoad && response.body.otherParticipant) {
          // API 응답에서 받은 상대방 정보로 user 업데이트
          const apiNickname = response.body.otherParticipant.nickname;
          console.log("📱 API에서 받은 상대방 닉네임:", apiNickname);

          // API 응답의 닉네임을 우선 사용하고, localStorage 값을 다시 업데이트
          setUser({
            id: response.body.otherParticipant.userId,
            name:
              apiNickname || location.state?.chattingUserNickname || "상대방",
          });

          // API에서 받은 닉네임으로 localStorage 업데이트
          if (apiNickname) {
            console.log("🔄 localStorage의 닉네임 업데이트:", apiNickname);
            localStorage.setItem("currentChatUserNickname", apiNickname);
          }
        }

        // DTO를 클라이언트 메시지 형식으로 변환
        const formattedMessages: Message[] = response.body.content.map(
          (dto: ChatMessageDTO) => convertToClientMessage(dto)
        );

        // 더 불러올 메시지가 있는지 확인 (last 필드로 판단)
        setHasMore(!response.body.last && formattedMessages.length > 0);

        // 다음 페이지 번호 업데이트
        if (!isInitialLoad) {
          setCurrentPage(response.body.number);
        }

        // 메시지가 있는 경우만 처리
        if (formattedMessages.length > 0) {
          // 시간 역순으로 정렬된 메시지를 시간순으로 재정렬 (필요한 경우)
          const timeOrderedMessages = [...formattedMessages].reverse();

          if (isInitialLoad) {
            // 초기 로드인 경우 메시지 설정
            setInitialMessages(timeOrderedMessages);
          } else {
            // 이전 메시지 로드인 경우 스크롤 위치 저장
            if (messagesContainerRef.current) {
              setOldScrollHeight(messagesContainerRef.current.scrollHeight);
            }

            // 이전 메시지 추가
            addOlderMessages(timeOrderedMessages);
          }
        } else {
          // 메시지가 없으면 더 불러올 메시지가 없음
          setHasMore(false);
        }

        // 초기 로드인 경우 사용자 정보 설정
        if (isInitialLoad && user === null && !response.body.otherParticipant) {
          setUser({
            id: 0,
            name: chattingUserNickname,
          });
        }
      } else {
        console.log("API 응답 형식이 예상과 다릅니다:", response);
        // API 응답이 정상이 아닌 경우
        setHasMore(false);

        if (isInitialLoad) {
          // 빈 메시지 배열 설정
          setInitialMessages([]);

          // 닉네임 설정
          const chattingUserNickname =
            location.state?.chattingUserNickname ||
            (chatid === "1"
              ? "AI의 신예훈"
              : chatid === "2"
              ? "재드래곤"
              : "맥북헤이터");

          // 기본 사용자 정보 설정
          setUser({
            id: 0,
            name: chattingUserNickname,
          });
        }
      }
    } catch (error) {
      console.error("채팅 메시지 로드 오류:", error);
      setHasMore(false);

      if (isInitialLoad) {
        // 빈 메시지 배열 설정
        setInitialMessages([]);

        // 닉네임 설정
        const chattingUserNickname =
          location.state?.chattingUserNickname ||
          (chatid === "1"
            ? "AI의 신예훈"
            : chatid === "2"
            ? "재드래곤"
            : "맥북헤이터");

        // 오류 발생 시 기본 사용자 정보 설정
        setUser({
          id: 0,
          name: chattingUserNickname,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 채팅방 초기 데이터 로드 - userId가 로드된 후에 실행
  useEffect(() => {
    if (currentUserId) {
      loadMessages(true);
    }
  }, [chatid, location.state, currentUserId]); // currentUserId 의존성 추가

  // 스크롤 위치 관련 처리 (이전 메시지 로드 후)
  useEffect(() => {
    if (oldScrollHeight > 0 && messagesContainerRef.current) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - oldScrollHeight;
      messagesContainerRef.current.scrollTop = scrollDiff;

      // 스크롤 위치 조정 후 상태 초기화
      setOldScrollHeight(0);
    }
  }, [messages, oldScrollHeight]);

  useEffect(() => {
    if (isConnected && roomId && currentUserId) {
      // 토큰 확인
      const token = localStorage.getItem("accessToken");

      if (!token) {
        console.warn("⚠️ 토큰이 없어 읽음 메시지를 보낼 수 없습니다.");
        return;
      }

      // 채팅방에 접속했음을 알리는 RECEIVE 메시지 전송
      // 이것은 상대방에게 "나는 상대방이 보낸 메시지를 읽었다"는 신호임
      const timer = setTimeout(() => {
        const currentTime = new Date().toISOString();
        const receiveMessage: ReceiveWebSocketMessage = {
          type: MessageType.RECEIVE,
          roomId: roomId,
          receiver: currentUserId,
          receiveAt: currentTime,
          createdAt: currentTime,
        };

        console.log("📤 채팅방 입장 시 읽음 메시지 전송:", receiveMessage);
        chatService.sendMessage(receiveMessage);

        // 채팅방 읽음 상태 업데이트 (UI에서 읽지 않은 메시지 카운트 등을 위함)
        markRoomAsRead(roomId);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, roomId, currentUserId, chatService, markRoomAsRead]);

  useEffect(() => {
    const markChatAsRead = async () => {
      if (!roomId) {
        console.error("❌ roomId가 없어 읽음 상태를 업데이트할 수 없습니다.");
        return;
      }

      try {
        console.log(`🔍 채팅방 읽음 API 호출 시작: ${roomId}`);
        const response = await readChatRoom(roomId);

        console.log("✅ 채팅방 읽음 API 응답:", {
          status: response.status_code,
          readTime: response.body,
        });

        // 응답이 성공이면 채팅방 컨텍스트에도 읽음 상태 업데이트
        if (response.status_code === 200) {
          markRoomAsRead(roomId);
        }
      } catch (error) {
        console.error("❌ 채팅방 읽음 API 호출 오류:", error);
      }
    };

    // 컴포넌트 마운트 시 API 호출
    markChatAsRead();

    // roomId가 변경될 때마다 API 호출
  }, [roomId, markRoomAsRead]);

  // 메시지 목록이 업데이트될 때 스크롤을 맨 아래로 이동 (초기 로드 또는 새 메시지 수신 시)
  useEffect(() => {
    // 이전 메시지 로드 중이 아닐 때만 스크롤 아래로 이동
    if (!oldScrollHeight) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 뒤로가기 처리
  const handleGoBack = () => {
    window.history.back();
  };

  // 메시지 전송 버튼 핸들러
  const handleSendButtonClick = () => {
    if (newMessage.trim() === "" || !isConnected) return;

    console.log("메시지 전송:", newMessage);
    sendMessage();

    // 메시지 전송 후 읽음 상태 메시지 전송 (상대방이 보낸 메시지를 읽었다는 신호)
    if (roomId && currentUserId) {
      setTimeout(() => {
        const currentTime = new Date().toISOString();
        const receiveMessage: ReceiveWebSocketMessage = {
          type: MessageType.RECEIVE,
          roomId: roomId,
          receiver: currentUserId,
          receiveAt: currentTime,
          createdAt: currentTime,
        };

        console.log("📤 메시지 전송 후 읽음 메시지 전송:", receiveMessage);
        chatService.sendMessage(receiveMessage);
      }, 500);
    }

    // 스크롤을 아래로 내림
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    const updateMessageReadStatus = async () => {
      // 이미 처리한 roomId인지 확인
      if (!roomId || processedRoomIds.current.has(roomId)) {
        return;
      }

      // 로직 실행 전 현재 roomId를 처리 목록에 추가
      processedRoomIds.current.add(roomId);

      if (!currentUserId) {
        console.error(
          "❌ currentUserId가 없어 읽음 상태를 업데이트할 수 없습니다."
        );
        return;
      }

      try {
        console.log(
          `🔍 채팅방 읽음 API 호출 시작 (단 한 번만 실행): ${roomId}`
        );
        const response = await readChatRoom(roomId);

        // API 응답에서 읽음 시간 추출
        const readTime = response.body;
        console.log("✅ 상대방 마지막 접속 시간:", readTime);

        if (response.status_code === 200 && readTime) {
          // 메시지 로드 확인을 위한 대기
          // 메시지가 로드되지 않았을 수 있으므로 일정 시간 대기
          setTimeout(() => {
            updateMessagesWithReadTime(readTime);
          }, 500);
        }
      } catch (error) {
        console.error("❌ 채팅방 읽음 상태 업데이트 오류:", error);
      }
    };

    // 메시지 읽음 상태 업데이트 함수 분리
    const updateMessagesWithReadTime = (readTime: string) => {
      // 읽음 시간 이전의 내 메시지는 모두 읽음 상태로 변경
      const readTimeStamp = new Date(readTime).getTime();

      // 현재 메시지 가져오기 (이 시점에서는 메시지가 로드되어 있어야 함)
      const currentMessages = messages;
      if (currentMessages.length === 0) {
        console.warn("⚠️ 메시지가 아직 로드되지 않았습니다.");
        return;
      }

      // 메시지 배열 업데이트
      const updatedMessages = currentMessages.map((msg) => {
        // 내가 보낸 메시지이고, 생성 시간이 읽음 시간보다 이전인 경우에만 읽음 처리
        if (msg.isMe && new Date(msg.timestamp).getTime() <= readTimeStamp) {
          return { ...msg, read: true };
        }
        return msg;
      });

      // 업데이트된 메시지로 상태 변경
      setInitialMessages(updatedMessages);

      // 로컬 스토리지의 읽음 상태도 업데이트
      const roomKey = `chat_read_status_${roomId}`;
      let readStatuses: { [key: string]: boolean } = {};

      // 기존 저장된 상태 확인
      const savedStatuses = localStorage.getItem(roomKey);
      if (savedStatuses) {
        try {
          readStatuses = JSON.parse(savedStatuses);
        } catch (e) {
          console.error("읽음 상태 파싱 오류:", e);
          readStatuses = {};
        }
      }

      // 메시지 읽음 상태 업데이트
      updatedMessages.forEach((msg) => {
        if (msg.isMe && msg.read !== undefined) {
          readStatuses[msg.id] = msg.read;
        }
      });

      // 업데이트된 읽음 상태 저장
      localStorage.setItem(roomKey, JSON.stringify(readStatuses));
      console.log("✅ 로컬 스토리지 읽음 상태 업데이트 완료");

      // 채팅방 컨텍스트 읽음 상태도 업데이트
      markRoomAsRead(roomId);
    };

    // 연결되어 있을 때만 실행
    if (isConnected) {
      updateMessageReadStatus();
    }

    // roomId가 변경될 때만 실행
  }, [roomId, currentUserId, isConnected, markRoomAsRead, setInitialMessages]);

  // 이전 메시지 더 불러오기 버튼 핸들러
  const handleLoadMoreMessages = () => {
    if (!isLoading && hasMore) {
      loadMessages(false);
    }
  };
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 배경 이미지 */}
      <img
        src={nologo}
        alt="logo"
        className="absolute w-[216px] h-[216px] top-1/3 left-1/4 opacity-40 pointer-events-none z-0"
      />

      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center h-16 px-4">
          <button onClick={handleGoBack} className="p-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="ml-4 text-lg font-semibold">
            {user?.name || "채팅"}
          </div>
        </div>
      </header>

      {/* 메시지 목록 */}
      <div
        className="flex-1 overflow-y-auto p-4 z-10"
        ref={messagesContainerRef}
        onScroll={(e) => {
          const { scrollTop } = e.currentTarget;
          if (scrollTop < 50 && hasMore && !isLoading) {
            handleLoadMoreMessages();
          }
        }}
      >
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.id}-${index}`}
              className={`flex flex-col ${
                message.isMe ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[70%] ${
                  message.isMe ? "order-1" : "order-2"
                }`}
              >
                {/* 상대방 메시지인 경우 닉네임 표시 */}
                {!message.isMe && (
                  <div className="ml-1 text-xs text-gray-600 mb-1">
                    {user?.name || message.userName}
                  </div>
                )}

                {/* 메시지 말풍선 */}
                <div className="flex">
                  {/* 내가 보낸 메시지이고 읽지 않은 경우만 1 표시 - 읽음 상태 디버깅용 data-read 속성 추가 */}
                  {message.isMe && !message.read && (
                    <span
                      className="mr-1 text-l mt-2 text-black font-bold"
                      data-testid={`unread-marker-${message.id}`}
                      data-read={message.read ? "false" : "true"}
                    >
                      1
                    </span>
                  )}
                  <div
                    className={`rounded-xl px-4 py-2 max-w-[100%] ml-auto whitespace-pre-wrap ${
                      message.isMe
                        ? "bg-blue-500 text-white rounded-tr-none"
                        : "bg-gray-200 text-gray-800 rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                </div>
                {/* 메시지 시간 표시 */}
                <div
                  className={`flex items-center mt-1 ${
                    message.isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 메시지 입력 영역 */}
      <div className="bg-white border-t p-2 z-10">
        <div className="flex items-center">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
            <input
              type="text"
              placeholder="메시지를 입력하세요..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full bg-transparent outline-none"
            />
          </div>
          <button
            onClick={handleSendButtonClick}
            disabled={newMessage.trim() === "" || !isConnected}
            className="ml-2 p-2 text-gray-500 disabled:text-gray-300"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
