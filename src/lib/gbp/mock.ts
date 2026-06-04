import type { GbpReviewFromApi } from './oauth';

/**
 * Stable mock reviews matching the exact GbpReviewFromApi shape returned by fetchReviews().
 * Used when feature_flag_gbp_live = 'false' so every downstream path (sync, generate, post)
 * can be exercised without live Google API access.
 *
 * Covers: ratings 1 / 3 / 5, anonymous reviewer, long comment.
 */
export const MOCK_REVIEWS: GbpReviewFromApi[] = [
  {
    reviewId:   'mock-001',
    reviewer:   { displayName: 'Alice Thompson', isAnonymous: false },
    starRating: 'FIVE',
    comment:    'Absolutely loved the experience! The staff was incredibly welcoming and the service exceeded all expectations. Will definitely be back.',
    createTime: '2025-06-01T10:00:00Z',
  },
  {
    reviewId:   'mock-002',
    reviewer:   { displayName: 'Bob Martinez', isAnonymous: false },
    starRating: 'THREE',
    comment:    'Decent experience overall. Some things were great but the wait time was longer than expected. Room for improvement.',
    createTime: '2025-06-02T14:30:00Z',
  },
  {
    reviewId:   'mock-003',
    reviewer:   { displayName: 'Carol Singh', isAnonymous: false },
    starRating: 'ONE',
    comment:    'Very disappointed. The product did not match the description and customer support was unhelpful when I tried to resolve the issue.',
    createTime: '2025-06-03T09:15:00Z',
  },
  {
    reviewId:   'mock-004',
    reviewer:   { isAnonymous: true },
    starRating: 'FIVE',
    comment:    'Great place. Highly recommend.',
    createTime: '2025-06-04T18:45:00Z',
  },
  {
    reviewId:   'mock-005',
    reviewer:   { displayName: 'David Chen', isAnonymous: false },
    starRating: 'FOUR',
    comment:    'I have been a customer for over two years and I must say the quality has consistently been top-notch. The team goes above and beyond every single time. On my most recent visit the attention to detail was remarkable — from the moment I walked in to the moment I left, everything was seamless. I particularly appreciated how the staff remembered my preferences from previous visits. That personal touch really sets this place apart from competitors. The only minor thing I would mention is that parking can be a bit tricky during peak hours, but it is a small inconvenience compared to the overall experience. I have already recommended this business to several friends and colleagues and will continue to do so without hesitation.',
    createTime: '2025-06-05T11:20:00Z',
  },
];
