"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { VotingGrid } from "./VotingGrid";
import { TimeBlockVoting } from "./TimeBlockVoting";
import { PreferenceVoting } from "./PreferenceVoting";
import { GroupSelector, SaveToGroupModal } from "@/components/group";
import type {
  Candidate,
  VoteWithDetails,
  Availability,
  EventMode,
} from "@/types";

interface VotingFormProps {
  eventId: string;
  candidates: Candidate[];
  votes: VoteWithDetails[];
  mode: EventMode;
  durationMinutes?: number | null;
}

const availabilityOrder: Availability[] = ["unavailable", "available", "maybe"];

function getNextAvailability(current: Availability): Availability {
  const index = availabilityOrder.indexOf(current);
  return availabilityOrder[(index + 1) % availabilityOrder.length];
}

interface InitialState {
  votes: Record<string, Availability>;
  preferences: Record<string, number | null>;
}

function getInitialState(
  candidates: Candidate[],
  votes: VoteWithDetails[],
  participantToken: string | null,
  mode: EventMode,
): InitialState {
  // モードによるデフォルト値
  // meeting: 空き（available）がデフォルト、来れない時間を入力
  // event/regular: 不参加（unavailable）がデフォルト、参加可能を入力
  const defaultValue: Availability =
    mode === "meeting" ? "available" : "unavailable";

  // 既存の投票を復元
  if (participantToken) {
    const existingVote = votes.find(
      (v) => v.participant_token === participantToken,
    );
    if (existingVote) {
      const restoredVotes: Record<string, Availability> = {};
      const restoredPrefs: Record<string, number | null> = {};
      existingVote.vote_details.forEach((d) => {
        // 無効なIDをスキップ
        if (
          !d.candidate_id ||
          d.candidate_id === "undefined" ||
          d.candidate_id === "null"
        )
          return;
        restoredVotes[d.candidate_id] = d.availability;
        restoredPrefs[d.candidate_id] = d.preference ?? null;
      });
      // 全候補日を含める
      candidates.forEach((c) => {
        // 無効なIDをスキップ
        if (!c.id || c.id === "undefined" || c.id === "null") return;
        if (!(c.id in restoredVotes)) {
          restoredVotes[c.id] = defaultValue;
          restoredPrefs[c.id] = null;
        }
      });
      return { votes: restoredVotes, preferences: restoredPrefs };
    }
  }

  // 初期値
  const initialVotes: Record<string, Availability> = {};
  const initialPrefs: Record<string, number | null> = {};
  candidates.forEach((c) => {
    // 無効なIDをスキップ
    if (!c.id || c.id === "undefined" || c.id === "null") return;
    initialVotes[c.id] = defaultValue;
    initialPrefs[c.id] = null;
  });
  return { votes: initialVotes, preferences: initialPrefs };
}

function getStoredValues(eventId: string): {
  token: string | null;
  name: string;
} {
  if (typeof window === "undefined") {
    return { token: null, name: "" };
  }
  const token = localStorage.getItem(`participant_token_${eventId}`);
  const name = localStorage.getItem(`participant_name_${eventId}`) || "";
  return { token, name };
}

export function VotingForm({
  eventId,
  candidates,
  votes,
  mode,
}: VotingFormProps) {
  const router = useRouter();

  // localStorage の値を初期値として取得
  const stored = useMemo(() => getStoredValues(eventId), [eventId]);

  const [name, setName] = useState(stored.name);
  const [participantToken] = useState<string | null>(stored.token);
  const initialState = useMemo(
    () => getInitialState(candidates, votes, stored.token, mode),
    [candidates, votes, stored.token, mode],
  );
  const [currentVotes, setCurrentVotes] = useState<
    Record<string, Availability>
  >(initialState.votes);
  const [currentPreferences, setCurrentPreferences] = useState<
    Record<string, number | null>
  >(initialState.preferences);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveToGroup, setShowSaveToGroup] = useState(false);

  const handleCellClick = (candidateId: string) => {
    setCurrentVotes((prev) => ({
      ...prev,
      [candidateId]: getNextAvailability(prev[candidateId] || "unavailable"),
    }));
  };

  const handleVoteChange = (
    candidateId: string,
    availability: Availability,
  ) => {
    setCurrentVotes((prev) => ({
      ...prev,
      [candidateId]: availability,
    }));
  };

  const handlePreferenceChange = (
    candidateId: string,
    availability: Availability,
    preference: number | null,
  ) => {
    setCurrentVotes((prev) => ({
      ...prev,
      [candidateId]: availability,
    }));
    setCurrentPreferences((prev) => ({
      ...prev,
      [candidateId]: preference,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }

    setLoading(true);

    try {
      const voteData = Object.entries(currentVotes)
        .filter(
          ([candidate_id]) =>
            candidate_id &&
            candidate_id !== "undefined" &&
            candidate_id !== "null",
        )
        .map(([candidate_id, availability]) => ({
          candidate_id,
          availability,
          preference: currentPreferences[candidate_id] ?? null,
        }));

      const res = await fetch(`/api/events/${eventId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_name: name.trim(),
          participant_token: participantToken ?? undefined,
          votes: voteData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "投票に失敗しました");
      }

      const data = await res.json();

      // トークンを保存
      localStorage.setItem(
        `participant_token_${eventId}`,
        data.participant_token,
      );
      localStorage.setItem(`participant_name_${eventId}`, name.trim());

      // 投票完了画面へ遷移
      router.push(`/e/${eventId}/complete`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {mode === "meeting" ? (
        <TimeBlockVoting
          candidates={candidates}
          currentVotes={currentVotes}
          onVoteChange={handleVoteChange}
        />
      ) : mode === "regular" ? (
        <PreferenceVoting
          candidates={candidates}
          currentVotes={currentVotes}
          currentPreferences={currentPreferences}
          onVoteChange={handlePreferenceChange}
        />
      ) : (
        <>
          <VotingGrid
            candidates={candidates}
            votes={votes}
            currentVotes={currentVotes}
            onCellClick={handleCellClick}
            isEditing={true}
          />
          <div className="text-sm text-muted">
            <p>○ = 参加可能 / △ = 微妙 / × = 参加不可</p>
            <p>セルをクリックして切り替えてください</p>
          </div>
        </>
      )}

      <div className="space-y-2">
        {!participantToken && (
          <GroupSelector
            currentName={name}
            onSelectMember={(selectedName) => setName(selectedName)}
            onSaveToGroup={() => setShowSaveToGroup(true)}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <Input
              label="お名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前を入力"
              required
              maxLength={50}
              disabled={!!participantToken}
            />
          </div>
          <Button type="submit" loading={loading}>
            {participantToken ? "投票を更新" : "投票する"}
          </Button>
        </div>
      </div>

      <SaveToGroupModal
        isOpen={showSaveToGroup}
        onClose={() => setShowSaveToGroup(false)}
        memberName={name.trim()}
      />
    </form>
  );
}
