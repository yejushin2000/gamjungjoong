// src/components/mypage/ActionSection.tsx 수정
import React from 'react';
import { Link } from 'react-router-dom';

const ActionSection: React.FC = () => {
  // 액션 항목 정의
  const actions = [
    {
      id: 'transactions',
      icon: (
        <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
          <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      label: '거래 내역',
      path: '/transactions'  // 이 경로를 확인
    },
    {
      id: 'favorites',
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      ),
      label: '찜한 목록',
      path: '/favorites'
    },
    {
      id: 'posts',
      icon: (
        <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
      label: '내가 작성한 글',
      path: '/my-posts'
    }
  ];

  return (
    <div className="bg-white rounded-lg mt-4 p-4 mb-4">
      <div className="space-y-0">
        {actions.map(action => (
          <Link 
            key={action.id}
            to={action.path}
            className="flex items-center py-4 border-b border-gray-200 last:border-b-0"
          >
            <div className="mr-4">{action.icon}</div>
            <div className="text-lg font-medium">{action.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ActionSection;