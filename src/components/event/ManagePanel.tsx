"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { VotingGrid } from "@/components/voting";
import { ShareButtons } from "@/components/share";
import type { Candidate, VoteWithDetails } from "@/types";

interface Event {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  status: string;
  finalized_candidate_id: string | null;
  response_deadline: string | null;
}

interface ManagePanelProps {
  eventId: string;
  hostToken: string;
  isAdminMode?: boolean;
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

// 最多参加候補を計算
function findBestCandidate(
  candidates: Candidate[],
  votes: VoteWithDetails[],
): Candidate | null {
  if (candidates.length === 0) return null;

  let bestCandidate = candidates[0];
  let bestScore = -1;

  for (const candidate of candidates) {
    let score = 0;
    for (const vote of votes) {
      const detail = vote.vote_details.find(
        (d) => d.candidate_id === candidate.id,
      );
      if (detail?.availability === "available") score += 2;
      if (detail?.availability === "maybe") score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

export function ManagePanel({
  eventId,
  hostToken,
  isAdminMode = false,
}: ManagePanelProps) {
  // スタイルクラス
  const cardClass = isAdminMode
    ? "bg-admin-card-bg rounded-xl shadow-sm border border-admin-border p-6"
    : "bg-card-bg rounded-xl shadow-sm border border-border p-6";
  const textClass = isAdminMode ? "text-admin-foreground" : "text-foreground";
  const mutedClass = isAdminMode ? "text-admin-muted" : "text-muted";
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 確定モーダル
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // 管理URL
  const [manageUrlCopied, setManageUrlCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/manage`, {
        headers: { "x-host-token": hostToken },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("権限がありません");
        }
        throw new Error("データの取得に失敗しました");
      }

      const data = await res.json();
      setEvent(data.event);
      setCandidates(data.candidates);
      setVotes(data.votes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [eventId, hostToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching
    fetchData();
  }, [fetchData]);

  const recommendedCandidate = findBestCandidate(candidates, votes);

  const handleFinalize = async () => {
    if (!selectedCandidateId) return;

    setFinalizing(true);
    setFinalizeError(null);

    try {
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

      setShowFinalizeModal(false);
      router.refresh();
      fetchData();
    } catch (err) {
      setFinalizeError(
        err instanceof Error ? err.message : "エラーが発生しました",
      );
    } finally {
      setFinalizing(false);
    }
  };

  const handleCopyManageUrl = async () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const manageUrl = `${baseUrl}/e/${eventId}/manage?token=${hostToken}`;

    try {
      await navigator.clipboard.writeText(manageUrl);
      setManageUrlCopied(true);
      setTimeout(() => setManageUrlCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted">読み込み中...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg">
        {error || "イベントが見つかりません"}
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/e/${eventId}`;

  const finalizedCandidate = event.finalized_candidate_id
    ? candidates.find((c) => c.id === event.finalized_candidate_id)
    : null;

  return (
    <>
      <header className="mb-6">
        <h1 className={`text-2xl font-bold ${textClass} mb-2`}>
          {event.title}
        </h1>
        {event.description && <p className={mutedClass}>{event.description}</p>}
      </header>

      {/* 管理URLセクション */}
      <div className={`${cardClass} mb-6`}>
        <h2 className={`text-sm font-semibold ${textClass} mb-2`}>管理用URL</h2>
        <p className={`text-xs ${mutedClass} mb-3`}>
          このURLを使えば、他のデバイスやブラウザからでも管理操作ができます。大切に保管してください。
        </p>
        <Button onClick={handleCopyManageUrl} variant="outline" size="sm">
          {manageUrlCopied ? "コピーしました!" : "管理用URLをコピー"}
        </Button>
      </div>

      {/* 確定状態 */}
      {event.status === "finalized" && finalizedCandidate ? (
        <div className="bg-success/10 border border-success rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-success mb-2">確定日程</h2>
          <p className={`text-xl font-medium ${textClass}`}>
            {formatCandidateShort(finalizedCandidate)}
          </p>
        </div>
      ) : (
        <div className={`${cardClass} mb-6`}>
          <h2 className={`text-lg font-semibold ${textClass} mb-4`}>
            日程を確定
          </h2>
          {recommendedCandidate && (
            <p className={`text-sm ${mutedClass} mb-3`}>
              おすすめ: {formatCandidateShort(recommendedCandidate)}
            </p>
          )}
          <Button onClick={() => setShowFinalizeModal(true)} variant="primary">
            日程を確定する
          </Button>
        </div>
      )}

      {/* 回答一覧 */}
      <div className={`${cardClass} mb-6`}>
        <h2 className={`text-lg font-semibold ${textClass} mb-4`}>回答一覧</h2>
        <VotingGrid candidates={candidates} votes={votes} />
      </div>

      {/* 共有 */}
      <div className={cardClass}>
        <h2 className={`text-lg font-semibold ${textClass} mb-4`}>共有</h2>
        <ShareButtons
          url={shareUrl}
          title={event.title}
          candidates={candidates}
          responseDeadline={event.response_deadline}
          finalizedCandidate={finalizedCandidate}
          isAdminMode={isAdminMode}
        />
      </div>

      {/* 確定モーダル */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFinalizeModal(false)}
            aria-hidden="true"
          />

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">日程を確定</h2>
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="text-muted hover:text-foreground text-2xl leading-none"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>

              {finalizeError && (
                <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg mb-4">
                  {finalizeError}
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
                    {candidate.id === recommendedCandidate?.id && (
                      <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                        おすすめ
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowFinalizeModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleFinalize}
                  loading={finalizing}
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
