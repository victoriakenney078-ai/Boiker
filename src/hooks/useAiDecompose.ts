import { useCallback, useState } from 'react';
import type { AiDecompositionDraft } from '../types';
import { decomposeEpic } from '../services/ai';
import { tStatic } from '../i18n';
import { useAppData } from './useAppData';

export function useAiDecompose() {
  const { users } = useAppData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiDecompositionDraft | null>(null);

  const run = useCallback(
    async (params: {
      epicTitle: string;
      epicDescription: string;
      knowledgeDocIds: string[];
    }) => {
      setError(null);
      setLoading(true);
      try {
        const result = await decomposeEpic({ ...params, users });
        setDraft(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : tStatic('ai.errorGeneric');
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [users],
  );

  return { loading, error, draft, setDraft, run };
}
