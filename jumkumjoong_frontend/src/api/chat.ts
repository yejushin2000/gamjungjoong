// src/api/chat.ts - process.env.NODE_ENV 제거 버전
import axios from 'axios';
import { useAuthStore } from "../stores/useUserStore";

import {
  ChatResponse,
  ChatRoom,
  ChatMessageResponse,
  ChatMessageParams,
  UserChatInfoResponse
} from '../types/chat';
import axiosInstance from './axios';

const BASE_URL = process.env.REACT_APP_API_URL;

// 채팅방 생성 요청 타입
interface CreateChatRoomRequest {
  sellerId: number;
  itemId: number;
}

// 채팅방 생성
export const createChatRoom = async (data: CreateChatRoomRequest) => {
  try {
    console.log('🔍 채팅방 생성 요청 데이터:', {
      sellerId: data.sellerId,
      itemId: data.itemId
    });

    // 데이터 유효성 검사 추가
    if (!data.sellerId) {
      console.error('❌ sellerId가 없습니다.');
      throw new Error('판매자 ID가 없습니다.');
    }

    if (!data.itemId) {
      console.error('❌ itemId가 없습니다.');
      throw new Error('상품 ID가 없습니다.');
    }

    const response = await axiosInstance.get<ChatResponse<ChatRoom>>(`/chatting`, { 
      params: data,
      // 디버깅을 위한 추가 설정
      paramsSerializer: {
        indexes: null // 배열 파라미터 직렬화 방식 설정
      }
    });

    console.log('✅ 채팅방 생성 응답:', response.data);
    
    // 기존 채팅방 유무에 따른 처리 추가
    if (response.data.body) {
      // 채팅방이 이미 존재하는 경우 - roomId를 반환하여 리다이렉트할 수 있도록 함
      const roomId = response.data.body;
      console.log('🔄 기존 채팅방으로 리다이렉트:', `/chatting${roomId}`);
      return {
        ...response.data,
        redirect: true,
        redirectUrl: `/chatting${roomId}`
      };
    }
    
    // 채팅방이 없는 경우 - 기존 응답을 그대로 반환
    return response.data;
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
    
    throw error;
  }
};

// 채팅방 목록 조회
export const getChatRooms = async () => {
  try {
    const response = await axiosInstance.get<ChatResponse<ChatRoom[]>>(`/chatting`);
    return response.data;
  } catch (error) {
    console.error('채팅방 목록 조회 오류:', error);
    throw error;
  }
};

// 특정 채팅방의 메시지 조회 - 중복 정의 제거하고 types에서 임포트
export const getChatMessages = async (roomId: string, params?: ChatMessageParams): Promise<ChatMessageResponse> => {
  try {
    console.log('🔍 채팅 메시지 조회 요청:', {
      roomId,
      params
    });
    
    // 요청 파라미터 준비
    let queryParams: any = {};
    
    // 페이징 정보가 있는 경우
    if (params) {
      // Spring Page 형식에 맞게 파라미터 조정
      queryParams = {
        page: params.page || 0,
        size: params.size || 20,
        sort: params.sort || 'createdAt,desc' // 최신 메시지부터 정렬
      };
    } 
    
    console.log('🔍 최종 요청 파라미터:', queryParams);
    
    // axiosInstance 사용
    const response = await axiosInstance.get<ChatMessageResponse>(`/chatting/${roomId}`, {
      params: queryParams
    });
    
    console.log('✅ 채팅 메시지 응답:', {
      status: response.status,
      data: response.data
    });
    
    // 응답이 정상적인지 확인
    if (response.data && response.data.status_code === 200 && response.data.body) {
      return response.data;
    } else {
      console.error('API 응답 구조가 예상과 다릅니다:', response);
      
      // 기본 응답 구조 반환
      return {
        status_code: response.status || 500,
        body: {
          content: [],
          pageable: {
            pageNumber: 0,
            pageSize: 0,
            sort: { empty: true, sorted: false, unsorted: true },
            offset: 0,
            paged: true, 
            unpaged: false
          },
          size: 0,
          number: 0,
          sort: { empty: true, sorted: false, unsorted: true },
          numberOfElements: 0,
          first: true,
          last: true,
          empty: true
        }
      };
    }
  } catch (error) {
    console.error('채팅 메시지 조회 오류:', error);
    
    
    // Axios 오류의 경우 상세 정보 로깅
    if (axios.isAxiosError(error)) {
      console.error('📡 상세 에러 정보:', {
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
    }
    
    // 에러 발생 시 기본 응답 반환
    return {
      status_code: 500,
      body: {
        content: [],
        pageable: {
          pageNumber: 0,
          pageSize: 0,
          sort: { empty: true, sorted: false, unsorted: true },
          offset: 0,
          paged: true, 
          unpaged: false
        },
        size: 0,
        number: 0,
        sort: { empty: true, sorted: false, unsorted: true },
        numberOfElements: 0,
        first: true,
        last: true,
        empty: true
      }
    };
  }
};

// 채팅방 삭제
export const deleteChatRoom = async (roomId: string) => {
  try {
    const response = await axiosInstance.delete(`/chatting/${roomId}`);
    return response.data;
  } catch (error) {
    console.error('채팅방 삭제 오류:', error);
    throw error;
  }
};

// 사용자 ID 조회 함수 - 타입 수정
export const getUserChatInfo = async (): Promise<UserChatInfoResponse> => {
  try {
    // axiosInstance 사용 - 상대 경로만 사용
    const response = await axiosInstance.get<UserChatInfoResponse>('/chatting/userId');
    
    console.log('✅ 사용자 정보 응답:', response);
    
    if (response.data && response.data.body && response.data.body.userId) {
      console.log('🎯 userId:', response.data.body.userId);
      
      // 로컬 스토리지에 userId 저장
      localStorage.setItem('userId', response.data.body.userId);
      
      return response.data;
    } else {
      console.error('❌ 유효하지 않은 응답:', response.data);
      throw new Error('Invalid user ID response');
    }
  } catch (error) {
    console.error('🚨 사용자 ID 가져오기 실패:', error);
    
    // 무조건 기본값 반환
    return {
      status_code: 200,
      body: {
        userId: "1999"
      }
    };
  }
};

export const readChatRoom = async (roomId: string) => {
  try {
    console.log(`🔍 채팅방 읽음 요청 시작: ${roomId}`);
    
    const response = await axiosInstance.get(`/chatting/${roomId}/reading`);
    
    console.log('✅ 채팅방 읽음 응답:', {
      status: response.status,
      data: response.data
    });
    
    // 서버에서 받은 읽음 시간 반환
    return response.data;
  } catch (error) {
    console.error('❌ 채팅방 읽음 요청 오류:', error);
    
    // Axios 오류의 경우 상세 정보 로깅
    if (axios.isAxiosError(error)) {
      console.error('📡 상세 에러 정보:', {
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
    }
    
    // 기본 응답 구조 반환
    return {
      status_code: 500,
      body: new Date().toISOString() // 오류 시 현재 시간 반환
    };
  }
};
