'use client';

import { RESEARCH_TOPICS, type ResearchTopicId } from '@/lib/constants/research-topics';
import { cn } from '@/lib/utils';

interface TopicBadgeProps {
  topicId: string;
  size?: 'sm' | 'md';
  active?: boolean;
  className?: string;
}

export function TopicBadge({ topicId, size = 'sm', active, className }: TopicBadgeProps) {
  const topic = RESEARCH_TOPICS.find((t) => t.id === topicId);
  if (!topic) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-all cursor-pointer',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-[12px]',
        !active && 'hover:shadow-sm',
        className,
      )}
      style={active ? {
        borderColor: topic.color,
        backgroundColor: topic.color,
        color: '#fff',
        fontWeight: 600,
        boxShadow: `0 1px 3px color-mix(in srgb, ${topic.color} 40%, transparent)`,
      } : {
        borderColor: `color-mix(in srgb, ${topic.color} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${topic.color} 10%, transparent)`,
        color: topic.color,
      }}
    >
      {topic.label}
    </span>
  );
}
