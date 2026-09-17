// types for business reviews (general reviews about the business, not specific products)
export interface BusinessReview {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  approved: boolean;
}
