import { create } from "zustand";

export interface ReviewState {
  content: string | null;
  stars: number | null;
  createdAt: string | null;
  // setContent: (content: string | null) => void;
  // setStars: (stars: number | null) => void;
  // setCreatedAt: (createdAt: string | null) => void;
}

export interface ReviewListState {
  content: ReviewState[] | [];
  setContent: (content: ReviewState[] | []) => void;
  addContent: (content: ReviewState) => void;
}

export const useReviewStore = create<ReviewListState>((set) => ({
  content: [],
  setContent: (content) => set({ content: content }),
  addContent: (content) =>
    set((state) => ({
      content: [...state.content, content], // 기존 items에 새 item 추가
    })),
}));
