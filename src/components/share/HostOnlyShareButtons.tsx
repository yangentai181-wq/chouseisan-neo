"use client";

import { useEffect, useState } from "react";
import { ShareButtons } from "./ShareButtons";
import type { Candidate } from "@/types";

interface HostOnlyShareButtonsProps {
  eventId: string;
  url: string;
  title: string;
  candidates: Candidate[];
  responseDeadline?: string | null;
  finalizedCandidate?: Candidate | null;
}

export function HostOnlyShareButtons({
  eventId,
  url,
  title,
  candidates,
  responseDeadline,
  finalizedCandidate,
}: HostOnlyShareButtonsProps) {
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const hostToken = localStorage.getItem(`host_token_${eventId}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration
    setIsHost(!!hostToken);
  }, [eventId]);

  if (!isHost) return null;

  return (
    <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6">
      <h2 className="text-lg font-semibold mb-4">共有</h2>
      <ShareButtons
        url={url}
        title={title}
        candidates={candidates}
        responseDeadline={responseDeadline}
        finalizedCandidate={finalizedCandidate}
      />
    </div>
  );
}
