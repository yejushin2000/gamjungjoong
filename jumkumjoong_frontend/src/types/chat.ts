// src/types/chat.ts - 오류 수정한 버전
export enum MessageType {
  MESSAGE = 'MESSAGE',
  RECEIVE = 'RECEIVE',
  READ = 'READ',
  TYPING = 'TYPING'
}

// 웹소켓 메시지 관련 인터페이스
export interface BaseWebSocketMessage {
  type: MessageType;
  roomId: string;
  createdAt: string;
}

export interface SendWebSocketMessage extends BaseWebSocketMessage {
  type: MessageType.MESSAGE;
  sender: number;
  message: string;
}

export interface ReceiveWebSocketMessage extends BaseWebSocketMessage {
  type: MessageType.RECEIVE;
  receiver: number;
  receiveAt: string;
}

export interface ReadWebSocketMessage extends BaseWebSocketMessage {
  type: MessageType.READ;
  reader: number;
  readAt: string;
}

export interface TypingWebSocketMessage extends BaseWebSocketMessage {
  type: MessageType.TYPING;
  userId: number;
  isTyping: boolean;
}

// 유니온 타입으로 모든 웹소켓 메시지 타입 정의
export type WebSocketMessage = SendWebSocketMessage | ReceiveWebSocketMessage | ReadWebSocketMessage | TypingWebSocketMessage;

// UI에서 사용하는 메시지 타입
export interface Message {
  id: string;          // 클라이언트 측에서 생성하는 ID
  text: string;        // 메시지 내용
  timestamp: string;   // 생성 시간
  isMe: boolean;       // 내가 보낸 메시지인지 여부
  userName: string;    // 표시할 사용자 이름
  read?: boolean;      // 읽음 여부
  receivedAt?: string; // 수신 시간
}

// 사용자 관련 타입
export interface ChatUser {
  id: number;
  name: string;
}

// Spring Page 응답 형식
export interface PageResponse<T> {
  content: T[];
  pageable: {
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
  };
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// 사용자 정보 응답 형식 (중복 제거)
export interface UserChatInfoResponse {
  body: {
    userId: string;
  };
  status_code: number;
}

// 채팅 참가자 정보 인터페이스
export interface ChatParticipant {
  userId: number;
  nickname: string;
}

// 채팅 메시지 DTO (백엔드 API 응답 형식)
export interface ChatMessageDTO {
  toSend: boolean;
  message: string;
  createdAt: string;
  senderId?: number; // 백엔드에서 제공하는 발신자 ID
}

// API 응답 형식
export interface ChatResponse<T = any> {
  body: T;
  status_code: number;
}

// 채팅 메시지 API 응답 (Spring Page 형식)
export interface ChatMessageResponse {
  body: PageResponse<ChatMessageDTO> & {
    otherParticipant?: {
      userId: number;
      nickname: string;
    };
  };
  status_code: number;
}

// 이전 API 응답 형식 (호환성 유지용)
export interface LegacyChatMessageResponse {
  body: {
    roomId: string;
    messages: ChatMessage[];
    participant: {
      userId: number;
      nickname: string;
    };
    hasMore?: boolean;
    totalCount?: number;
  };
  status_code: number;
}

// 레거시 채팅 메시지 형식
export interface ChatMessage {
  messageId?: string;
  text?: string;
  senderId?: number;
  timestamp?: string;
  isRead?: boolean;
  toSend?: boolean;   // 새 형식
  message?: string;   // 새 형식
  createdAt?: string; // 새 형식
}

// 페이지네이션 파라미터
export interface ChatMessageParams {
  page?: number;        // 페이지 번호 (0부터 시작)
  size?: number;        // 페이지 크기 
  sort?: string;        // 정렬 방식 (예: "createdAt,desc")
  before?: string;      // 특정 시간 이전의 메시지 (이전 버전 호환용)
  after?: string;       // 특정 시간 이후의 메시지 (이전 버전 호환용)
  lastMessageId?: string; // 마지막으로 가져온 메시지 ID (이전 버전 호환용)
}

// 채팅 훅 파라미터 (processMessage 옵션 추가)
export interface ChatHookParams {
  roomId: string;
  userId: number;
  recipientName: string;
  processMessage?: (message: WebSocketMessage) => Message | null;
}

// 채팅방 라우트 상태
export interface ChatRouteState {
  chattingUserNickname?: string;
}

// 채팅방 정보 타입
export interface ChatRoom {
  id?: number;
  roomId: string | number;
  chattingUserNickname: string; // 추가된 필드
  // 사용자 관련 정보
  sellerId?: number;
  buyerId?: number;
  sellerName?: string;
  buyerName?: string;
  
  // 상품 관련 정보
  itemId?: number;
  itemName?: string;
  itemPrice?: number;
  itemStatus?: boolean;
  itemDescription?: string;
  itemCategory?: string;
  
  // 시간 관련 정보
  createdAt?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt?: string;
  
  // 채팅방 상태 관련 정보
  isDeleted?: boolean;
  nonReadCount?: number;
  
  // 참여자 정보
  participants?: {
    userId: number;
    nickname: string;
    profileImage?: string;
  }[];
  
  // 거래 관련 정보
  tradeStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  
  // 채팅 메타데이터
  totalMessageCount?: number;
  lastMessageType?: 'TEXT' | 'IMAGE' | 'FILE';
  
  // 추가 메타데이터
  isBlocked?: boolean;
  blockedBy?: number;
  
  // 기타 필요한 필드
  extras?: {
    [key: string]: any;
  };
}