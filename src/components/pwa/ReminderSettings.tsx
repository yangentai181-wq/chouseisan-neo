"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";

interface ReminderSettingsProps {
  eventId: string;
  eventTitle: string;
}

type ReminderTiming = "1h" | "1d" | "3d";

const REMINDER_OPTIONS: { value: ReminderTiming; label: string }[] = [
  { value: "1h", label: "1時間前" },
  { value: "1d", label: "1日前" },
  { value: "3d", label: "3日前" },
];

export function ReminderSettings({
  eventId,
  eventTitle,
}: ReminderSettingsProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedTiming, setSelectedTiming] = useState<ReminderTiming>("1d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Check if already subscribed
      const subscribed = localStorage.getItem(`reminder_${eventId}`);
      if (subscribed) {
        setIsSubscribed(true);
        setSelectedTiming(subscribed as ReminderTiming);
      }
    }
  }, [eventId]);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  };

  const subscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request permission if not granted
      if (permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setError("通知の許可が必要です");
          return;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      const response = await fetch("/api/reminders/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          subscription: subscription.toJSON(),
          timing: selectedTiming,
        }),
      });

      if (!response.ok) {
        throw new Error("登録に失敗しました");
      }

      // Save to localStorage
      localStorage.setItem(`reminder_${eventId}`, selectedTiming);
      setIsSubscribed(true);
    } catch (err) {
      console.error("Subscription error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Remove from server
      await fetch("/api/reminders/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      // Remove from localStorage
      localStorage.removeItem(`reminder_${eventId}`);
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span className="text-sm font-medium text-slate-700">
          リマインダー通知
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-3">
          {error}
        </div>
      )}

      {permission === "denied" ? (
        <p className="text-sm text-slate-500">
          通知がブロックされています。ブラウザの設定から許可してください。
        </p>
      ) : isSubscribed ? (
        <div className="space-y-3">
          <p className="text-sm text-teal-600">
            {REMINDER_OPTIONS.find((o) => o.value === selectedTiming)?.label}
            に通知します
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={unsubscribe}
            loading={loading}
          >
            通知を解除
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            日程が確定したときに通知を受け取れます
          </p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedTiming(option.value)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedTiming === option.value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={subscribe}
            loading={loading}
          >
            通知を有効にする
          </Button>
        </div>
      )}
    </div>
  );
}
