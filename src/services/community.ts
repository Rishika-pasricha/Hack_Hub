import { apiRequest } from "./api";
import { BlogPost, Issue, MunicipalityInfo, Product } from "../types/community";

export function getMunicipalityByArea(area: string) {
  return apiRequest<MunicipalityInfo>(`/municipality/by-area?area=${encodeURIComponent(area)}`);
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
      likerEmail: string;
      likerName: string;
      postId: string;
      postTitle: string;
      message: string;
      createdAt: string;
    }>
  >(`/notifications/likes?userEmail=${encodeURIComponent(userEmail)}`);
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

export function getProducts() {
  return apiRequest<Product[]>("/products");
}

export function getMyProducts(sellerEmail: string) {
  return apiRequest<Product[]>(`/products/my?sellerEmail=${encodeURIComponent(sellerEmail)}`);
}

export function submitProduct(payload: {
  productName: string;
  description?: string;
  price: number;
  productImageUrl: string;
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
    productImageUrl?: string;
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
