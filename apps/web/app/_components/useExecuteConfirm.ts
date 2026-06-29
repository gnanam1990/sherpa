'use client';


/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export const CONFIRM_POLL_DELAYS_MS = [1000, 2000, 3000, 5000] as const;
const LONG_WAIT_MS = 30_000;
const TIMEOUT_MS = 60_000;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ExecuteConfirmStatus =
  | 'idle'
  | 'confirming'
  | 'long_wait'
  | 'success'
  | 'failure'
  | 'timeout';

export type ExecuteConfirmState = {
  status: ExecuteConfirmStatus;
  message: string;
  auditLogId?: number;
  txHash?: string;
  errorDetail?: string;
};

type ConfirmPollResponse = {
  ok?: boolean;
  status?: 'pending' | 'success' | 'failed';
  txHash?: string;
  error?: string;
  error_detail?: string;
};

type UseExecuteConfirmOptions = {
  fetcher?: Fetcher;
};

const idleState: ExecuteConfirmState = { status: 'idle', message: '' };

export function formatConfirmMessage(elapsedMs: number) {
  return elapsedMs >= LONG_WAIT_MS ? 'Still waiting... (longer than usual)' : 'Confirming...';
}

function delayForAttempt(attempt: number) {
  return CONFIRM_POLL_DELAYS_MS[Math.min(attempt, CONFIRM_POLL_DELAYS_MS.length - 1)] ?? 5000;
}

export function useExecuteConfirm(options: UseExecuteConfirmOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const [state, setState] = useState<ExecuteConfirmState>(idleState);
  const attemptRef = useRef(0);
  const startedAtRef = useRef(0);
  const runRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const reset = useCallback(() => {
    runRef.current += 1;
    clearTimer();
    attemptRef.current = 0;
    startedAtRef.current = 0;
    setState(idleState);
  }, [clearTimer]);

  const schedulePoll = useCallback(
    (auditLogId: number, runId: number) => {
      const elapsedMs = Date.now() - startedAtRef.current;
      const remainingMs = TIMEOUT_MS - elapsedMs;
      const delay = Math.min(delayForAttempt(attemptRef.current), Math.max(0, remainingMs));
      attemptRef.current += 1;
      timerRef.current = setTimeout(() => {
        void (async () => {
          if (runRef.current !== runId) return;
          const elapsedMs = Date.now() - startedAtRef.current;
          if (elapsedMs >= TIMEOUT_MS) {
            setState({
              auditLogId,
              errorDetail: 'TIMEOUT',
              message: 'Refresh to check status',
              status: 'timeout',
            });
            return;
          }

          setState((current) => ({
            ...current,
            auditLogId,
            message: formatConfirmMessage(elapsedMs),
            status: elapsedMs >= LONG_WAIT_MS ? 'long_wait' : 'confirming',
          }));

          let body: ConfirmPollResponse | undefined;
          try {
            const response = await fetcher(`/api/execute/${auditLogId}/confirm`, { method: 'GET' });
            body = (await response.json()) as ConfirmPollResponse;
            if (runRef.current !== runId) return;
            if (!response.ok) {
              setState({
                auditLogId,
                errorDetail: body.error_detail ?? body.error ?? `HTTP_${response.status}`,
                message: 'Confirmation failed',
                status: 'failure',
              });
              return;
            }
          } catch (err) {
            setState({
              auditLogId,
              errorDetail: err instanceof Error ? err.message : String(err),
              message: 'Confirmation failed',
              status: 'failure',
            });
            return;
          }
          if (runRef.current !== runId) return;

          if (body.status === 'success' || body.txHash) {
            setState({
              auditLogId,
              message: 'Confirmed',
              status: 'success',
              txHash: body.txHash,
            });
            return;
          }

          if (body.status === 'failed' || body.ok === false) {
            setState({
              auditLogId,
              errorDetail: body.error_detail ?? body.error ?? 'Transaction failed',
              message: 'Confirmation failed',
              status: 'failure',
            });
            return;
          }

          schedulePoll(auditLogId, runId);
        })();
      }, delay);
    },
    [fetcher],
  );

  const start = useCallback(
    (auditLogId: number) => {
      runRef.current += 1;
      const runId = runRef.current;
      clearTimer();
      attemptRef.current = 0;
      startedAtRef.current = Date.now();
      setState({ auditLogId, message: 'Confirming...', status: 'confirming' });
      schedulePoll(auditLogId, runId);
    },
    [clearTimer, schedulePoll],
  );

  useEffect(() => reset, [reset]);

  return { ...state, reset, start };
}
