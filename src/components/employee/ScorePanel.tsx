import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import adminApiClient from '../../api/adminApiClient';
import type { AxiosError } from 'axios';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

/** One row in the score breakdown. */
export type BreakdownRow = {
  label: string;
  points: number;
  maxPoints: number;
};

/** Full score payload returned by GET /api/employee-profiles/:userId/score */
export type ScoreBreakdown = {
  total: number;
  breakdown: BreakdownRow[];
  lastComputedAt: string;
  lastComputeReason: string;
};

async function getEmployeeScore(userId: string): Promise<ScoreBreakdown> {
  const res = await adminApiClient.get<ApiEnvelope<ScoreBreakdown>>(
    `/employee-profiles/${userId}/score`,
  );
  return res.data.data;
}

async function manualRecompute(userId: string): Promise<ScoreBreakdown> {
  const res = await adminApiClient.post<ApiEnvelope<ScoreBreakdown>>(
    '/scores/compute',
    { userId },
  );
  return res.data.data;
}

function getErrorMessage(error: unknown) {
  return (
    (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ||
    'Something went wrong'
  );
}

function scoreColor(total: number) {
  if (total >= 80) return 'text-green-600';
  if (total >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function barColor(total: number) {
  if (total >= 80) return 'bg-green-600';
  if (total >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Displays the employee's JavaRista Score with a full breakdown table.
 * Polls every 30 seconds and exposes a manual Recompute button for admins.
 *
 * @param userId - The employee's user ID.
 */
export function ScorePanel({ userId }: { userId: string }) {
  const [data, setData] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getEmployeeScore(userId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void load();

    intervalRef.current = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [load]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const result = await manualRecompute(userId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRecomputing(false);
    }
  };

  const total = data?.total ?? 0;
  const colorClass = scoreColor(total);
  const barClass = barColor(total);

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      {/* ── Header row ── */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">JavaRista Score</p>
          {data && (
            <p className="mt-0.5 text-xs text-[#666]">
              Last updated{' '}
              {formatDistanceToNow(new Date(data.lastComputedAt), {
                addSuffix: true,
              })}
              {data.lastComputeReason
                ? ` · ${data.lastComputeReason.replace(/_/g, ' ')}`
                : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRecompute}
          disabled={recomputing || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            className={recomputing ? 'animate-spin' : ''}
          />
          Recompute
        </button>
      </div>

      {/* ── Score number ── */}
      {loading ? (
        <_SkeletonRows count={6} />
      ) : error ? (
        <_ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />
      ) : (
        <>
          <div className={`mb-5 text-5xl font-bold tabular-nums ${colorClass}`}>
            {total.toFixed(1)}
            <span className="ml-1 text-base font-normal text-[#555]">/ 100</span>
          </div>

          {/* ── Breakdown table ── */}
          {data && data.breakdown.length > 0 && (
            <div className="space-y-3">
              {data.breakdown.map((row) => {
                const pct =
                  row.maxPoints > 0
                    ? Math.round((row.points / row.maxPoints) * 100)
                    : 0;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm text-[#ccc]">{row.label}</span>
                      <span className="shrink-0 text-xs tabular-nums text-[#777]">
                        {row.points} pts{' '}
                        <span className="text-[#444]">/ {row.maxPoints}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                      <div
                        className={`h-full rounded-full transition-all ${barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function _SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-3/4 animate-pulse rounded bg-[#2A2A2A]" />
          <div className="h-1.5 animate-pulse rounded-full bg-[#2A2A2A]" />
        </div>
      ))}
    </div>
  );
}

function _ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4">
      <p className="text-sm text-red-300">Unable to load score: {message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-xs text-red-200 underline"
      >
        Retry
      </button>
    </div>
  );
}
