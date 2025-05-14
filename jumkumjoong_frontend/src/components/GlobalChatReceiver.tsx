// src/components/GlobalChatReceiver.tsx
import { useEffect } from 'react';
import { useChatService } from '../poviders/ChatServiceProvider';
import { useChatContext } from '../contexts/ChatContext';
import { MessageType } from '../types/chat';

const GlobalChatReceiver = () => {
  const chatService = useChatService();
  const { updateLastReceivedMessage } = useChatContext();
  
  useEffect(() => {
    // 전역 메시지 핸들러 설정
    const handleMessage = (message: any) => {
      console.log('전역에서 메시지 수신:', message);
      
      // 메시지 타입이 MESSAGE인 경우에만 처리
      if (message.type === MessageType.MESSAGE) {
        // ChatContext를 통해 메시지 처리
        updateLastReceivedMessage(message.roomId, message);
      }
    };
    
    // 메시지 핸들러 등록
    chatService.setOnMessage(handleMessage);
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      // 새로운 빈 핸들러로 교체 (선택적)
      chatService.setOnMessage(() => {});
    };
  }, [chatService, updateLastReceivedMessage]);
  
  return null; // UI 렌더링 없음
};

export default GlobalChatReceiver;