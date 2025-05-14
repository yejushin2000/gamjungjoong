import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../../api/axios';

interface ChatButtonProps {
  sellerId: number;
  itemId: number;
  sellerName: string;
  itemTitle: string;
  className?: string;
}

const BASE_URL = process.env.REACT_APP_API_URL;

// localStorage에 저장할 키
const CHAT_REFRESH_KEY = 'chatListRefresh';
const CHAT_CONTEXT_KEY = 'chatContextInfo'; // 채팅 컨텍스트 정보 저장 키

const ChatButton: React.FC<ChatButtonProps> = ({ 
  sellerId,
  itemId,
  sellerName,
  itemTitle,
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleChatStart = async () => {
    try {
      setLoading(true);
      
      // 디버깅용 로그 추가
      console.log('🛍️ 채팅방 생성 요청 데이터:', {
        sellerId, 
        itemId,
        sellerName,
        itemTitle
      });
      
      // 채팅방 생성 API 호출
      const response = await axiosInstance.post(
        `${BASE_URL}/chatting`, 
        { 
          sellerId, 
          salesItemId: itemId 
        }
      );
      
      // 응답 전체 로깅
      console.log('✅ 채팅방 생성 전체 응답:', response);
      
      // 상세 응답 로깅
      console.log('📦 응답 데이터:', response.data);
      console.log('📊 응답 상태:', response.status);
      
      // 응답 확인
      if (response.data && response.data.status_code === 200) {
        console.log('채팅방 생성 성공!', response.data);
        
        // 채팅 컨텍스트 정보 저장 (판매자 이름과 상품 제목)
        const existingContextString = localStorage.getItem(CHAT_CONTEXT_KEY);
        const existingContext = existingContextString ? JSON.parse(existingContextString) : {};
        
        // 향상된 UX를 위한 지연 함수 생성
        const delayNavigation = (callback: () => void) => {
          // API 응답은 받았지만, UX를 위해 최소 2초의 로딩 시간 보장
          const apiResponseTime = Date.now();
          const minimumLoadingTime = 2000; // 2초
          
          // API 응답 시간이 2초보다 빠르면, 남은 시간만큼 더 기다림
          setTimeout(callback, minimumLoadingTime);
        };
        
        // 백엔드 응답에 따른 처리
        if (response.data.body) {
          // 기존 채팅방이 있는 경우: response.data.body가 암호화된 roomId
          const roomId = response.data.body;
          console.log('🔄 기존 채팅방으로 리다이렉트:', roomId);
          
          // 채팅 컨텍스트 정보 업데이트
          if (!existingContext[roomId]) {
            // 해당 채팅방 정보가 없을 때만 추가
            existingContext[roomId] = {
              sellerName,
              itemTitle,
              createdAt: new Date().toISOString()
            };
            localStorage.setItem(CHAT_CONTEXT_KEY, JSON.stringify(existingContext));
          }
          
          // 채팅 목록 페이지가 새로고침되도록 localStorage에 상태 저장
          localStorage.setItem(CHAT_REFRESH_KEY, Date.now().toString());
          
          // 로딩 애니메이션을 2초 동안 보여준 후 이동
          delayNavigation(() => {
            navigate(`/chatting${roomId}`, {
              state: {
                roomId,
                chattingUserNickname: sellerName,
                itemTitle: itemTitle
              }
            });
          });
        } else {
          // 채팅방이 없는 경우: 기존 로직 수행
          // 가능하다면 응답에서 roomId 추출, 없으면 임시 ID 사용
          const chatRoomId = response.data.body?.roomId || `${sellerId}_${itemId}_${Date.now()}`;
          
          // 채팅 컨텍스트 정보 업데이트
          const updatedContext = {
            ...existingContext,
            [chatRoomId]: {
              sellerName,
              itemTitle,
              createdAt: new Date().toISOString()
            }
          };
          
          localStorage.setItem(CHAT_CONTEXT_KEY, JSON.stringify(updatedContext));
          
          // 채팅 목록 페이지가 새로고침되도록 localStorage에 상태 저장
          localStorage.setItem(CHAT_REFRESH_KEY, Date.now().toString());
          
          // 로딩 애니메이션을 2초 동안 보여준 후 이동
          delayNavigation(() => {
            navigate(`/chatting/list`, {
              state: {
                roomId: chatRoomId,
                chattingUserNickname: sellerName,
                itemTitle: itemTitle
              }
            });
          });
        }
      } else {
        console.error('❌ 채팅방 생성 실패:', response.data);
        
        // 에러 메시지도 2초 후에 표시
        setTimeout(() => {
          alert('채팅방을 생성할 수 없습니다. 다시 시도해 주세요.');
          setLoading(false);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ 채팅방 생성 오류:', error);
      
      // 에러 상세 로깅
      if (axios.isAxiosError(error)) {
        console.error('📡 상세 에러 정보:', {
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
      }
      
      // 에러 메시지도 2초 후에 표시
      setTimeout(() => {
        alert('채팅 시작 중 오류가 발생했습니다. 다시 시도해 주세요.');
        setLoading(false);
      }, 2000);
    }
  };
  
  return (
    <button
      onClick={handleChatStart}
      disabled={loading}
      className={`px-6 py-2 bg-blue-400 text-white font-medium rounded-md hover:bg-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>채팅방 준비 중...</span>
        </div>
      ) : `${sellerName}님과 채팅하기`}
    </button>
  );
};

export default ChatButton;