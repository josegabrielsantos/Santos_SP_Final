import { TOPIC_KEYWORD_MAP } from '@/lib/constants/topic-keyword-map';
import type { ResearchTopicId } from '@/lib/constants/research-topics';

export function classifyTopics(
  keywords: string[],
  title?: string,
  abstract?: string,
): ResearchTopicId[] {
  const textToSearch = [
    ...keywords.map((k) => k.toLowerCase()),
    ...(title ? [title.toLowerCase()] : []),
    ...(abstract ? [abstract.toLowerCase()] : []),
  ].join(' ');

  const matched: ResearchTopicId[] = [];

  for (const [topicId, triggerKeywords] of Object.entries(TOPIC_KEYWORD_MAP)) {
    const hits = triggerKeywords.filter((kw) =>
      textToSearch.includes(kw.toLowerCase()),
    );
    const threshold = hits.some((h) => h.split(' ').length > 2) ? 1 : 2;
    if (hits.length >= threshold) {
      matched.push(topicId as ResearchTopicId);
    }
  }

  return matched;
}
