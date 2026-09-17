// types for product reviews
export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  approved: boolean;
}
