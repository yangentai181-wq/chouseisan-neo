"use client";

import { useState, useEffect } from "react";
import type { ParticipantGroup } from "@/types";
import { getGroups, deleteGroup } from "@/lib/groups";

interface GroupSelectorProps {
  currentName: string;
  onSelectMember: (name: string) => void;
  onSaveToGroup: () => void;
}

export function GroupSelector({
  currentName,
  onSelectMember,
  onSaveToGroup,
}: GroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState<ParticipantGroup[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    setGroups(getGroups());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("このグループを削除しますか？")) {
      deleteGroup(id);
      setGroups(getGroups());
    }
  };

  const handleSelectMember = (name: string) => {
    onSelectMember(name);
    setIsOpen(false);
    setExpandedGroup(null);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          グループから選ぶ
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {currentName.trim() && (
          <button
            type="button"
            onClick={onSaveToGroup}
            className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            グループに保存
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {groups.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              グループがありません。名前を入力後「グループに保存」で作成できます。
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="bg-slate-50 rounded-lg">
                <div
                  onClick={() =>
                    setExpandedGroup(
                      expandedGroup === group.id ? null : group.id,
                    )
                  }
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        expandedGroup === group.id ? "rotate-90" : ""
                      }`}
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
                    <span className="font-medium text-slate-900">
                      {group.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({group.members.length}人)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(group.id, e)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {expandedGroup === group.id && (
                  <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.members.map((member) => (
                      <button
                        key={member}
                        type="button"
                        onClick={() => handleSelectMember(member)}
                        className="text-left px-3 py-2 text-sm bg-white rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                      >
                        {member}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
