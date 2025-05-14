// src/utils/chatUtils.ts

// 현재 시간을 HH:MM 형식으로 반환
export const getCurrentTime = (): string => {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 랜덤 응답 메시지 생성 (목업용)
export const getRandomReply = (): string => {
  const replies = [
    "네고 조아요;;",
    "네네 최송합니다ㅠㅠㅠㅠ",
    "아직 판매 중입니다~",
    "지금 바로 거래 가능하신가요?",
    "위치가 어디신가요?",
    "감사합니다!",
    "가격 조정은 어렵습니다ㅠㅠ",
    "내일 만나서 거래할까요?",
    "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ",
  ];

  return replies[Math.floor(Math.random() * replies.length)];
};

// 디버깅용 로그
export const logMessage = (prefix: string, message: any): void => {
  console.log(`[${prefix}] ${JSON.stringify(message)}`);
};