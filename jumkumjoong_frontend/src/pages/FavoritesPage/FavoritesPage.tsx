// src/pages/FavoritePage.tsx
import React, { useEffect, useState } from "react";
import Header from "../../components/common/Header";
import NavigationBar from "../../components/common/NavigationBar";
import GoodsItem from "../../components/goods/GoodsItem";
import { getGoodsFavorites } from "../../api/goods";
import { useAuthStore } from "../../stores/useUserStore";

const FavoritePage: React.FC = () => {
  const userInfo = useAuthStore();
  const [favoriteItems, setFavoriteItems] = useState<any>([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await getGoodsFavorites(); // ✅ 비동기 처리
        setFavoriteItems(data);
        console.log("찜한 상품 목록:", data);
      } catch (error) {
        console.log("찜 목록 로딩 실패:", error);
        setFavoriteItems([]); // 에러 시 비워주기
      }
    };

    fetchFavorites();
  }, []);

  return (
    <div className="text-first min-h-screen pb-16">
      {/* 기존 Header 컴포넌트 사용 */}
      <Header />

      {/* 찜한 목록 제목 */}
      <div className="px-4 pt-6 bg-white">
        <h1 className="text-2xl font-bold">
          {userInfo.nickname ?? "user"} 님의 찜한 목록
        </h1>
      </div>

      {/* 찜한 상품 목록 */}
      <ul className="divide-y divide-gray-200">
        {favoriteItems.length > 0 ? (
          [...favoriteItems]

            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((item, index) => (
              <GoodsItem key={`${item.itemId}-${index}`} {...item} />
            ))
        ) : (
          <p className="p-4 text-center text-first/50">찜한 상품이 없습니다.</p>
        )}
      </ul>

      {/* 여백 추가 */}
      <div className="h-16"></div>

      {/* 기존 NavigationBar 컴포넌트를 고정 위치로 사용 */}
      <div className="fixed bottom-0 left-0 w-full">
        <NavigationBar />
      </div>
    </div>
  );
};

export default FavoritePage;
