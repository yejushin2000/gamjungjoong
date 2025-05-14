// src/components/chat/chatItem.tsx
import React, { useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatItemProps {
  roomId: string;
  chattingUserNickname: string;
  nonReadCount: number;
  lastMessage: string;
  postTitle: string;
  createdAt?: string;
  lastUpdatedAt?: string;
  isSelected?: boolean;
  onSelect?: (roomId: string) => void;
  onDelete?: (event?: React.MouseEvent) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  roomId,
  chattingUserNickname,
  nonReadCount,
  lastMessage,
  postTitle,
  createdAt,
  lastUpdatedAt,
  isSelected = false,
  onSelect,
  onDelete
}) => {
  // 날짜 포맷팅 함수
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      // 오늘이면 시간만 표시
      return format(date, 'p');
    } else if (isYesterday(date)) {
      // 어제면 '어제' 표시
      return '어제';
    } else {
      // 그 외에는 날짜만 표시
      return format(date, 'yy.MM.dd');
    }
  };

  // 컴포넌트가 마운트될 때 한 번만 실행
  useEffect(() => {
    // 닉네임 유효성 확인
    const validNickname = chattingUserNickname || '알 수 없음';
    
    // 디버깅을 위한 로그
    console.log('📋 ChatItem에서 확인한 정보:', {
      roomId,
      nickname: validNickname,
      postTitle
    });
    
    // 로컬 스토리지에 채팅방 정보 미리 저장 (임시 데이터)
    try {
      // 로컬 스토리지에 임시 데이터 저장
      const chatContextKey = 'chatContextInfo';
      const existingContextString = localStorage.getItem(chatContextKey);
      const existingContext = existingContextString ? JSON.parse(existingContextString) : {};
      
      // 기존 컨텍스트 정보에 현재 채팅방 정보 추가
      existingContext[roomId] = {
        sellerName: validNickname,
        itemTitle: postTitle || '알 수 없는 상품',
        createdAt: new Date().toISOString()
      };
      
      // 업데이트된 컨텍스트 정보 저장
      localStorage.setItem(chatContextKey, JSON.stringify(existingContext));
    } catch (error) {
      console.error('로컬스토리지 저장 오류:', error);
    }
  }, [roomId, chattingUserNickname, postTitle]);

  // 채팅방 선택 핸들러
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 유효한 닉네임 확인
    const validNickname = chattingUserNickname || '알 수 없음';
    
    // 로컬 스토리지에 현재 선택한 채팅방 정보 저장
    try {
      console.log('💾 ChatItem에서 저장할 정보:', {
        roomId,
        nickname: validNickname,
        postTitle
      });
      
      // 선택한 채팅방 정보 저장
      localStorage.setItem('currentRoomId', roomId);
      localStorage.setItem('currentChatUserNickname', validNickname);
      localStorage.setItem('currentPostTitle', postTitle || '');
      
      // 토큰 정보도 저장
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken) {
        localStorage.setItem(`token_${roomId}`, currentToken);
      }
      
      // 저장 확인
      setTimeout(() => {
        const storedNickname = localStorage.getItem('currentChatUserNickname');
        console.log('✅ ChatItem에서 저장 확인:', {
          저장한닉네임: validNickname,
          확인한닉네임: storedNickname,
          성공여부: storedNickname === validNickname ? '성공' : '실패'
        });
      }, 50);
    } catch (error) {
      console.error('채팅방 선택 중 로컬스토리지 저장 오류:', error);
    }
    
    // 상위 컴포넌트에 선택 이벤트 전달
    if (onSelect) {
      // API 호출은 ChatPage에서 처리하므로 여기서는 roomId만 전달
      onSelect(roomId);
    }
  };
  
  // 채팅방 삭제 핸들러
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && typeof onDelete === 'function') {
      onDelete(e);
    }
  };

  return (
    <li 
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50' : ''
      }`}
      onClick={handleSelect}
    >
      <div className="flex items-start">
        {/* 왼쪽 영역: 프로필 또는 아이콘 */}
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
          {chattingUserNickname?.charAt(0) || '?'}
        </div>
        
        {/* 중앙 영역: 사용자명, 메시지, 게시글 제목 */}
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex items-center">
            <p className="font-medium text-gray-900 truncate">
              {chattingUserNickname || '알 수 없음'}
            </p>
            
            {/* 안 읽은 메시지 수 표시 */}
            {nonReadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {nonReadCount}
              </span>
            )}
          </div>
          
          {/* 마지막 메시지 */}
          <p className="text-sm text-gray-500 truncate mt-1">
            {lastMessage || '메시지가 없습니다.'}
          </p>
          
          {/* 게시글 제목 */}
          <p className="text-xs text-gray-400 truncate mt-1">
            {postTitle || '알 수 없는 게시글'}
          </p>
        </div>
        
        {/* 오른쪽 영역: 시간 및 액션 버튼 */}
        <div className="ml-3 flex flex-col items-end">
          {/* 마지막 업데이트 시간 */}
          <p className="text-xs text-gray-400">
            {formatTime(lastUpdatedAt || createdAt)}
          </p>
          
          {/* 액션 버튼 영역 */}
          <div className="flex mt-2">
            {/* 삭제 버튼 */}
            <button 
              onClick={handleDelete}
              className="ml-2 p-1 text-red-500 hover:bg-red-100 rounded"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

export default ChatItem;