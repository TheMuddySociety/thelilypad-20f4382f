import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BuybackProgramCollection {
  id: string;
  collection_id: string;
  added_at: string;
  reason: string | null;
  is_active: boolean;
}

export function useBuybackProgram(chain?: string) {
  const { data: programCollections, isLoading, refetch } = useQuery({
    queryKey: ['buyback-program-collections', chain],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyback_program_collections')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data as BuybackProgramCollection[];
    },
  });

  const isInProgram = (collectionId: string): boolean => {
    return programCollections?.some(p => p.collection_id === collectionId) || false;
  };

  const getProgramCollectionIds = (): Set<string> => {
    return new Set(programCollections?.map(p => p.collection_id) || []);
  };

  return {
    programCollections,
    isLoading,
    isInProgram,
    getProgramCollectionIds,
    refetch,
  };
}
