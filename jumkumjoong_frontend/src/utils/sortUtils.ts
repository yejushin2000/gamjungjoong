// src/utils/sortUtils.ts

import { GoodsItemProps } from "../components/goods/GoodsItem";

// 게시글 정렬: 최신순

const sortGoodsByDateDesc = (goods: GoodsItemProps[]): GoodsItemProps[] => {
  return [...goods].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export { sortGoodsByDateDesc };
