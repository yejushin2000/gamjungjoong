// src/pages/goodsPage/goodsListPage.tsx
import React, { useState, useEffect } from "react";
import GoodsItem, { GoodsItemProps } from "../../components/goods/GoodsItem";
import Header from "../../components/common/Header";
import NavigationBar from "../../components/common/NavigationBar";
import FloatingActionButton from "../../components/common/FloatingActionButton";
import SearchBar from "../../components/common/SearchBar";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getGoodsSearch } from "../../api/goods";
import { useLocation } from "react-router-dom";

const GoodsListPage: React.FC = () => {
  const location = useLocation();
  const item = location.state;
  // 상품 데이터 상태
  const [goods, setGoods] = useState<GoodsItemProps[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  useEffect(() => {
    let searchItem = "";
    if (item === "laptop") {
      setSearchTerm("노트북");
      searchItem = "노트북";
    } else if (item === "keyboard") {
      setSearchTerm("키보드");
      searchItem = "키보드";
    } else if (item === "phone") {
      setSearchTerm("폰");
      searchItem = "폰";
    } else if (item === "tablet") {
      setSearchTerm("태블릿");
      searchItem = "태블릿";
    } else {
      setSearchTerm(item);
      searchItem = item;
    }
    // 상품 데이터 로딩 함수
    const fetchGoods = async (searchItem: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // 서비스 함수를 통해 데이터 로드 (현재는 모의 데이터, 향후 API 연동 예정)
        console.log("searchTerm: ", searchItem);
        const data = await getGoodsSearch(searchItem);
        console.log("data: ", data);
        if (data === null) {
          console.log("상품 목록 비어있음");
          setGoods([]);
        } else {
          setGoods(data);
        }
      } catch (err) {
        console.log("상품 로딩 오류:", err);
        setError("상품을 불러오는 중 오류가 발생했습니다.");
        setGoods([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGoods(searchItem);
  }, [item, searchTerm]);

  // 검색 실행 함수
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setIsSearchVisible(false); // 검색 완료 후 검색창 숨기기
  };

  // 검색 버튼 클릭 처리
  const handleSearchButtonClick = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchTerm(""); // 검색창 닫을 때 검색어 초기화
    }
  };

  // 플러스 아이콘 SVG
  const plusIcon = (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
    </svg>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 통일된 헤더 사용 */}
      <Header
        showBackButton={false}
        title="LOGO"
        onSearch={handleSearchButtonClick}
      />

      {/* 검색 바 (검색 모드일 때만 표시) */}
      {isSearchVisible && (
        <div className="bg-white p-4 border-b">
          <SearchBar
            searchTerm={searchTerm}
            onSearch={handleSearch}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="상품 검색"
            autoFocus={true}
          />
        </div>
      )}

      {/* 상품 목록 - 안드로이드 네비게이션 바를 고려하여 여백 제거 */}
      <main className="flex-1 overflow-y-auto pb-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          // 오류 상태 표시
          <div className="p-4 text-center text-red-500">
            <p>{error}</p>
            <button
              // onClick={() => fetchGoods(searchTerm)}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              다시 시도
            </button>
          </div>
        ) : (
          // 상품 목록 표시 - 마지막 아이템에 패딩 추가하여 하단 네비게이션 바와 겹치지 않게 함
          <ul className="divide-y divide-gray-200">
            {goods.length > 0 ? (
              [...goods]
                // goods
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((item, index) => (
                  // goods.map((item, index) => (
                  <GoodsItem
                    key={item.itemId}
                    createdAt={item.createdAt}
                    itemId={item.itemId}
                    itemName={item.itemName}
                    itemPrice={item.itemPrice}
                    itemStatus={item.itemStatus}
                    // canChangeStatus={true}
                  />
                ))
            ) : (
              <li className="p-4 text-center text-gray-500">
                {searchTerm
                  ? "등록된 상품이 없습니다."
                  : "등록된 상품이 없습니다."}
              </li>
            )}
            {/* 네비게이션 바 높이만큼의 여백 추가 */}
            <li className="h-14 bg-transparent border-none"></li>
          </ul>
        )}
      </main>

      {/* 플로팅 액션 버튼 (상품 등록) */}
      <FloatingActionButton to="/goods/register" icon={plusIcon} />

      {/* 하단 네비게이션 바 */}
      {/* <div className="fixed bottom-0 left-0 right-0 z-10"> */}
      <NavigationBar />
      {/* </div> */}
    </div>
  );
};

export default GoodsListPage;
