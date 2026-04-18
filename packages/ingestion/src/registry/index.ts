import type { Parser } from "../types/parser";

const registry = new Map<string, Parser>();

/**
 * Register a parser with the framework. Feature packages call this once at
 * app boot. Duplicate sourceType registrations throw to surface bugs early.
 */
export function registerParser(parser: Parser): void {
  if (registry.has(parser.sourceType)) {
    throw new Error(`Parser already registered for sourceType: ${parser.sourceType}`);
  }
  registry.set(parser.sourceType, parser);
}

export function getParser(sourceType: string): Parser | undefined {
  return registry.get(sourceType);
}

export function getAllParsers(): Parser[] {
  return Array.from(registry.values());
}

export function isRegistered(sourceType: string): boolean {
  return registry.has(sourceType);
}
