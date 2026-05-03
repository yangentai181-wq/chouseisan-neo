import { nanoid } from "nanoid";

// Event ID: 10 characters (shorter for URLs)
export function generateEventId(): string {
  return nanoid(10);
}

// Token: 21 characters (default, more secure)
export function generateToken(): string {
  return nanoid(21);
}

// Primary key for database records
export function generateId(): string {
  return nanoid();
}
