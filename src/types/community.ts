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
  municipalityEmail: string;
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
};

export type Product = {
  _id: string;
  productName: string;
  price: number;
  productImageUrl: string;
  sellerName: string;
  sellerEmail: string;
  city: string;
  createdAt: string;
};
