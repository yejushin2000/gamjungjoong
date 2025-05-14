// utils/dateFormatter.ts
export function formatRelativeTime(dateString: string): string {
  // const date = new Date(dateString);
  const now = new Date();
  // console.log("지금 시간: ", now);
  // console.log("작성 시간: ", date);
  const utcDate = new Date(dateString);
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  const kstDate = new Date(utcDate.getTime() + kstOffset);
  const diffMs = now.getTime() - kstDate.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (seconds < 60) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return "어제";
  return `${days}일 전`;
}

export const formatDateManually = (isoString: string): any => {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // 0부터 시작
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return {
    date: `${year}년 ${month}월 ${day}일`,
    time: `${hour}:${minute}:${second}`,
  };
};
