"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

interface ManageLinkProps {
  eventId: string;
}

export function ManageLink({ eventId }: ManageLinkProps) {
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const hostToken = localStorage.getItem(`host_token_${eventId}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration
    setIsHost(!!hostToken);
  }, [eventId]);

  if (!isHost) return null;

  return (
    <Link href={`/e/${eventId}/manage`}>
      <Button variant="outline" size="sm">
        管理ページ
      </Button>
    </Link>
  );
}
