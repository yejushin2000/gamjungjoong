// src/hooks/useChat.ts - 오류 수정한 버전
import { useState, useEffect, useCallback } from 'react';
import { 
  Message, 
  WebSocketMessage, 
  SendWebSocketMessage,
  ReceiveWebSocketMessage,
  MessageType,
  ChatHookParams
} from '../types/chat';
import { useChatService } from '../poviders/ChatServiceProvider';
import { getCurrentTime } from '../utils/chatUtils';
import { useChatContext } from '../contexts/ChatContext';

export const useChat = ({ 
  roomId, 
  userId, 
  recipientName,
  processMessage // 이제 ChatHookParams에 정의됨
}: ChatHookParams) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastProcessedMessage, setLastProcessedMessage] = useState<{sender: number, message: string} | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const localStorageUserId = Number(localStorage.getItem('userId'));

  const chatService = useChatService();
  const { 
    updateLastReceivedMessage, 
    processIncomingMessage: contextProcessMessage,
    updateLastAccessTime
  } = useChatContext();

  // 컴포넌트 마운트 시 마지막 접속 시간 업데이트
  useEffect(() => {
    updateLastAccessTime();
  }, [updateLastAccessTime]);

  useEffect(() => {
    console.log('useEffect: 웹소켓 설정 시작', roomId, userId);
    
    let isComponentMounted = true; // 컴포넌트 마운트 상태 추적
    
    const handleConnectionChange = () => {
      if (isComponentMounted) {
        setIsConnected(chatService.isConnected());
        console.log('연결 상태 변경:', chatService.isConnected());
      }
    };

    const handleMessage = (message: WebSocketMessage) => {
      console.log('메시지 수신 핸들러 실행:', message);
      
      // 메시지 타입에 따라 처리 방식 분기
      if (message.type === MessageType.MESSAGE) {
        const msg = message as SendWebSocketMessage;
      
        // 숫자 타입으로 명확히 비교 (문자열/숫자 혼동 방지)
        if (Number(msg.sender) === Number(localStorageUserId)) {
          console.log('내 메시지 무시 - 로컬에 이미 추가됨');
          return; // 내가 보낸 메시지는 이미 UI에 추가되었으므로 무시
        }
        
        // 메시지 ID 기반 중복 체크 추가
        const isDuplicate = messages.some(existingMsg => 
          existingMsg.id === `ws_${new Date(msg.createdAt).getTime()}_${msg.sender}` ||
          (existingMsg.text === msg.message && 
           existingMsg.timestamp === msg.createdAt)
        );
        
        if (isDuplicate) {
          console.log('중복 메시지 감지:', message);
          return;
        }
        
        // 마지막으로 처리된 메시지 업데이트
        setLastProcessedMessage({
          sender: (message as SendWebSocketMessage).sender,
          message: (message as SendWebSocketMessage).message
        });
        
        // 커스텀 메시지 처리 함수가 있으면 사용, 없으면 기존 함수 사용
        let newMsg: Message;
        
        if (processMessage) {
          const processedMsg = processMessage(message);
          if (processedMsg) {
            newMsg = processedMsg;
          } else {
            // processMessage가 null을 반환한 경우 기존 함수 사용
            newMsg = contextProcessMessage(message as SendWebSocketMessage);
            newMsg.userName = recipientName;
          }
        } else {
          // 기존 처리 방식
          newMsg = contextProcessMessage(message as SendWebSocketMessage);
          newMsg.userName = recipientName;
        }
        
        console.log('UI에 메시지 추가:', newMsg);
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages, newMsg];
          console.log('업데이트된 메시지 배열:', updatedMessages);
          return updatedMessages;
        });
    
        // 메시지 수신 확인 메시지 전송
        const receiveConfirmation: ReceiveWebSocketMessage = {
          type: MessageType.RECEIVE,
          roomId: message.roomId,
          receiver: userId,
          createdAt: new Date().toISOString(),
          receiveAt: new Date().toISOString()
        };
    
        console.log('메시지 수신 확인 전송:', receiveConfirmation);
        chatService.sendMessage(receiveConfirmation);
    
        // 마지막 메시지 컨텍스트에 업데이트
        updateLastReceivedMessage(message.roomId, message);
      } else if (message.type === MessageType.RECEIVE) {
        // RECEIVE 타입 메시지 처리
        console.log('메시지 읽음 확인 수신:', message);
        const receiveMessage = message as ReceiveWebSocketMessage;
        
        // 읽음 시간 추출
        const receiveTime = new Date(receiveMessage.receiveAt).getTime();
        
        // 중요: 상대방이 보낸 RECEIVE 메시지인지 확인
        // String으로 명시적 변환하여 비교
        const isSelfReceiveMessage = String(receiveMessage.receiver) === String(userId);
        
        // 자신이 보낸 메시지가 아닌 경우만 처리 (상대방이 보낸 읽음 메시지)
        if (!isSelfReceiveMessage) {
          console.log('상대방이 보낸 읽음 확인 메시지 처리:', receiveMessage);
          
          // 읽음 상태를 로컬 스토리지에 저장하는 함수
          const saveReadStatus = (chatRoomId: string, msgId: string, read: boolean): void => {
            const roomKey = `chat_read_status_${chatRoomId}`;
            let readStatuses: { [key: string]: boolean } = {};
            
            // 기존 저장된 상태 확인
            const savedStatuses = localStorage.getItem(roomKey);
            if (savedStatuses) {
              try {
                readStatuses = JSON.parse(savedStatuses);
              } catch (e) {
                console.error('읽음 상태 파싱 오류:', e);
                readStatuses = {};
              }
            }
            
            // 상태 업데이트
            readStatuses[msgId] = read;
            
            // 로컬 스토리지에 저장
            localStorage.setItem(roomKey, JSON.stringify(readStatuses));
            console.log(`메시지 ID ${msgId}의 읽음 상태 ${read}로 저장됨 (채팅방: ${chatRoomId})`);
          };
          
          // 메시지를 하나씩 확인하여 읽음 처리
          let hasChanges = false;
          const updatedMessages: Message[] = [];
          
          for (const msg of messages) {
            // 조건 1: 내가 보낸 메시지이고
            // 조건 2: 아직 읽지 않은 상태(read가 false)이고
            // 조건 3: 메시지 시간이 RECEIVE 메시지 시간보다 이전인 경우
            if (msg.isMe && 
              msg.read === false && 
              new Date(msg.timestamp).getTime() <= receiveTime) {
              
              console.log(`메시지 읽음 처리: ${msg.id}, 텍스트: "${msg.text.substring(0, 15)}${msg.text.length > 15 ? '...' : ''}"`);
              
              // 읽음 상태를 true로 바꾸고 로컬 스토리지에 영구 저장
              saveReadStatus(receiveMessage.roomId, msg.id, true);
              
              // 읽음 처리된 메시지 추가
              updatedMessages.push({ ...msg, read: true });
              hasChanges = true;
            } else {
              // 변경되지 않은 메시지 추가
              updatedMessages.push(msg);
            }
          }
          
          // 메시지 변경이 있는 경우에만 상태 업데이트
          if (hasChanges) {
            setMessages(updatedMessages);
          }
        } else {
          console.log('내가 보낸 읽음 확인 메시지 무시:', receiveMessage);
        }
      }
    };

    if (!chatService.isConnected()) {
      console.log('웹소켓 연결 시작');
      chatService.connect();
    }

    setIsConnected(chatService.isConnected());
    console.log('초기 연결 상태:', chatService.isConnected());

    const onConnectHandler = () => {
      console.log('연결 성공 이벤트');
      handleConnectionChange();
      chatService.subscribeToRoom(roomId);
      console.log('채팅방 구독:', roomId);
    };

    chatService.setOnConnect(onConnectHandler);
    chatService.setOnError(() => {
      console.log('연결 오류 발생');
      handleConnectionChange();
    });
    
    console.log('메시지 핸들러 설정');
    chatService.setOnMessage(message => {
      console.log('소켓으로부터 메시지 수신:', message);
      handleMessage(message);
    });

    if (chatService.isConnected()) {
      console.log('이미 연결됨, 채팅방 구독:', roomId);
      chatService.subscribeToRoom(roomId);
    }
    
    return () => {
      console.log('컴포넌트 언마운트, 구독 해제:', roomId);
      isComponentMounted = false; // 마운트 상태 업데이트
      chatService.unsubscribeFromRoom(roomId);
      
      // 핸들러 등록 초기화
      chatService.setOnMessage(() => {});
      chatService.setOnConnect(() => {});
      chatService.setOnError(() => {});
    };
  }, [roomId, userId, recipientName, chatService, contextProcessMessage, updateLastReceivedMessage, processMessage]);

  // 메시지 전송 함수
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !isConnected) return;
    
    console.log('메시지 전송 시작:', newMessage);
    
    // 현재 시간 ISO 문자열
    const currentTime = new Date().toISOString();
    
    // 사용자가 입력한 메시지를 먼저 UI에 추가 (로컬 메시지)
    const localMsg: Message = {
      id: `msg_${Date.now()}_${newMessage.trim().substring(0, Math.min(10, newMessage.trim().length))}_${localStorageUserId}`,
      text: newMessage.trim(),
      isMe: true,
      userName: '나',
      timestamp: currentTime,
      read: false, // 항상 읽지 않은 상태로 시작
      receivedAt: currentTime
    };
    
    console.log('로컬 UI에 메시지 추가:', localMsg);
    
    // 생성된 메시지 ID로 즉시 로컬 스토리지에 읽음 상태(false) 저장
    const saveMessageReadStatus = (messageId: string, read: boolean) => {
      const roomKey = `chat_read_status_${roomId}`;
      let readStatuses: { [key: string]: boolean } = {};
      
      // 기존 저장된 상태 확인
      const savedStatuses = localStorage.getItem(roomKey);
      if (savedStatuses) {
        try {
          readStatuses = JSON.parse(savedStatuses);
        } catch (e) {
          console.error('읽음 상태 파싱 오류:', e);
          readStatuses = {};
        }
      }
      
      // 상태 업데이트
      readStatuses[messageId] = read;
      
      // 저장
      localStorage.setItem(roomKey, JSON.stringify(readStatuses));
      console.log(`메시지 ID ${messageId}의 읽음 상태 ${read}로 저장 (채팅방: ${roomId})`);
    };
    
    // 메시지 ID와 읽음 상태(false) 저장
    saveMessageReadStatus(localMsg.id, false);
    
    setMessages(prevMessages => [...prevMessages, localMsg]);
    
    // 웹소켓으로 메시지 전송
    const messageToSend: SendWebSocketMessage = {
      type: MessageType.MESSAGE,
      roomId: roomId,
      sender: localStorageUserId,
      message: newMessage.trim(),
      createdAt: currentTime
    };
  
    console.log('웹소켓으로 전송:', messageToSend);
    chatService.sendMessage(messageToSend);
    
    // 입력창 비우기
    setNewMessage('');
  }, [newMessage, roomId, userId, isConnected, chatService]);

  // 입력 업데이트 핸들러
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  }, []);

  // 키 이벤트 핸들러 (엔터 키로 메시지 전송)
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // 초기 메시지 설정
  const setInitialMessages = useCallback((initialMessages: Message[]) => {
    console.log('초기 메시지 설정:', initialMessages);
    setMessages(initialMessages);
  }, []);

  // 이전 메시지 추가 함수
  const addOlderMessages = useCallback((olderMessages: Message[]) => {
    console.log('이전 메시지 추가:', olderMessages);
    setMessages(prevMessages => [...olderMessages, ...prevMessages]);
  }, []);

  return {
    messages,
    setMessages,
    newMessage,
    isConnected,
    sendMessage,
    handleInputChange,
    handleKeyPress,
    setInitialMessages,
    addOlderMessages,
  };
};

export default useChat;