import React, { useState, useEffect } from "react";

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  name: string;
  id: string;
}

const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  name,
  id,
}) => {
  // 화면에 표시될 숫자 (입력값)
  const [displayValue, setDisplayValue] = useState<string>(value.toString());

  // 입력값이 외부에서 변경될 경우 동기화
  useEffect(() => {
    setDisplayValue(value.toString());
  }, [value]);

  // 입력 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // 숫자만 허용 (빈 문자열 또는 숫자)
    if (inputValue === "" || /^[0-9]+$/.test(inputValue)) {
      setDisplayValue(inputValue);
      onChange(inputValue === "" ? 0 : Number(inputValue));
    }
  };

  // 가격 포맷팅 (천 단위 쉼표)
  // const formattedValue = displayValue
  //   ? Number(displayValue).toLocaleString("ko-KR")
  //   : "";

  return (
    <div className="relative flex items-baseline">
      <div className="flex">
        <input
          type="text"
          id={id}
          name={name}
          value={displayValue}
          onChange={handleChange}
          className="w-full h-fit p-2 pr-14 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="가격을 입력하세요"
        />
        <div className="w-full flex ml-2 items-center self-center pointer-events-none">
          <span className="text-gray-500">원</span>
        </div>
      </div>

      {/* 입력값이 있을 경우 원화 표시 */}
      {/* {displayValue && (
        <div className="mt-1 text-sm text-gray-500 w-full text-center">
          ≈ {formattedValue}0,000원
        </div>
      )} */}
    </div>
  );
};

export default PriceInput;
