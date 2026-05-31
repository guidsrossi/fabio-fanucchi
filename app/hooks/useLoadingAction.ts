'use client';

import { useRef, useState } from 'react';

export function useLoadingAction() {
  const actionRunningRef = useRef(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  async function runWithLoading(message: string, action: () => Promise<void>) {
    if (actionRunningRef.current) return;

    actionRunningRef.current = true;
    setLoadingMessage(message);

    try {
      await action();
    } finally {
      actionRunningRef.current = false;
      setLoadingMessage('');
    }
  }

  return {
    loading: Boolean(loadingMessage),
    loadingMessage,
    runWithLoading,
  };
}
