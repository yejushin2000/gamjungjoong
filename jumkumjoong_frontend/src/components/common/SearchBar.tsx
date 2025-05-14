// src/components/common/SearchBar.tsx
import React, { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  onSearch, 
  onChange,
  placeholder = "검색",
  autoFocus = false
}) => {
  const [inputValue, setInputValue] = useState(searchTerm);
  const inputRef = useRef<HTMLInputElement>(null);

  // 자동 포커스 처리
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 입력값 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // 상위 컴포넌트의 onChange 함수가 있으면 호출
    if (onChange) {
      onChange(e);
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue);
    }
  };

  // 높이가 고정된 검색바 스타일링
  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full h-10"> {/* 높이 고정 (h-10 = 2.5rem = 40px) */}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          className="w-full h-full py-2 pl-10 pr-4 border rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button 
          type="submit" 
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default SearchBar;