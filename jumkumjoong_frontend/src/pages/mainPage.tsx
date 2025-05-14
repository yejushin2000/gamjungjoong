import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/common/Header";
import NavigationBar from "../components/common/NavigationBar";
import { getUserInfo } from "../api/users";
import { getGoodsFavorites } from "../api/goods";

// 상태관리 임포트
import { useAuthStore, useWishItemStore } from "../stores/useUserStore";

import laptop from "../assets/icons/laptop.svg";
import keyboard from "../assets/icons/keyboard.svg";
import phone from "../assets/icons/phone.svg";
import tablet from "../assets/icons/tablet.svg";
// 썸네일 이미지 임포트
import thumbnail from "../assets/goods/thumbnail.png";
import thumbnail2 from "../assets/goods/thumbnail2.png";
import thumbnail3 from "../assets/goods/thumbnail3.png";
import thumbnail4 from "../assets/goods/thumbnail4.png";
import thumbnail5 from "../assets/goods/thumbnail5.png";

const categories = [
  { id: "laptop", label: "노트북", icon: laptop },
  { id: "keyboard", label: "키보드", icon: keyboard },
  { id: "phone", label: "휴대폰", icon: phone },
  { id: "tablet", label: "태블릿", icon: tablet },
];

const popularItems = [
  { img: thumbnail2, title: "갤북5(S)급 팝니다" },
  { img: thumbnail3, title: "맥북pro 팔아용" },
  { img: thumbnail4, title: "갤북4 싸게 팝니다" },
  { img: thumbnail5, title: "그램 14인치" },
];

const recentItems = [
  { img: thumbnail, title: "갤북5(S)급 팝니다" },
  { img: thumbnail2, title: "맥북pro 팔아용" },
  { img: thumbnail3, title: "갤북4 싸게 팝니다" },
  { img: thumbnail4, title: "그램 14인치" },
];

const MainPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const user = await getUserInfo();

      if (!user) {
        navigate("/login");
        return;
      }
      console.log("User: ", useAuthStore.getState());
      const wishItem = await getGoodsFavorites();
      useWishItemStore.getState().setItems(wishItem);
      console.log("Wish item: ", useWishItemStore.getState().items);
    };

    checkUser();
  }, [navigate]);

  const handleCategoryClick = (category: string) => {
    navigate("/goods/list", { state: category });
  };

  const renderItemGrid = (items: { img: string; title: string }[]) => (
    <div className="grid grid-cols-2 gap-4 px-3 mt-2">
      {items.map((item, idx) => (
        <div key={idx}>
          <img
            src={item.img}
            alt={`thumbnail-${idx}`}
            className="w-[200px] rounded-xl"
          />
          <p>{item.title}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto text-first">
      <Header title="LOGO" showBackButton={false} hideSearchButton={false} />

      <main className="font-semibold flex flex-col gap-4 mb-4 flex-1 overflow-y-auto">
        {/* 카테고리 */}
        <article className="px-4 py-2 text-first">
          <p className="text-center text-[20px] my-3">
            내가 찾는 중고 물품을 찾아보세요.
          </p>
          <div className="flex gap-4">
            {/* 각 카테고리 */}
            {categories.map(({ id, label, icon }) => (
              <div
                key={id}
                className="w-full h-fit bg-fourth px-2 rounded-lg cursor-pointer"
                onClick={() => handleCategoryClick(id)}
              >
                <img src={icon} alt={id} className="w-[96px]" />
                <p className="text-center pb-2">{label}</p>
              </div>
            ))}
          </div>
        </article>

        {/* 찜한 아이템 중 거래 중인 상품 */}
        <article>
          <p className="pl-10 text-[20px]">오늘 인기 아이템</p>
          {renderItemGrid(popularItems)}
        </article>

        {/* 최근 등록된 아이템 */}
        <article>
          <p className="pl-10 text-[20px]">방금 등록된 아이템</p>
          {renderItemGrid(recentItems)}
        </article>
      </main>

      {/* 하단 네비게이션 바 */}
      <NavigationBar />
    </div>
  );
};

export default MainPage;
