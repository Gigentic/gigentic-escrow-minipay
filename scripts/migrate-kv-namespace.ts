#!/usr/bin/env tsx
/**
 * KV Namespace Migration Script
 *
 * Migrates KV entries from environment-prefixed to non-prefixed format:
 * FROM: dev:celoSepolia:deliverable:0xABC123
 * TO:   celoSepolia:deliverable:0xABC123
 *
 * FROM: dev:profile:0xABC123
 * TO:   profile:0xABC123
 *
 * Usage:
 *   npx tsx scripts/migrate-kv-namespace.ts
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --env=dev    Specify environment prefix to remove (default: dev)
 */

import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') });

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{
    oldKey: string;
    newKey: string;
    status: 'success' | 'skipped' | 'error';
    reason?: string;
  }>;
}

async function migrateKVNamespace(options: { dryRun?: boolean; env?: string } = {}): Promise<MigrationResult> {
  const { dryRun = false, env = 'dev' } = options;

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         KV Namespace Migration Script                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied\n');
  }

  // Initialize Redis client
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env.local');
  }

  console.log('✓ Connected to Upstash Redis\n');

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  // All patterns to scan for - entries with environment prefix
  const patterns = [
    // Chain-specific patterns
    `${env}:celoSepolia:deliverable:*`,
    `${env}:celoSepolia:resolution:*`,
    `${env}:celoSepolia:dispute:*`,
    `${env}:celo:deliverable:*`,
    `${env}:celo:resolution:*`,
    `${env}:celo:dispute:*`,
    `${env}:hardhat:deliverable:*`,
    `${env}:hardhat:resolution:*`,
    `${env}:hardhat:dispute:*`,
    // Global profile pattern
    `${env}:profile:*`,
  ];

  console.log('📋 Scanning for KV entries...\n');

  for (const pattern of patterns) {
    console.log(`\n🔎 Pattern: ${pattern}`);

    let cursor: string | number = 0;
    let batchCount = 0;
    const processedKeys = new Set<string>(); // Track processed keys to avoid duplicates
    let iterations = 0;
    const maxIterations = 1000; // Safety limit

    do {
      iterations++;

      if (iterations > maxIterations) {
        console.log(`   ⚠️  Reached max iterations (${maxIterations}), stopping scan`);
        break;
      }

      // Scan for matching keys (returns [cursor, keys] tuple)
      const [newCursor, keys]: [string | number, string[]] = await redis.scan(cursor, {
        match: pattern,
        count: 100
      });

      // Filter out already processed keys
      const newKeys = keys.filter(k => !processedKeys.has(k));

      if (newKeys.length === 0 && String(cursor) === String(newCursor)) {
        // No new keys and cursor isn't changing - we're stuck
        console.log(`   ⚠️  Scan cursor not progressing, stopping`);
        break;
      }

      cursor = newCursor;

      if (newKeys.length === 0) {
        continue;
      }

      batchCount++;
      console.log(`   Batch ${batchCount}: Found ${newKeys.length} new keys (${keys.length} total, ${keys.length - newKeys.length} duplicates)`);

      for (const oldKey of newKeys) {
        result.total++;
        processedKeys.add(oldKey); // Mark as processed

        // Remove environment prefix
        // Example: dev:celoSepolia:deliverable:0xABC123 -> celoSepolia:deliverable:0xABC123
        // Example: dev:profile:0xABC123 -> profile:0xABC123
        const newKey = oldKey.replace(new RegExp(`^${env}:`), '');

        try {
          // Check if new key already exists
          const existingData = await redis.get(newKey);

          if (existingData) {
            console.log(`   ⚠️  Skipped ${oldKey} (target already exists)`);
            result.skipped++;
            result.details.push({
              oldKey,
              newKey,
              status: 'skipped',
              reason: 'Target key already exists',
            });
            continue;
          }

          // Get data from old key
          const data = await redis.get(oldKey);

          if (!data) {
            console.log(`   ⚠️  Skipped ${oldKey} (no data found)`);
            result.skipped++;
            result.details.push({
              oldKey,
              newKey,
              status: 'skipped',
              reason: 'No data found',
            });
            continue;
          }

          if (!dryRun) {
            // Set to new key (keep old key for now - we'll delete later)
            await redis.set(newKey, data);

            console.log(`   ✓ Migrated: ${oldKey} → ${newKey}`);
          } else {
            console.log(`   [DRY RUN] Would migrate: ${oldKey} → ${newKey}`);
          }

          result.migrated++;
          result.details.push({
            oldKey,
            newKey,
            status: 'success',
          });
        } catch (error) {
          console.error(`   ✗ Error migrating ${oldKey}:`, error);
          result.errors++;
          result.details.push({
            oldKey,
            newKey,
            status: 'error',
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } while (String(cursor) !== "0");
  }

  return result;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const envArg = args.find(arg => arg.startsWith('--env='));
  const env = envArg ? envArg.split('=')[1] : 'dev';

  try {
    const result = await migrateKVNamespace({ dryRun, env });

    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║                Migration Summary                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`Total entries found:      ${result.total}`);
    console.log(`✓ Successfully migrated:  ${result.migrated}`);
    console.log(`⚠️  Skipped:               ${result.skipped}`);
    console.log(`✗ Errors:                 ${result.errors}`);

    if (result.errors > 0) {
      console.log('\n❌ Migration completed with errors. Please review the log above.');
      process.exit(1);
    }

    if (dryRun) {
      console.log('\n🔍 This was a dry run. Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n⚠️  NOTE: Old keys (dev:*) have NOT been deleted yet.');
      console.log('After verifying the migration, you can delete them manually or run a cleanup script.');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
