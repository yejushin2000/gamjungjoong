// src/contexts/ChatContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { 
  WebSocketMessage, 
  SendWebSocketMessage, 
  MessageType,
  Message
} from '../types/chat';

interface ChatContextType {
  unreadMessageCount: number;
  lastAccessTime: Date | null;
  updateLastAccessTime: () => void;
  unreadMessagesByRoom: Record<string, number>;
  lastReceivedMessages: Record<string, SendWebSocketMessage>;
  updateLastReceivedMessage: (roomId: string, message: WebSocketMessage) => void;
  markRoomAsRead: (roomId: string) => void;
  processIncomingMessage: (message: SendWebSocketMessage) => Message;
}

const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [lastAccessTime, setLastAccessTime] = useState<Date | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [unreadMessagesByRoom, setUnreadMessagesByRoom] = useState<Record<string, number>>({});
  const [lastReceivedMessages, setLastReceivedMessages] = useState<Record<string, SendWebSocketMessage>>({});

  // 앱 로드 시 마지막 접속 시간 복원
  useEffect(() => {
    const storedLastAccessTime = localStorage.getItem('lastAccessTime');
    if (storedLastAccessTime) {
      setLastAccessTime(new Date(storedLastAccessTime));
    } else {
      updateLastAccessTime();
    }
  }, []);

  // 마지막 접속 시간 업데이트
  const updateLastAccessTime = useCallback(() => {
    const currentTime = new Date();
    setLastAccessTime(currentTime);
    localStorage.setItem('lastAccessTime', currentTime.toISOString());
  }, []);

  // 받은 메시지를 처리하여 Message 객체로 변환
  const processIncomingMessage = useCallback((message: SendWebSocketMessage): Message => {
    return {
      id: Date.now().toString(), // number를 string으로 변환
      text: message.message,
      isMe: false,
      userName: '', // 발신자 이름은 별도로 처리 필요
      timestamp: message.createdAt,
      read: false, // 기본적으로 읽지 않은 상태로 설정
      receivedAt: message.createdAt
    };
  }, []);

  // 새 메시지가 도착했을 때 마지막 메시지 업데이트 및 읽지 않은 메시지 카운트 증가
  const updateLastReceivedMessage = useCallback((roomId: string, message: WebSocketMessage) => {
    // 메시지 타입이 MESSAGE인 경우에만 처리
    if (message.type === MessageType.MESSAGE) {
      // SendWebSocketMessage로 타입 단언
      const messageData = message as SendWebSocketMessage;
      
      setLastReceivedMessages(prev => ({
        ...prev,
        [roomId]: messageData
      }));

      // 해당 방의 읽지 않은 메시지 수 증가
      setUnreadMessagesByRoom(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || 0) + 1
      }));

      // 전체 읽지 않은 메시지 수 증가
      setUnreadMessageCount(prev => prev + 1);
    }
  }, []);

  // 채팅방을 읽음 상태로 표시
  const markRoomAsRead = useCallback((roomId: string) => {
    if (unreadMessagesByRoom[roomId]) {
      // 해당 방의 읽지 않은 메시지 수를 0으로 설정
      setUnreadMessagesByRoom(prev => {
        const newUnreadMessages = {...prev};
        const unreadCount = newUnreadMessages[roomId] || 0;
        delete newUnreadMessages[roomId];
        
        // 전체 읽지 않은 메시지 수 감소
        setUnreadMessageCount(prev => Math.max(0, prev - unreadCount));
        
        return newUnreadMessages;
      });
    }
  }, [unreadMessagesByRoom]);
  
  useEffect(() => {
    // localStorage에서 초기 데이터 로드
    const loadInitialData = () => {
      try {
        // 총 안읽은 메시지 수 로드
        const storedTotalCount = localStorage.getItem('totalUnreadMessages');
        if (storedTotalCount) {
          const parsedCount = parseInt(storedTotalCount, 10);
          if (!isNaN(parsedCount)) {
            setUnreadMessageCount(parsedCount);
          }
        }
        
        // 채팅방별 안읽은 메시지 수 로드
        const storedUnreadByRoom = localStorage.getItem('unreadMessagesByRoom');
        if (storedUnreadByRoom) {
          try {
            const parsedUnreadByRoom = JSON.parse(storedUnreadByRoom);
            setUnreadMessagesByRoom(parsedUnreadByRoom);
          } catch (e) {
            console.error('안읽은 메시지 상태 파싱 오류:', e);
          }
        }
      } catch (error) {
        console.error('로컬 스토리지에서 안읽은 메시지 데이터 로드 중 오류:', error);
      }
    };
    
    loadInitialData();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  return (
    <ChatContext.Provider value={{
      unreadMessageCount,
      lastAccessTime,
      updateLastAccessTime,
      unreadMessagesByRoom,
      lastReceivedMessages,
      updateLastReceivedMessage,
      markRoomAsRead,
      processIncomingMessage
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};