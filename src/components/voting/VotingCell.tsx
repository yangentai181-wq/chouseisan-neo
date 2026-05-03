"use client";

import type { Availability } from "@/types";

interface VotingCellProps {
  availability: Availability;
  onClick: () => void;
  disabled?: boolean;
}

const symbols: Record<Availability, string> = {
  available: "○",
  maybe: "△",
  unavailable: "×",
};

export function VotingCell({
  availability,
  onClick,
  disabled = false,
}: VotingCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="vote-cell"
      data-availability={availability}
    >
      {symbols[availability]}
    </button>
  );
}
