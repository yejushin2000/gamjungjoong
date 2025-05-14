// src/components/mypage/PriceSection.tsx
import React from 'react';

interface PriceSectionProps {
  price: number;
}

const PriceSection: React.FC<PriceSectionProps> = ({ price }) => {
  // 숫자 포맷팅 함수
  const formatPrice = (value: number) => {
    return Math.floor(value / 10000) + '만';
  };

  return (
    <div className="bg-white rounded-lg mt-4 p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-2xl font-bold">
            {formatPrice(price)}
          </div>
          <div className="ml-2 text-2xl">원</div>
        </div>
        <button className="bg-blue-500 text-white px-6 py-2 rounded-md">
          충전하기
        </button>
      </div>
    </div>
  );
};

export default PriceSection;