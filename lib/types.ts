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
}

// ─── Post ────────────────────────────────────────────────────────

export type PostType = 'post' | 'announcement' | 'poll' | 'paper_share' | 'update';
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
  mediaUrls: string[];
  paperIds: string[];
  poll?: Poll | null;
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
  followerCount: number;
}

// ─── Comment ─────────────────────────────────────────────────────

export interface Comment {
  _id: string;
  postId: string;
  authorId: UserSummary;
  parentId?: string | null;
  body: string;
  likedBy: string[];
  likeCount: number;
  isHidden: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  comments: Comment[];
  nextCursor: string | null;
}

export interface RepliesResponse {
  replies: Comment[];
  nextCursor: string | null;
}

// ─── Upload ──────────────────────────────────────────────────────

export interface UploadResponse {
  url: string;
  key: string;
  size: number;
}
