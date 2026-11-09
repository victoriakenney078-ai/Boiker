import type { Priority, TaskSource } from '../types';
import type { MessageKey } from './types';

export const PRIORITY_KEYS: Record<Priority, MessageKey> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
  critical: 'priority.critical',
};

export const SOURCE_KEYS: Record<TaskSource, MessageKey> = {
  manual: 'source.manual',
  ai: 'source.ai',
  telegram: 'source.telegram',
};
