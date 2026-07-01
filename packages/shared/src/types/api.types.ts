// API yanıt sarmalayıcıları
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Sayfalı liste
export interface Paginated<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
}
