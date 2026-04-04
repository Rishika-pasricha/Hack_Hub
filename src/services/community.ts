import { apiRequest } from "./api";
import {
  BlogPost,
  Issue,
  MunicipalityInfo,
  Product,
  MunicipalityLeaderboardEntry,
  WastePrediction
} from "../types/community";

export function getMunicipalityByArea(area: string) {
  return apiRequest<MunicipalityInfo>(`/municipality/by-area?area=${encodeURIComponent(area)}`);
}

export function predictWaste(imageDataUrl: string) {
  return apiRequest<WastePrediction>("/waste/predict", {
    method: "POST",
    body: { imageDataUrl }
  });
}

export function getApprovedBlogs(municipalityEmail?: string, userEmail?: string) {
  const params = new URLSearchParams();
  if (municipalityEmail) {
    params.set("municipalityEmail", municipalityEmail);
  }
  if (userEmail) {
    params.set("userEmail", userEmail);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<BlogPost[]>(`/blogs${query}`);
}

export function toggleBlogLike(blogId: string, userEmail: string) {
  return apiRequest<{ liked: boolean; likesCount: number; message: string }>(`/blogs/${blogId}/like`, {
    method: "PATCH",
    body: { userEmail }
  });
}

export function submitIssue(payload: {
  subject: string;
  description: string;
  userName: string;
  userEmail: string;
  municipalityEmail: string;
  media?: Array<{
    mediaType: "image" | "video";
    mediaUrl: string;
  }>;
}) {
  return apiRequest<{ id: string; message: string }>("/issues/submit", {
    method: "POST",
    body: payload
  });
}

export function getMyIssues(userEmail: string) {
  return apiRequest<Issue[]>(`/issues/my?userEmail=${encodeURIComponent(userEmail)}`);
}

export function resolveMyIssue(issueId: string, userEmail: string) {
  return apiRequest<{ message: string }>(`/issues/${issueId}/resolve`, {
    method: "PATCH",
    body: { userEmail }
  });
}

export function submitBlog(payload: {
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  municipalityEmail: string;
  media?: Array<{
    mediaType: "image" | "video";
    mediaUrl: string;
  }>;
}) {
  return apiRequest<{ id: string; message: string }>("/blogs/submit", {
    method: "POST",
    body: payload
  });
}

export function getMyBlogs(authorEmail: string) {
  return apiRequest<BlogPost[]>(`/blogs/my?authorEmail=${encodeURIComponent(authorEmail)}`);
}

export function updateMyBlog(
  blogId: string,
  payload: {
    authorEmail: string;
    title: string;
    content: string;
  }
) {
  return apiRequest<{ message: string }>(`/blogs/${blogId}`, {
    method: "PATCH",
    body: payload
  });
}

export function deleteMyBlog(blogId: string, authorEmail: string) {
  return apiRequest<{ message: string }>(`/blogs/${blogId}`, {
    method: "DELETE",
    body: { authorEmail }
  });
}

export function getLikeNotifications(userEmail: string) {
  return apiRequest<
    Array<{
      id: string;
      type: "post_like" | "product_reported" | "product_removed";
      postId?: string;
      postTitle?: string;
      productId?: string;
      productName?: string;
      message: string;
      createdAt: string;
    }>
  >(`/notifications/likes?userEmail=${encodeURIComponent(userEmail)}`);
}

export function reportProduct(
  productId: string,
  reporterEmail: string,
  reason: "spam" | "fake" | "offensive" | "scam"
) {
  return apiRequest<{ message: string; removed?: boolean; reportCount?: number }>(`/products/${productId}/report`, {
    method: "POST",
    body: { reporterEmail, reason }
  });
}

export function getPendingBlogsForAdmin(municipalityEmail: string) {
  return apiRequest<BlogPost[]>(
    `/admin/pending-blogs?municipalityEmail=${encodeURIComponent(municipalityEmail)}`
  );
}

export function approveBlogForAdmin(blogId: string, municipalityEmail: string) {
  return apiRequest<{ message: string }>(`/admin/blogs/${blogId}/approve`, {
    method: "PATCH",
    body: { municipalityEmail }
  });
}

export function getIssuesForAdmin(municipalityEmail: string) {
  return apiRequest<Issue[]>(`/admin/issues?municipalityEmail=${encodeURIComponent(municipalityEmail)}`);
}

export function notifyIssueCompletion(issueId: string, municipalityEmail: string, adminName: string) {
  return apiRequest<{ message: string; emailSent: boolean }>(`/admin/issues/${issueId}/request-completion`, {
    method: "POST",
    body: { municipalityEmail, adminName }
  });
}

export function getIssueCompletionNotifications(userEmail: string) {
  return apiRequest<Array<{
    issueId: string;
    issueSubject: string;
    municipalityName: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>>(`/notifications/issue-completion?userEmail=${encodeURIComponent(userEmail)}`);
}

export function markIssueNotificationAsRead(issueId: string, userEmail: string) {
  return apiRequest<{ message: string }>(`/notifications/issue-completion/${issueId}/read`, {
    method: "PATCH",
    body: { userEmail }
  });
}

export function getProducts() {
  return apiRequest<Product[]>("/products");
}

export function getMyProducts(sellerEmail: string) {
  const normalizedEmail = sellerEmail.trim().toLowerCase();
  return apiRequest<Product[]>(`/products/my?sellerEmail=${encodeURIComponent(normalizedEmail)}`)
    .catch(async () => {
      // Backward-compatible fallback for backends that do not expose /products/my.
      const allProducts = await getProducts();
      return allProducts.filter((product) => product.sellerEmail?.toLowerCase() === normalizedEmail);
    });
}

export function submitProduct(payload: {
  productName: string;
  description?: string;
  price: number;
  productMedia: Array<{
    mediaType: "image" | "video";
    mediaUrl: string;
  }>;
  sellerName: string;
  sellerEmail: string;
  city: string;
}) {
  return apiRequest<{ id: string; message: string }>("/products/submit", {
    method: "POST",
    body: payload
  });
}

export function updateProduct(
  productId: string,
  payload: {
    sellerEmail: string;
    productName: string;
    description?: string;
    price: number;
    city: string;
    productMedia?: Array<{
      mediaType: "image" | "video";
      mediaUrl: string;
    }>;
  }
) {
  return apiRequest<{ message: string }>(`/products/${productId}`, {
    method: "PATCH",
    body: payload
  });
}

export function deleteProduct(productId: string, sellerEmail: string) {
  return apiRequest<{ message: string }>(`/products/${productId}`, {
    method: "DELETE",
    body: { sellerEmail }
  });
}

export function getMunicipalityLeaderboard() {
  return apiRequest<MunicipalityLeaderboardEntry[]>("/issues/leaderboard");
}

export function getMunicipalityActivityMetrics(municipalityEmail: string) {
  return apiRequest<{
    municipalityName: string;
    district: string;
    totalIssues: number;
    resolvedIssues: number;
    openIssues: number;
    resolvedThisMonth: number;
    avgResolutionTime: number;
    activeCitizensCount: number;
    approvedBlogsThisMonth: number;
    blogsSubmittedThisMonth: number;
    productsListedThisMonth: number;
    issuesSubmittedThisMonth: number;
    repeatReporterRate: number;
    avgIssuesPerCitizen: number;
    issueMediaAdoptionRate: number;
    videoEvidenceRate: number;
    peakReportingHour: number;
    peakReportingDay: string;
    weekOverWeekIssueTrend: number;
    weeklyIssueTrend: Array<{
      date: string;
      count: number;
    }>;
    issueWeekdayDistribution: Array<{
      day: string;
      count: number;
    }>;
    topIssueContributors: Array<{
      userEmail: string;
      userName: string;
      issueCount: number;
      lastSubmittedAt: string;
    }>;
  }>(`/municipality/activity-analytics?municipalityEmail=${encodeURIComponent(municipalityEmail)}`);
}
