import { apiRequest } from "./api";
import { BlogPost, Issue, MunicipalityInfo } from "../types/community";

export function getMunicipalityByDistrict(district: string) {
  return apiRequest<MunicipalityInfo>(`/municipality/by-district?district=${encodeURIComponent(district)}`);
}

export function getApprovedBlogs(municipalityEmail?: string) {
  const query = municipalityEmail
    ? `?municipalityEmail=${encodeURIComponent(municipalityEmail)}`
    : "";
  return apiRequest<BlogPost[]>(`/blogs${query}`);
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

export function submitBlog(payload: {
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  municipalityEmail: string;
}) {
  return apiRequest<{ id: string; message: string }>("/blogs/submit", {
    method: "POST",
    body: payload
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
