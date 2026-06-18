#!/usr/bin/env node
import { access } from 'node:fs/promises';

const required = [
  'dist/data/leads/news-leads.json',
  'dist/data/leads/discovered-leads.json',
];

for (const file of required) {
  try {
    await access(file);
    console.log(`ok: ${file}`);
  } catch {
    console.error(`missing after build: ${file}`);
    process.exit(1);
  }
}
