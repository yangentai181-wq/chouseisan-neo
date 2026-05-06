"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface Participant {
  id: string;
  participant_name: string;
  participant_token: string;
}

interface EventLandingClientProps {
  eventId: string;
  participants: Participant[];
}

export function EventLandingClient({
  eventId,
  participants,
}: EventLandingClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectParticipant = (participant: Participant) => {
    // participant_token を localStorage に保存
    localStorage.setItem(
      `participant_token_${eventId}`,
      participant.participant_token,
    );
    localStorage.setItem(
      `participant_name_${eventId}`,
      participant.participant_name,
    );

    // 投票ページへ遷移
    router.push(`/e/${eventId}/vote`);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  // 投票者がいない場合は表示しない
  if (participants.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        className="w-full"
      >
        回答を編集する
      </Button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                誰の回答を編集しますか？
              </h2>

              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {participants.map((participant) => (
                  <li key={participant.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectParticipant(participant)}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium">
                        {participant.participant_name}さん
                      </span>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="w-full"
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
