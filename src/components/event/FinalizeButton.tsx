"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { Candidate } from "@/types";

interface FinalizeButtonProps {
  eventId: string;
  candidates: Candidate[];
  recommendedCandidateId?: string;
  isFinalized: boolean;
  finalizedCandidateId?: string | null;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAY_DATES = [
  "2000-01-02",
  "2000-01-03",
  "2000-01-04",
  "2000-01-05",
  "2000-01-06",
  "2000-01-07",
  "2000-01-08",
];

function formatCandidateShort(c: Candidate): string {
  if (WEEKDAY_DATES.includes(c.date)) {
    const dayIndex = WEEKDAY_DATES.indexOf(c.date);
    let result = `${WEEKDAYS[dayIndex]}曜日`;
    if (c.start_time) {
      result += ` ${c.start_time.slice(0, 5)}`;
      if (c.end_time) result += `〜${c.end_time.slice(0, 5)}`;
    }
    return result;
  }

  const date = new Date(c.date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  let result = `${month}/${day}(${weekday})`;
  if (c.start_time) {
    result += ` ${c.start_time.slice(0, 5)}`;
    if (c.end_time) result += `〜${c.end_time.slice(0, 5)}`;
  }
  return result;
}

export function FinalizeButton({
  eventId,
  candidates,
  recommendedCandidateId,
  isFinalized,
  finalizedCandidateId,
}: FinalizeButtonProps) {
  const router = useRouter();
  const [isHost, setIsHost] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    recommendedCandidateId || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hostToken = localStorage.getItem(`host_token_${eventId}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration
    setIsHost(!!hostToken);
  }, [eventId]);

  if (!isHost) return null;

  if (isFinalized && finalizedCandidateId) {
    const finalizedCandidate = candidates.find(
      (c) => c.id === finalizedCandidateId,
    );
    return (
      <div className="bg-primary/10 border border-primary rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          確定済み:{" "}
          {finalizedCandidate ? formatCandidateShort(finalizedCandidate) : ""}
        </p>
      </div>
    );
  }

  const handleFinalize = async () => {
    if (!selectedCandidateId) return;

    setLoading(true);
    setError(null);

    try {
      const hostToken = localStorage.getItem(`host_token_${eventId}`);
      const res = await fetch(`/api/events/${eventId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host_token: hostToken,
          candidate_id: selectedCandidateId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "確定に失敗しました");
      }

      setShowModal(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowModal(true)} variant="primary">
        日程を確定する
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">日程を確定</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-muted hover:text-foreground text-2xl leading-none"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <p className="text-sm text-muted mb-4">
                確定する日程を選択してください
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedCandidateId === candidate.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted"
                    }`}
                  >
                    <span className="font-medium">
                      {formatCandidateShort(candidate)}
                    </span>
                    {candidate.id === recommendedCandidateId && (
                      <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                        おすすめ
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleFinalize}
                  loading={loading}
                  disabled={!selectedCandidateId}
                  className="flex-1"
                >
                  確定する
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
