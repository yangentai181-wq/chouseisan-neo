"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import type { ParticipantGroup } from "@/types";
import { getGroups, saveGroup, addMemberToGroup } from "@/lib/groups";

interface SaveToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
}

export function SaveToGroupModal({
  isOpen,
  onClose,
  memberName,
}: SaveToGroupModalProps) {
  const [groups, setGroups] = useState<ParticipantGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "create">("select");

  useEffect(() => {
    if (isOpen) {
      const loadedGroups = getGroups();
      setGroups(loadedGroups);
      setMode(loadedGroups.length === 0 ? "create" : "select");
      setSelectedGroupId(null);
      setNewGroupName("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setError(null);

    if (mode === "create") {
      if (!newGroupName.trim()) {
        setError("グループ名を入力してください");
        return;
      }

      // 新規グループ作成
      saveGroup({
        name: newGroupName.trim(),
        members: [memberName],
      });
    } else {
      if (!selectedGroupId) {
        setError("グループを選択してください");
        return;
      }

      // 既存グループに追加
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group?.members.includes(memberName)) {
        setError("この名前は既にグループに登録されています");
        return;
      }

      addMemberToGroup(selectedGroupId, memberName);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">グループに保存</h2>

        <p className="text-sm text-slate-600 mb-4">
          「<span className="font-medium text-slate-900">{memberName}</span>
          」をグループに保存します
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {groups.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode("select")}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  mode === "select"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                既存グループに追加
              </button>
              <button
                type="button"
                onClick={() => setMode("create")}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  mode === "create"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                新規グループ作成
              </button>
            </div>
          )}

          {mode === "select" && groups.length > 0 ? (
            <div className="space-y-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedGroupId === group.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="font-medium text-slate-900">{group.name}</p>
                  <p className="text-sm text-slate-500">
                    {group.members.length}人:{" "}
                    {group.members.slice(0, 3).join("、")}
                    {group.members.length > 3 &&
                      ` 他${group.members.length - 3}人`}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <Input
              label="新規グループ名"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="例: 開発チーム"
            />
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button type="button" onClick={handleSave} className="flex-1">
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
