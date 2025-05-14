// src/services/goodsService.ts
import { GoodsItemProps } from "../components/goods/GoodsItem";

// 상품 등록을 위한 인터페이스 정의
export interface GoodsRegistrationData {
  title: string;
  description: string;
  price: string;
  images: File[];
}

// 기본 하드코딩된 상품 데이터 (API 호출 실패 시 폴백으로 사용)
const defaultGoodsData: GoodsItemProps[] = [
  {
    itemId: 1,
    itemName: "갤럭5(S급) 팝니다",
    itemPrice: 9600000,
    createdAt: "2시간전",
    // seller: '재드래곤',
    itemStatus: false,
    imageUrl: "/images/laptop.jpg", // 실제 이미지 경로로 수정해야 함
  },
  // 다른 상품 데이터는 그대로 유지
  {
    itemId: 2,
    itemName: "맥북pro 팔아용",
    itemPrice: 9600000,
    createdAt: "16시간전",
    itemStatus: false,
    imageUrl: "/images/laptop.jpg",
  },
  {
    itemId: 3,
    itemName: "갤럭5(S급) 팝니다",
    itemPrice: 9600000,
    createdAt: "1일전",
    itemStatus: false,
    imageUrl: "/images/laptop.jpg",
  },
  {
    itemId: 4,
    itemName: "애플워치 SE",
    itemPrice: 9600000,
    createdAt: "3일전",
    itemStatus: false,
    imageUrl: "/images/laptop.jpg",
  },
  {
    itemId: 5,
    itemName: "아이폰 15 미개봉",
    itemPrice: 9600000,
    createdAt: "5일전",
    itemStatus: false,
    imageUrl: "/images/laptop.jpg",
  },
  {
    itemId: 6,
    itemName: "닌텐도 스위치 팝니다",
    itemPrice: 9600000,
    createdAt: "6일전",
    itemStatus: false,
    imageUrl: "/images/laptop.jpg",
  },
  {
    itemId: 7,
    itemName: "갤럭시 버즈2 미개봉",
    itemPrice: 9600000,
    createdAt: "1주일전",
    itemStatus: false,
    imageUrl: "/images/laptop.jpg",
  },
];

/**
 * 상품 목록을 가져오는 함수
 * API 연동 실패 시 기본 데이터 반환
 */
export const getGoodsList = async (
  searchTerm?: string
): Promise<GoodsItemProps[]> => {
  try {
    // 실제 API 구현이 완료되면 아래 주석을 해제
    /*
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
    const url = searchTerm 
      ? `${API_BASE_URL}/goods?search=${encodeURIComponent(searchTerm)}` 
      : `${API_BASE_URL}/goods`;
    
    const response = await axios.get(url);
    
    // 백엔드 응답 형식에 맞게 변환
    return response.data.map((item: any) => ({
      id: item.id,
      title: item.title,
      price: `${item.price.toLocaleString()}원`,
      time: formatTimeAgo(new Date(item.createdAt)),
      seller: item.sellerName,
      imageUrl: item.imageUrl
    }));
    */

    // API 미구현 또는 테스트를 위한 모의 데이터 반환
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!searchTerm?.trim()) {
          resolve(defaultGoodsData);
          return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const result = defaultGoodsData.filter((item) =>
          item.itemName.toLowerCase().includes(lowerTerm)
        );
        resolve(result);
      }, 300);
    });
  } catch (error) {
    console.warn("API 호출 실패, 기본 데이터 사용:", error);

    // API 호출 실패 시 기본 데이터로
    if (!searchTerm?.trim()) {
      return defaultGoodsData;
    }

    const lowerTerm = searchTerm.toLowerCase();
    return defaultGoodsData.filter((item) =>
      item.itemName.toLowerCase().includes(lowerTerm)
    );
  }
};

/**
 * 상품 상세 정보를 가져오는 함수
 * API 연동 실패 시 기본 데이터에서 검색
 */
// export const getGoodsDetail = async (
//   id: number
// ): Promise<GoodsItemProps | undefined> => {
//   try {
//     // 실제 API 구현이 완료되면 아래 주석을 해제
//     /*
//     const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
//     const response = await axios.get(`${API_BASE_URL}/goods/${id}`);

//     // 백엔드 응답 형식에 맞게 변환
//     return {
//       id: response.data.id,
//       title: response.data.title,
//       price: `${response.data.price.toLocaleString()}원`,
//       time: formatTimeAgo(new Date(response.data.createdAt)),
//       seller: response.data.sellerName,
//       imageUrl: response.data.imageUrl
//     };
//     */

//     // API 미구현 또는 테스트를 위한 모의 데이터 반환
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         const result = defaultGoodsData.find((item) => item.itemId === id);
//         resolve(result);
//       }, 300);
//     });
//   } catch (error) {
//     console.warn("API 호출 실패, 기본 데이터 사용:", error);

//     // API 호출 실패 시 기본 데이터에서 검색
//     return defaultGoodsData.find((item) => item.id === id);
//   }
// };

/**
 * 상품 등록 함수
 * @param data 등록할 상품 정보 (title, description, price, images)
 * @returns 등록된 상품 정보
 */
// export const registerGoods = async (
//   data: GoodsRegistrationData
// ): Promise<GoodsItemProps> => {
//   try {
//     // 실제 API 구현이 완료되면 아래 주석을 해제
//     /*
//     const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

//     // FormData 객체 생성
//     const apiFormData = new FormData();
//     apiFormData.append('title', data.title);
//     apiFormData.append('description', data.description);
//     apiFormData.append('price', data.price); // 가격은 백엔드에서 처리

//     // 이미지 파일 추가
//     data.images.forEach((image) => {
//       apiFormData.append(`images`, image);
//     });

//     // API 호출
//     const response = await axios.post(`${API_BASE_URL}/goods`, apiFormData, {
//       headers: {
//         'Content-Type': 'multipart/form-data',
//       },
//     });

//     // 응답 데이터 변환 및 반환
//     return {
//       id: response.data.id,
//       title: response.data.title,
//       price: `${parseInt(response.data.price).toLocaleString()}원`,
//       time: '방금 전',
//       seller: response.data.sellerName || '판매자',
//       imageUrl: response.data.images && response.data.images.length > 0
//         ? response.data.images[0]
//         : undefined
//     };
//     */

//     // 모의 데이터 반환 (API 연동 전)
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         // 임의의 ID 생성
//         const newId = Math.floor(Math.random() * 1000) + 8;

//         // 가격 포맷팅 - 만원 단위로 표시
//         // 67 -> 67만원, 100 -> 100만원
//         const formattedPrice = `${data.price}만원`;

//         // 등록된 상품 정보 생성
//         const newGoods: GoodsItemProps = {
//           id: newId,
//           title: data.title,
//           price: formattedPrice,
//           time: "방금 전",
//           seller: "현재 사용자", // 실제로는 로그인 사용자 정보 사용
//           imageUrl:
//             data.images.length > 0
//               ? URL.createObjectURL(data.images[0])
//               : undefined,
//         };

//         resolve(newGoods);
//       }, 800); // 지연시간 추가
//     });
//   } catch (error) {
//     console.error("상품 등록 API 오류:", error);
//     throw new Error("상품 등록에 실패했습니다.");
//   }
// };

// 백엔드 API 연동을 위한 유틸리티 함수
// export const formatTimeAgo = (date: Date): string => {
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffMin = Math.floor(diffMs / (1000 * 60));
//   const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
//   const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
//   const diffWeek = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
//   const diffMonth = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

//   if (diffMin < 1) {
//     return '방금 전';
//   } else if (diffMin < 60) {
//     return `${diffMin}분 전`;
//   } else if (diffHour < 24) {
//     return `${diffHour}시간 전`;
//   } else if (diffDay < 7) {
//     return `${diffDay}일 전`;
//   } else if (diffWeek < 4) {
//     return `${diffWeek}주 전`;
//   } else {
//     return `${diffMonth}개월 전`;
//   }
// };
