"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface ModeSwitchProps {
  eventId: string;
  isAdminMode: boolean;
  hasHostToken: boolean;
  onModeChange: (isAdmin: boolean) => void;
}

export function ModeSwitch({
  eventId,
  isAdminMode,
  hasHostToken,
  onModeChange,
}: ModeSwitchProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = () => {
    if (isAdminMode) {
      // Admin → Participant: 認証不要
      onModeChange(false);
    } else {
      // Participant → Admin
      if (hasHostToken) {
        // 既に認証済み
        onModeChange(true);
      } else {
        // PIN認証が必要
        setShowPinModal(true);
        setPin("");
        setPinError(null);
      }
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setPinError("4桁の数字を入力してください");
      return;
    }

    setLoading(true);
    setPinError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPinError(data.error || "認証に失敗しました");
        return;
      }

      const data = await res.json();
      localStorage.setItem(`host_token_${eventId}`, data.host_token);
      setShowPinModal(false);
      onModeChange(true);
    } catch {
      setPinError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* トグルスイッチ */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2"
      >
        <span
          className={`text-sm ${isAdminMode ? "text-admin-foreground" : "text-muted"}`}
        >
          管理者
        </span>
        <div
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isAdminMode ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <div
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            style={{
              transform: isAdminMode ? "translateX(22px)" : "translateX(2px)",
            }}
          />
        </div>
      </button>

      {/* PINモーダル */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card-bg rounded-xl shadow-xl border border-border p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-foreground mb-2 text-center">
              管理者モード
            </h2>
            <p className="text-muted mb-4 text-center text-sm">
              イベント作成時に設定したPINを入力してください
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              {pinError && (
                <div className="bg-red-50 border border-error text-error px-3 py-2 rounded-lg text-sm">
                  {pinError}
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4桁のPIN"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center text-2xl tracking-widest"
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button type="submit" loading={loading} className="flex-1">
                  認証
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
