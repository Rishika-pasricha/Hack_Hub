export type MunicipalityInfo = {
  district: string;
  municipalityName: string;
  municipalityType: string;
  contactEmail: string;
  contactPhone: string;
};

export type BlogPost = {
  _id: string;
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  authorProfileImageUrl?: string;
  municipalityEmail: string;
  media?: Array<{
    mediaType: "image" | "video";
    mediaUrl: string;
  }>;
  likes?: string[];
  likesCount?: number;
  likedByCurrentUser?: boolean;
  sourceType: "user" | "municipality";
  status: "pending" | "approved" | "rejected";
  approvedAt?: string | null;
  createdAt: string;
};

export type Issue = {
  _id: string;
  subject: string;
  description: string;
  userName: string;
  userEmail: string;
  municipalityEmail: string;
  status: "open" | "resolved";
  createdAt: string;
  media?: Array<{
    mediaType: "image" | "video";
    mediaUrl: string;
  }>;
};

export type MunicipalityLeaderboardEntry = {
  municipalityName: string;
  district: string;
  contactEmail: string;
  totalIssues: number;
  resolvedIssues: number;
  openIssues: number;
  resolutionRate: string;
};

export type Product = {
  _id: string;
  productName: string;
  description?: string;
  price: number;
  productMedia?: Array<{
    mediaType: "image" | "video";
    mediaUrl: string;
  }>;
  // Legacy field for backward compatibility
  productImageUrl?: string;
  sellerName: string;
  sellerEmail: string;
  city: string;
  reportCount?: number;
  createdAt: string;
};

export type WastePrediction = {
  label: string;
  confidence: number;
  probabilities: Array<{
    label: string;
    score: number;
  }>;
};
