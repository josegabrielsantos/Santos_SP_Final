// ─── Shared TypeScript interfaces matching backend models ────────

export interface UserSummary {
  _id: string;
  displayName: string;
  avatar?: string | null;
}

export interface UserDetail extends UserSummary {
  email: string;
  bio?: string | null;
  expertise?: string[];
  certifications?: string[];
  role: 'user' | 'website_admin';
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

// ─── Poll ────────────────────────────────────────────────────────

export interface PollOption {
  optionId: string;
  text: string;
  voteCount: number;
  voterIds: string[];
}

export interface Poll {
  question: string;
  isMultiple: boolean;
  options: PollOption[];
  totalVotes: number;
  closesAt?: string | null;
  isClosed?: boolean;
}

// ─── Post ────────────────────────────────────────────────────────

export type PostType = 'post' | 'announcement' | 'poll' | 'research_paper' | 'update';
export type PostStatus = 'draft' | 'pending' | 'published' | 'hidden';

export interface Post {
  _id: string;
  title: string;
  body: unknown; // TipTap JSON
  bodyText: string;
  tags: string[];
  authorId: UserSummary;
  organizationId?: OrgSummary | null;
  status: PostStatus;
  likeCount: number;
  commentCount: number;
  likedBy: string[];
  dislikedBy: string[];
  mediaUrls: string[];
  paperIds: string[];
  poll?: Poll | null;
  paperMetadata?: PaperMetadataInput | null;
  hotScore?: number;
  type: PostType;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  pages: number;
}

export interface CreatePostPayload {
  title: string;
  body?: unknown;
  bodyText?: string;
  tags?: string[];
  organizationId?: string | null;
  type?: PostType;
  status?: PostStatus;
  mediaUrls?: string[];
  paperIds?: string[];
  paperMetadata?: PaperMetadataInput | null;
  poll?: {
    question: string;
    isMultiple: boolean;
    options: { optionId: string; text: string }[];
    closesAt?: string | null;
  } | null;
}

// ─── Organization ────────────────────────────────────────────────

export interface OrgSummary {
  _id: string;
  name: string;
  slug: string;
  avatar?: string | null;
}

export interface Organization extends OrgSummary {
  description?: string | null;
  bannerImage?: string | null;
  welcomeMessage?: string | null;
  ownerId: UserSummary;
  adminIds: UserSummary[];
  memberIds: UserSummary[];
  pendingMemberIds?: UserSummary[];
  followerIds: string[];
  isActive: boolean;
  postCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrgListItem {
  _id: string;
  name: string;
  slug: string;
  avatar?: string | null;
  description?: string | null;
  memberCount: number;
  postCount: number;
}

export interface OrgsResponse {
  organizations: OrgListItem[];
  total: number;
  page: number;
  pages: number;
}

export interface OrgMembersResponse {
  owner: UserSummary;
  admins: UserSummary[];
  members: UserSummary[];
  pendingMembers?: UserSummary[];
  followers: UserSummary[];
  followerCount: number;
}

// ─── Comment ─────────────────────────────────────────────────────

export interface Comment {
  _id: string;
  postId: string;
  authorId: UserSummary;
  parentId?: string | null;
  body: string;
  replyToUser?: string | null;
  likedBy: string[];
  dislikedBy: string[];
  likeCount: number;
  isHidden: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export interface RepliesResponse {
  replies: Comment[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

// ─── Upload ──────────────────────────────────────────────────────

export interface UploadResponse {
  url: string;
  key: string;
  size: number;
}

// ─── Paper Metadata (from PDF parsing) ──────────────────────────

export interface PaperMetadata {
  title: string;
  authors: string[];
  abstract: string | null;
  keywords: string[];
  year: number | null;
  journal: string | null;
  doi: string | null;
  pageCount?: number | null;
}

// ─── Paper Metadata (user-provided for research_paper) ──────────

export interface PaperMetadataInput {
  researchTitle?: string | null;
  datePublished?: string | null;
  journal?: string | null;
  doi?: string | null;
  isbn?: string | null;
  authors: string[];
  abstract?: string | null;
}

// ─── Paper (standalone research paper) ──────────────────────────

export interface Paper {
  _id: string;
  title: string;
  authors: string[];
  abstract: string | null;
  keywords: string[];
  doi: string | null;
  isbn?: string | null;
  publicationDate?: string | null;
  year: number | null;
  journal: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  uploadedBy: UserSummary;
  organizationId?: OrgSummary | null;
  sourcePostId?: string | null;
  isPublished: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PapersResponse {
  papers: Paper[];
  total: number;
  page: number;
  pages: number;
}

export interface PaperSearchHit {
  _id: string;
  score: number;
  title: string;
  abstract?: string;
  keywords?: string[];
  authors?: string[];
  journal?: string;
  year?: number;
  doi?: string;
  fileUrl?: string;
  downloadCount?: number;
  createdAt?: string;
  highlight: Record<string, string[]>;
}

export interface PaperSearchResponse {
  papers: {
    total: number;
    hits: PaperSearchHit[];
  };
}

// ─── Notification ────────────────────────────────────────────────

export interface NotificationSender {
  _id: string;
  displayName: string;
  avatar?: string | null;
}

export interface NotificationPost {
  _id: string;
  title: string;
}

export interface Notification {
  _id: string;
  recipientId: string;
  senderId: NotificationSender;
  type: 'reply' | 'comment' | 'like' | 'mention' | 'join_request' | 'join_approved' | 'join_rejected' | 'post_approved' | 'post_rejected' | 'announcement';
  postId?: NotificationPost | null;
  commentId?: string | null;
  organizationId?: { _id: string; name: string; slug: string } | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}
