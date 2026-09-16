export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchAPI<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }
  return res.json();
}

// ── Posts ──
export interface Post {
  id: number;
  title: string;
  keywords: string[];
  draft_text: string;
  enhanced_text?: string;
  clean_html?: string;
  status: "draft" | "reviewing" | "scheduled" | "published";
  seo_score?: number;
  ai_detection_score?: number;
  style_profile_id?: number;
  created_at: string;
  updated_at: string;
}

export function getPosts() {
  return fetchAPI<Post[]>("/api/posts/");
}

export function getPost(id: number) {
  return fetchAPI<Post>(`/api/posts/${id}`);
}

export function createPost(data: {
  title: string;
  keywords: string[];
  draft_text: string;
}) {
  return fetchAPI<Post>("/api/posts/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePost(id: number, data: Partial<Post>) {
  return fetchAPI<Post>(`/api/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deletePost(id: number) {
  return fetchAPI(`/api/posts/${id}`, { method: "DELETE" });
}

// ── Clean ──
export interface CleanResult {
  cleaned_text: string;
  removed_count: number;
}

export interface ScanResult {
  is_clean: boolean;
  total_hidden: number;
  positions: Array<{ index: number; char_code: string }>;
}

export function cleanText(text: string, isHtml = false) {
  return fetchAPI<CleanResult>("/api/clean/", {
    method: "POST",
    body: JSON.stringify({ text, is_html: isHtml }),
  });
}

export function scanText(text: string) {
  return fetchAPI<ScanResult>("/api/clean/scan", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// ── Style ──
export interface StyleProfile {
  id: number;
  name: string;
  category?: string;
  style_summary?: string;
  is_active: boolean;
  created_at: string;
}

export function getStyleProfiles() {
  return fetchAPI<StyleProfile[]>("/api/style/profiles");
}

export function getCategories() {
  return fetchAPI<string[]>("/api/style/categories");
}

export function analyzeUrl(blogUrl: string, category: string) {
  return fetchAPI<StyleProfile>("/api/style/analyze-url", {
    method: "POST",
    body: JSON.stringify({ blog_url: blogUrl, category }),
  });
}

export function analyzeText(sampleTexts: string[], category: string) {
  return fetchAPI<StyleProfile>("/api/style/analyze-text", {
    method: "POST",
    body: JSON.stringify({ sample_texts: sampleTexts, category }),
  });
}

export function toggleStyleProfile(id: number) {
  return fetchAPI<{ id: number; is_active: boolean }>(`/api/style/profiles/${id}`, {
    method: "PATCH",
  });
}

export function deleteStyleProfile(id: number) {
  return fetchAPI(`/api/style/profiles/${id}`, { method: "DELETE" });
}

// ── AI ──
export interface EnhanceResult {
  enhanced_text: string;
  ai_detection_score: number;
}

export interface DetectResult {
  score: number;
  label: string;
}

export function enhancePost(postId: number, category?: string) {
  return fetchAPI<EnhanceResult>("/api/ai/enhance", {
    method: "POST",
    body: JSON.stringify({
      post_id: postId,
      category,
    }),
  });
}

export function detectAI(text: string) {
  return fetchAPI<DetectResult>("/api/ai/detect", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function suggestTitles(keywords: string[]) {
  return fetchAPI<{ titles: string[] }>("/api/ai/suggest-titles", {
    method: "POST",
    body: JSON.stringify({ keywords }),
  });
}

// ── Places ──
export interface Place {
  id?: number;
  name: string;
  address: string;
  phone?: string;
  category?: string;
  rating?: number;
  open_hours?: string;
  image_url?: string;
}

export function searchPlaces(query: string) {
  return fetchAPI<Place[]>("/api/places/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function savePlace(place: Omit<Place, "id">) {
  return fetchAPI<Place>("/api/places/save", {
    method: "POST",
    body: JSON.stringify(place),
  });
}

// ── Sponsorship ──
export interface Sponsorship {
  id: number;
  company_name: string;
  blog_url?: string | null;
  start_date: string;
  deadline: string;
  memo?: string | null;
  status: "pending" | "in_progress" | "completed";
  notified: number;
  created_at: string;
}

export function getSponsorships() {
  return fetchAPI<Sponsorship[]>("/api/sponsorship/");
}

export function createSponsorship(data: {
  company_name: string;
  blog_url?: string;
  start_date: string;
  deadline: string;
  memo?: string;
}) {
  return fetchAPI<Sponsorship>("/api/sponsorship/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSponsorship(id: number, data: Partial<Sponsorship>) {
  return fetchAPI<Sponsorship>(`/api/sponsorship/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteSponsorship(id: number) {
  return fetchAPI(`/api/sponsorship/${id}`, { method: "DELETE" });
}

// ── Schedule ──
export interface ScheduleEvent {
  id: number;
  title: string;
  start_date: string;
  end_date?: string | null;
  memo?: string | null;
  notify: boolean;
  created_at: string;
}

export function getSchedules() {
  return fetchAPI<ScheduleEvent[]>("/api/schedule/");
}

export function createSchedule(data: {
  title: string;
  start_date: string;
  end_date?: string;
  memo?: string;
  notify: boolean;
}) {
  return fetchAPI<ScheduleEvent>("/api/schedule/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSchedule(id: number, data: Partial<ScheduleEvent>) {
  return fetchAPI<ScheduleEvent>(`/api/schedule/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteSchedule(id: number) {
  return fetchAPI(`/api/schedule/${id}`, { method: "DELETE" });
}

// ── Examples & Learning ──
export interface ExampleStats {
  sentence_examples: number;
  paragraph_examples: number;
  total_corrections: number;
  approved_corrections: number;
}

export interface CorrectionItem {
  id: number;
  post_id: number | null;
  has_diff: boolean;
  approved: boolean;
  category: string;
  created_at: string;
}

export function getExampleStats() {
  return fetchAPI<ExampleStats>("/api/examples/stats");
}

export function extractExamplesFromUrl(blogUrl: string, category: string, maxPosts = 10) {
  return fetchAPI<{ posts_processed: number; sentences_extracted: number; paragraphs_extracted: number }>(
    "/api/examples/extract-url",
    {
      method: "POST",
      body: JSON.stringify({ blog_url: blogUrl, category, max_posts: maxPosts }),
    }
  );
}

export function extractExamplesFromText(text: string, category: string) {
  return fetchAPI<{ sentences: number; paragraphs: number }>(
    "/api/examples/extract-text",
    {
      method: "POST",
      body: JSON.stringify({ text, category }),
    }
  );
}

export function approveCorrection(postId: number, userFinal: string, category = "") {
  return fetchAPI<{ ok: boolean; correction: { id: number; has_changes: boolean; style_update_needed: boolean } }>(
    "/api/ai/approve",
    {
      method: "POST",
      body: JSON.stringify({ post_id: postId, user_final: userFinal, category }),
    }
  );
}

export function updateStyleJson() {
  return fetchAPI<{ updated: boolean; corrections_used?: number; reason?: string }>(
    "/api/examples/update-style",
    { method: "POST" }
  );
}

export function getCorrections(limit = 20) {
  return fetchAPI<CorrectionItem[]>(`/api/examples/corrections?limit=${limit}`);
}

// ── Photo Post ──
export interface PhotoPostScene {
  scene_id: number;
  category: string;
  summary: string;
  photo_count: number;
}

export interface PhotoPostPhoto {
  id: number;
  order: number;
  filename: string;
  url: string;
  description: string;
  scene_id: number | null;
  scene_category: string;
}

export interface PhotoPostDetail {
  id: number;
  title: string | null;
  keywords: string | null;
  category: string | null;
  client_request: string | null;
  status: string;
  photo_count: number;
  draft_content: string | null;
  user_final: string | null;
  scenes: PhotoPostScene[];
  photos: PhotoPostPhoto[];
  created_at: string;
}

export interface PhotoPostListItem {
  id: number;
  title: string;
  category: string;
  status: string;
  photo_count: number;
  created_at: string;
}

export async function uploadPhotos(
  files: File[],
  category = "",
  clientRequest = "",
  keywords = "",
) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  if (category) formData.append("category", category);
  if (clientRequest) formData.append("client_request", clientRequest);
  if (keywords) formData.append("keywords", keywords);

  const res = await fetch(`${API_URL}/api/photo-post/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<{ photo_post_id: number; uploaded: number }>;
}

export function analyzePhotos(photoPostId: number, category = "", clientRequest = "") {
  return fetchAPI<{
    photo_post_id: number;
    total_photos: number;
    total_scenes: number;
    scenes: PhotoPostScene[];
  }>("/api/photo-post/analyze", {
    method: "POST",
    body: JSON.stringify({ photo_post_id: photoPostId, category, client_request: clientRequest }),
  });
}

export function generatePhotoDraft(photoPostId: number, keywords = "") {
  return fetchAPI<{ photo_post_id: number; title: string; body: string }>(
    "/api/photo-post/generate",
    {
      method: "POST",
      body: JSON.stringify({ photo_post_id: photoPostId, keywords }),
    },
  );
}

export function approvePhotoDraft(photoPostId: number, userFinal: string, category = "") {
  return fetchAPI<{ ok: boolean; correction: { id: number; has_changes: boolean; style_update_needed: boolean } }>(
    "/api/photo-post/approve",
    {
      method: "POST",
      body: JSON.stringify({ photo_post_id: photoPostId, user_final: userFinal, category }),
    },
  );
}

export function getPhotoPost(id: number) {
  return fetchAPI<PhotoPostDetail>(`/api/photo-post/${id}`);
}

export function getPhotoPosts() {
  return fetchAPI<PhotoPostListItem[]>("/api/photo-post/");
}
