import { Client, IMessage } from '@stomp/stompjs';
import { 
  WebSocketMessage, 
  SendWebSocketMessage, 
  ReceiveWebSocketMessage,
  MessageType 
} from '../types/chat';
import { useAuthStore } from '../stores/useUserStore'; // 인증 스토어 추가

export interface ChatServiceOptions {
  url: string;
  onConnect?: () => void;
  onError?: (error: any) => void;
  onMessage?: (message: WebSocketMessage) => void;
  debug?: boolean;
}

class ChatService {
  private client: Client | null = null;
  private options: ChatServiceOptions;
  private subscriptions: { [key: string]: { id: string } } = {};
  private onConnectCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  private onMessageCallback: ((message: WebSocketMessage) => void) | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(options: ChatServiceOptions) {
    this.options = options;
    this.onConnectCallback = options.onConnect || null;
    this.onErrorCallback = options.onError || null;
    this.onMessageCallback = options.onMessage || null;
  }

  // 콜백 함수 설정 메서드
  setOnConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  setOnError(callback: (error: any) => void): void {
    this.onErrorCallback = callback;
  }

  setOnMessage(callback: (message: WebSocketMessage) => void): void {
    this.onMessageCallback = callback;
  }

  // 최신 토큰 가져오기
  private getLatestToken(): string | null {
    // 1. 스토어에서 토큰 확인
    const storeToken = useAuthStore.getState().accessToken;
    
    // 2. 로컬 스토리지에서 토큰 확인
    const localToken = localStorage.getItem('accessToken');
    
    // 스토어 토큰 우선, 없으면 로컬 스토리지 토큰
    const token = storeToken || localToken;
    
    // 디버깅용 로그
    console.log('🔑 WebSocket 연결용 토큰 확인:', {
      스토어토큰: storeToken ? '있음' : '없음',
      로컬토큰: localToken ? '있음' : '없음',
      사용토큰: token ? '있음' : '없음'
    });
    
    return token;
  }

  // 웹소켓 연결 초기화 - 토큰 관리 강화
  connect(): void {
    if (this.client && this.client.connected) {
      console.log('이미 연결되어 있습니다. 기존 연결을 유지합니다.');
      return;
    }
    
    if (this.client) {
      this.disconnect();
    }
    
    // 최신 토큰 가져오기
    const token = this.getLatestToken();
    
    if (!token) {
      console.error('❌ 토큰이 없어 WebSocket 연결을 시도할 수 없습니다.');
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('인증 토큰 없음'));
      }
      return;
    }
    
    // SockJS 옵션에 토큰 추가 (URL 매개변수로 토큰 전달)
    const sockJsOptions = {
      transports: ['websocket'],
      sessionId: () => Math.random().toString(36).substr(2, 8)
    };
    
    // STOMP 클라이언트 생성
    this.client = new Client({
      brokerURL: this.options.url,
      connectHeaders: {
        'Authorization': `Bearer ${token}`
      },
      debug: (str) => {
        if (this.options.debug) {
          console.log('STOMP Debug:', str);
        }
      },
      reconnectDelay: this.calculateReconnectDelay(),
      heartbeatIncoming: 10000, // 하트비트 간격 증가
      heartbeatOutgoing: 10000,
    });
  
    // 연결 성공 시 핸들러
    this.client.onConnect = () => {
      console.log('✅ Connected to STOMP server');
      this.reconnectAttempts = 0; // 연결 성공 시 카운터 초기화
      
      if (this.onConnectCallback) {
        this.onConnectCallback();
      }
      
      // 이전에 구독했던 채팅방들 다시 구독
      Object.keys(this.subscriptions).forEach(destination => {
        const roomId = destination.split('/').pop(); // '/receive/roomId'에서 roomId 추출
        if (roomId) {
          this.subscribeToRoom(roomId);
        }
      });
    };
  
    // 연결 오류 시 핸들러 (토큰 관련 오류 처리 추가)
    this.client.onStompError = (frame) => {
      console.error('❌ STOMP Error:', frame.headers, frame.body);
      
      // 인증 관련 오류 감지
      if (frame.headers.message && 
         (frame.headers.message.includes('Authorization') || 
          frame.headers.message.includes('Failed to send') ||
          frame.headers.message.includes('clientInboundChannel'))) {
        
        console.warn('🔑 인증 관련 오류 감지, 토큰 갱신 시도...');
        
        // 토큰 갱신 시도 (여기서는 로컬 스토리지를 비우는 것으로 가정)
        localStorage.removeItem('accessToken');
        useAuthStore.getState().setAccessToken(''); // 스토어에서도 제거
        
        // 갱신된 토큰이 있으면 재연결 시도 (실제 구현에서는 갱신 API 호출 필요)
        setTimeout(() => {
          const newToken = this.getLatestToken();
          if (newToken) {
            this.connect(); // 갱신된 토큰으로 재연결 시도
          } else {
            console.error('❌ 새 토큰을 가져올 수 없음. 연결 중단.');
          }
        }, 1000);
      }
      
      if (this.onErrorCallback) {
        this.onErrorCallback(frame);
      }
    };
  
    // WebSocket 연결이 닫힐 때 핸들러
    this.client.onWebSocketClose = (event) => {
      console.warn('🔌 WebSocket connection closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      // WebSocket 종료 코드에 따른 처리
      if (event.code === 1000) { // 정상 종료
        console.log('정상적으로 연결이 종료되었습니다.');
      } else if (event.code === 1001) { // 앱 종료/페이지 이동
        console.log('사용자가 페이지를 벗어났습니다.');
      } else if (event.code === 1006) { // 비정상 종료
        console.warn('비정상적으로 연결이 종료되었습니다. 재연결 시도...');
        this.attemptReconnect();
      } else if (event.code === 1008 || event.code === 1011) { // 정책/내부 오류
        console.error('서버 정책 또는 내부 오류로 연결이 종료되었습니다.');
        // 토큰 갱신 시도
        this.refreshTokenAndReconnect();
      }
    };
  
    this.client.activate();
    console.log('🔄 STOMP 클라이언트 활성화 시도 중...');
  }
  
  // 토큰 갱신 및 재연결
  private refreshTokenAndReconnect(): void {
    console.log('🔄 토큰 갱신 및 재연결 시도...');
    
    // 실제 토큰 갱신 API를 호출해야 함
    // 여기서는 로컬 스토리지를 확인하고 있는 토큰을 유지하는 방식으로 수정
    const currentToken = localStorage.getItem('accessToken');
    
    if (currentToken) {
      // 기존 토큰이 있으면 그대로 사용해 재연결 시도
      console.log('기존 토큰으로 재연결 시도...');
      this.connect();
    } else {
      // 토큰이 없으면 로그인 페이지로 이동 또는 사용자에게 알림
      console.error('❌ 유효한 토큰이 없습니다. 재인증이 필요합니다.');
      // 필요시 이벤트 발생 또는 콜백 호출
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('인증 토큰이 만료되었습니다.'));
      }
    }
  }
  
  // 재연결 딜레이 계산 (지수 백오프 적용)
  private calculateReconnectDelay(): number {
    // 기본 딜레이 5초, 최대 2분(120초)까지 지수적으로 증가
    const baseDelay = 5000;
    const maxDelay = 120000;
    
    if (this.reconnectAttempts === 0) {
      return baseDelay;
    }
    
    // 지수 백오프: 5초, 10초, 20초, 40초...
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), maxDelay);
    return delay;
  }
  
  // 재연결 시도
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ 최대 재연결 시도 횟수(${this.maxReconnectAttempts}회)를 초과했습니다.`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();
    
    console.log(`🔄 ${this.reconnectAttempts}번째 재연결 시도, ${delay/1000}초 후...`);
    
    setTimeout(() => {
      // 최신 토큰 확인 후 연결
      const token = this.getLatestToken();
      if (token) {
        this.connect();
      } else {
        console.error('❌ 재연결을 위한 토큰이 없습니다.');
      }
    }, delay);
  }

  // 웹소켓 연결 해제
  disconnect(): void {
    if (this.client && this.client.connected) {
      this.client.deactivate();
      this.client = null;
      // 구독 정보는 보존 - 재연결 시 다시 구독하기 위함
      console.log('🔌 WebSocket 연결 해제됨');
    }
  }

  // 특정 채팅방 구독
  subscribeToRoom(roomId: string): void {
    if (!this.client || !this.client.connected) {
      console.error('Cannot subscribe: Client not connected');
      return;
    }

    const destination = `/receive/${roomId}`;
    console.log(`Attempting to subscribe to: ${destination}`);

    // 이미 구독 중이면 무시
    if (this.subscriptions[destination]) {
      console.log(`Already subscribed to: ${destination}`);
      return;
    }

    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      console.log(`Raw message received from ${destination}:`, message);
      if (message.body) {
        try {
          const parsedMessage = JSON.parse(message.body) as WebSocketMessage;
          console.log('Parsed message:', parsedMessage);
          
          if (this.onMessageCallback) {
            this.onMessageCallback(parsedMessage);
          }
        } catch (e) {
          console.error('Error parsing message:', e, 'Raw message:', message.body);
        }
      }
    });

    console.log(`Successfully subscribed to: ${destination}, subscription ID: ${subscription.id}`);
    this.subscriptions[destination] = subscription;
  }

  // 채팅방 구독 해제
  unsubscribeFromRoom(roomId: string): void {
    const destination = `/receive/${roomId}`;
    
    if (this.subscriptions[destination]) {
      console.log(`Unsubscribing from: ${destination}`);
      this.subscriptions[destination].id && 
        this.client?.unsubscribe(this.subscriptions[destination].id);
      delete this.subscriptions[destination];
      console.log(`Unsubscribed from: ${destination}`);
    }
  }

  // 메시지 전송 (SendWebSocketMessage 또는 ReceiveWebSocketMessage 지원)
  sendMessage(message: SendWebSocketMessage | ReceiveWebSocketMessage): boolean {
    // 연결 확인
    if (!this.client || !this.client.connected) {
      console.warn('⚠️ 웹소켓 연결이 없어 메시지를 전송할 수 없습니다.');
      return false;
    }
    
    // 토큰 확인
    const token = this.getLatestToken();
    if (!token) {
      console.warn('⚠️ 토큰이 없어 메시지를 전송할 수 없습니다.');
      return false;
    }
    
    try {
      // 메시지 타입에 따라 다른 형식 사용
      let simplifiedMessage: any = { 
        type: message.type,
        roomId: message.roomId,
        createdAt: message.createdAt
      };
      
      // 메시지 타입별 필드 추가
      if (message.type === MessageType.MESSAGE) {
        simplifiedMessage.message = (message as SendWebSocketMessage).message;
        simplifiedMessage.sender = (message as SendWebSocketMessage).sender;
      } else if (message.type === MessageType.RECEIVE) {
        simplifiedMessage.receiver = (message as ReceiveWebSocketMessage).receiver;
        simplifiedMessage.receiveAt = (message as ReceiveWebSocketMessage).receiveAt;
        
        // RECEIVE 메시지에 대한 로깅 추가
        console.log('📤 RECEIVE 메시지 전송:', {
          roomId: message.roomId,
          receiver: (message as ReceiveWebSocketMessage).receiver,
          receiveAt: (message as ReceiveWebSocketMessage).receiveAt
        });
      }
      
      console.log('Sending message:', simplifiedMessage);
      
      const destination = `/send/${message.roomId}`;
      
      this.client.publish({
        destination: destination,
        body: JSON.stringify(simplifiedMessage),
        headers: { 'content-type': 'application/json' }
      });
      
      return true;
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      return false;
    }
  }
  

  // 연결 상태 확인
  isConnected(): boolean {
    return !!this.client && this.client.connected;
  }
}

export default ChatService;