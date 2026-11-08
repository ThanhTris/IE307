/**
 * GM-07 — API contracts, DTO interfaces, error envelopes, and client specifications barrel export.
 * Spec: docs/architecture/API_CONTRACT.md
 * Database parity: supabase/migrations/0001_core_schema.sql
 * Dictionary parity: docs/data/FOOD_DATA_DICTIONARY.md
 * Contract version: food-v1/roadmap-v2/GM-07.1
 */
export * from './contracts/common';
export * from './contracts/auth';
export * from './contracts/discovery';
export * from './contracts/rooms';
export * from './contracts/voting';
export * from './contracts/socialAndHistory';
export * from './contracts/apiClient';
