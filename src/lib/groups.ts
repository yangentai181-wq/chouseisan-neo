import type { ParticipantGroup } from "@/types";
import { nanoid } from "nanoid";

const GROUPS_KEY = "chouseisan_groups";

export function getGroups(): ParticipantGroup[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(GROUPS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveGroup(
  group: Omit<ParticipantGroup, "id" | "created_at" | "updated_at">,
): ParticipantGroup {
  const groups = getGroups();
  const now = new Date().toISOString();

  const newGroup: ParticipantGroup = {
    ...group,
    id: nanoid(10),
    created_at: now,
    updated_at: now,
  };

  groups.push(newGroup);
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));

  return newGroup;
}

export function updateGroup(
  id: string,
  updates: Partial<Omit<ParticipantGroup, "id" | "created_at" | "updated_at">>,
): ParticipantGroup | null {
  const groups = getGroups();
  const index = groups.findIndex((g) => g.id === id);

  if (index === -1) return null;

  groups[index] = {
    ...groups[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  return groups[index];
}

export function deleteGroup(id: string): boolean {
  const groups = getGroups();
  const filtered = groups.filter((g) => g.id !== id);

  if (filtered.length === groups.length) return false;

  localStorage.setItem(GROUPS_KEY, JSON.stringify(filtered));
  return true;
}

export function addMemberToGroup(groupId: string, memberName: string): boolean {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);

  if (!group) return false;
  if (group.members.includes(memberName)) return false;

  group.members.push(memberName);
  group.updated_at = new Date().toISOString();

  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  return true;
}

export function removeMemberFromGroup(
  groupId: string,
  memberName: string,
): boolean {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);

  if (!group) return false;

  const index = group.members.indexOf(memberName);
  if (index === -1) return false;

  group.members.splice(index, 1);
  group.updated_at = new Date().toISOString();

  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  return true;
}
