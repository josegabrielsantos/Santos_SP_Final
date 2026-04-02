import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getPostTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    post: 'Article',
    research_paper: 'Research Paper',
    poll: 'Poll',
    announcement: 'Announcement',
    update: 'Update',
  };
  return labels[type] || type;
}
