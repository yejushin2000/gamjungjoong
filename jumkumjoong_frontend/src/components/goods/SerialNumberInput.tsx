import React, { useState, useEffect } from "react";

interface SerialNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  id: string;
}

const SerialNumberInput: React.FC<SerialNumberInputProps> = ({
  value,
  onChange,
  name,
  id,
}) => {
  // 화면에 표시될 값값 (입력값)
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
      // onChange(inputValue === "" ? 0 : Number(inputValue));
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        id={id}
        name={name}
        value={displayValue || ""}
        onChange={(e) => onChange(e.target.value)}
        // onChange={handleChange}
        className="w-full p-2 pr-14 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="시리얼 번호를 입력하세요"
      />
    </div>
  );
};

export default SerialNumberInput;
