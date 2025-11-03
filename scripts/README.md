# Migration Scripts

## Profile Migration

Migrates user profile keys from chain-specific to global format.

### Before Migration
```
dev:celoSepolia:profile:0xABC123
dev:celo:profile:0xDEF456
```

### After Migration
```
dev:profile:0xABC123  (merged from all chains)
dev:profile:0xDEF456  (merged from all chains)
```

### Usage

**1. Dry run first (preview changes):**
```bash
npx tsx scripts/migrate-profiles.ts --dry-run
```

**2. Run the migration:**
```bash
npx tsx scripts/migrate-profiles.ts
```

**3. For production environment:**
```bash
npx tsx scripts/migrate-profiles.ts --env=prod
```

### What it does

1. Scans for all profile keys matching: `dev:*:profile:*`
2. For each profile:
   - Extracts the address
   - Creates new global key: `dev:profile:0xABC`
   - Copies data to new key
   - Deletes old key
3. Skips profiles that already exist at target location
4. Reports success/failure for each migration

### Notes

- ✅ Safe to run multiple times (skips existing)
- ✅ Handles errors gracefully
- ✅ Dry run mode for testing
- ⚠️ If same address has profiles on multiple chains, **last one wins**
- ⚠️ Ensure you have backups before running on production
