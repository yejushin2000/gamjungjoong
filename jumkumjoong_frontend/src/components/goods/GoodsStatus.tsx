// src/components/goods/GoodsStatus.tsx
import React from 'react';

interface GoodsStatusProps {
  frontScratch: number;
  frontPan: number;
  backScratch: number;
  backPan: number;
  sideScratch: number;
  sidePan: number;
  // 추가된 속성
  side1Scratch?: number;
  side1Pan?: number;
  side2Scratch?: number;
  side2Pan?: number;
  keyboardScratch?: number;
  keyboardPan?: number;
  screenScratch?: number;
  screenPan?: number;
}

const GoodsStatus: React.FC<GoodsStatusProps> = ({
  frontScratch,
  frontPan,
  backScratch,
  backPan,
  sideScratch,
  sidePan,
  // 추가된 속성에 기본값 할당
  side1Scratch = 0,
  side1Pan = 0,
  side2Scratch = 0,
  side2Pan = 0,
  keyboardScratch = 0,
  keyboardPan = 0,
  screenScratch = 0,
  screenPan = 0
}) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">상품 상태</h2>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* 전면부 상태 */}
        <div className="border rounded-lg p-3">
          <h3 className="font-medium border-b pb-2 mb-2">전면부</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">스크래치:</span>
              <span>{frontScratch}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">파손:</span>
              <span>{frontPan}개</span>
            </div>
          </div>
        </div>
        
        {/* 화면 상태 (추가) */}
        <div className="border rounded-lg p-3">
          <h3 className="font-medium border-b pb-2 mb-2">화면</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">스크래치:</span>
              <span>{screenScratch}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">파손:</span>
              <span>{screenPan}개</span>
            </div>
          </div>
        </div>
        
        {/* 키보드 상태 (추가) */}
        <div className="border rounded-lg p-3">
          <h3 className="font-medium border-b pb-2 mb-2">키보드</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">스크래치:</span>
              <span>{keyboardScratch}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">파손:</span>
              <span>{keyboardPan}개</span>
            </div>
          </div>
        </div>
        
        {/* 후면 상태 */}
        <div className="border rounded-lg p-3">
          <h3 className="font-medium border-b pb-2 mb-2">후면</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">스크래치:</span>
              <span>{backScratch}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">파손:</span>
              <span>{backPan}개</span>
            </div>
          </div>
        </div>
        
        {/* 측면1 상태 (왼쪽) */}
        <div className="border rounded-lg p-3">
          <h3 className="font-medium border-b pb-2 mb-2">측면1(왼쪽)</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">스크래치:</span>
              <span>{side1Scratch}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">파손:</span>
              <span>{side1Pan}개</span>
            </div>
          </div>
        </div>
        
        {/* 측면2 상태 (오른쪽) */}
        <div className="border rounded-lg p-3">
          <h3 className="font-medium border-b pb-2 mb-2">측면2(오른쪽)</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">스크래치:</span>
              <span>{side2Scratch}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">파손:</span>
              <span>{side2Pan}개</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoodsStatus;