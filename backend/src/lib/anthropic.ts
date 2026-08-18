import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

// Undefined when ANTHROPIC_API_KEY isn't set - callers must check anthropicConfigured
// before using this and fall back to a non-AI path. Constructing the client itself
// does not make a network call, so it's cheap to always instantiate when a key exists.
export const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export const anthropicConfigured = anthropic !== null;
