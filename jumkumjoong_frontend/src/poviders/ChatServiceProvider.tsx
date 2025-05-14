// src/providers/ChatServiceProvider.tsx
import React, { createContext, useContext, useRef, ReactNode, useEffect } from 'react';
import ChatService from '../services/chatService';

// ChatService를 관리하는 컨텍스트 생성
interface ChatServiceContextType {
  getChatService: () => ChatService;
}

const ChatServiceContext = createContext<ChatServiceContextType | null>(null);

interface ChatServiceProviderProps {
  children: ReactNode;
  websocketUrl: string;
}

export const ChatServiceProvider: React.FC<ChatServiceProviderProps> = ({ 
  children,
  websocketUrl
}) => {
  // 싱글톤 패턴으로 ChatService 인스턴스 관리
  const chatServiceRef = useRef<ChatService | null>(null);

  // ChatService 인스턴스 초기화 또는 가져오기
  const getChatService = () => {
    if (!chatServiceRef.current) {
      chatServiceRef.current = new ChatService({
        url: websocketUrl,
        onConnect: () => {
          console.log('ChatService connected globally');
        },
        onError: (error) => {
          console.error('ChatService global error:', error);
        }
      });
    }
    return chatServiceRef.current;
  };

  // 컴포넌트 언마운트 시 연결 종료
  useEffect(() => {
    return () => {
      if (chatServiceRef.current) {
        chatServiceRef.current.disconnect();
        chatServiceRef.current = null;
      }
    };
  }, []);

  return (
    <ChatServiceContext.Provider value={{ getChatService }}>
      {children}
    </ChatServiceContext.Provider>
  );
};

// 커스텀 훅: ChatService 인스턴스에 접근
export const useChatService = () => {
  const context = useContext(ChatServiceContext);
  if (!context) {
    throw new Error('useChatService must be used within a ChatServiceProvider');
  }
  return context.getChatService();
};

export default ChatServiceContext;