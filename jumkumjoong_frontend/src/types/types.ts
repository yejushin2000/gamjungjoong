export interface ItemRegistParams {
  title: string;
  description: string;
  price: number;
  purchaseDate: string;
  grades: boolean;
  status: boolean;
  configuration: number; // 구성품 0: 풀박 / 1: 일부 / 2: 단품
  scratchesStatus: string;
  createdAt: string;
  serialNumber: string;
}

export interface ItemEditParams extends ItemRegistParams {
  itemId: number;
}

export interface ItemsParams {
  userId: number;
  title: string;
  description: string;
  price: number;
  purchaseDate: string;
  grades: boolean;
  status: boolean;
  configuration: number;
  createdAt: string;
  scratchesStatus: string;
}
