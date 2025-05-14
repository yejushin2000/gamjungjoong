// src/components/mypage/ProfileSection.tsx
import React from "react";

interface ProfileSectionProps {
  username: string;
  rating: number;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  username,
  rating,
}) => {
  return (
    <div className="bg-white rounded-lg mt-4 p-4">
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold">{username}</div>
        <div className="flex items-center">
          <svg
            className="w-6 h-6 text-blue-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="ml-1 text-lg font-bold">{rating.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
