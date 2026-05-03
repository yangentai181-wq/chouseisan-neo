"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ShareMessageEditor } from "./ShareMessageEditor";
import { getLineShareUrl } from "@/lib/share/line";
import type { Candidate } from "@/types";

interface ShareButtonsProps {
  url: string;
  title: string;
  candidates?: Candidate[];
}

export function ShareButtons({
  url,
  title,
  candidates = [],
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLineShare = () => {
    const lineUrl = getLineShareUrl(url, `【日程調整】${title}`);
    window.open(lineUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleLineShare}
          variant="primary"
          className="bg-[#06C755] hover:bg-[#05a648]"
        >
          LINEで共有
        </Button>
        {candidates.length > 0 && (
          <Button onClick={() => setShowEditor(true)} variant="outline">
            文面を編集
          </Button>
        )}
        <Button onClick={handleCopyLink} variant="outline">
          {copied ? "コピーしました!" : "リンクをコピー"}
        </Button>
      </div>

      {showEditor && (
        <ShareMessageEditor
          url={url}
          title={title}
          candidates={candidates}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
