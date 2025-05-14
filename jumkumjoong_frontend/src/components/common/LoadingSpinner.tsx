export default function LoadingSpinner() {
  return (
    // 로딩 상태 표시
    <div className="flex justify-center items-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}
