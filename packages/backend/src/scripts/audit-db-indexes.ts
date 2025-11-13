import { sequelize } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Database Index Audit Script
 *
 * This script analyzes the database indexes and provides recommendations
 * for optimization. It checks for:
 * - Missing indexes on foreign keys
 * - Unused indexes
 * - Duplicate indexes
 * - Large tables without proper indexing
 * - Index usage statistics
 */

interface IndexInfo {
  tableName: string
  indexName: string
  columnName: string
  isUnique: boolean
  isPrimary: boolean
}

interface TableStats {
  tableName: string
  rowCount: number
  tableSize: string
  indexSize: string
  totalSize: string
}

interface IndexUsageStats {
  schemaName: string
  tableName: string
  indexName: string
  indexScans: number
  tuplesRead: number
  tuplesInserted: number
}

async function getTableStats(): Promise<TableStats[]> {
  const query = `
    SELECT
      schemaname || '.' || tablename AS table_name,
      pg_total_relation_size(schemaname || '.' || tablename)::bigint AS total_size,
      pg_relation_size(schemaname || '.' || tablename)::bigint AS table_size,
      (pg_total_relation_size(schemaname || '.' || tablename) -
       pg_relation_size(schemaname || '.' || tablename))::bigint AS index_size,
      (SELECT count(*) FROM information_schema.columns c
       WHERE c.table_schema = t.schemaname AND c.table_name = t.tablename) AS column_count
    FROM pg_tables t
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
  `

  const result = await sequelize.query(query, { type: "SELECT" })
  return result.map((row: any) => ({
    tableName: row.table_name,
    rowCount: 0, // Will be filled separately
    tableSize: formatBytes(row.table_size),
    indexSize: formatBytes(row.index_size),
    totalSize: formatBytes(row.total_size),
  }))
}

async function getIndexes(): Promise<IndexInfo[]> {
  const query = `
    SELECT
      t.tablename AS table_name,
      i.indexname AS index_name,
      a.attname AS column_name,
      ix.indisunique AS is_unique,
      ix.indisprimary AS is_primary
    FROM pg_indexes i
    JOIN pg_class c ON c.relname = i.indexname
    JOIN pg_index ix ON ix.indexrelid = c.oid
    JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
    JOIN pg_tables t ON t.tablename = i.tablename
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename, i.indexname;
  `

  const result = await sequelize.query(query, { type: "SELECT" })
  return result.map((row: any) => ({
    tableName: row.table_name,
    indexName: row.index_name,
    columnName: row.column_name,
    isUnique: row.is_unique,
    isPrimary: row.is_primary,
  }))
}

async function getForeignKeys(): Promise<{ tableName: string; columnName: string }[]> {
  const query = `
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `

  const result = await sequelize.query(query, { type: "SELECT" })
  return result.map((row: any) => ({
    tableName: row.table_name,
    columnName: row.column_name,
  }))
}

async function getIndexUsageStats(): Promise<IndexUsageStats[]> {
  const query = `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan AS index_scans,
      idx_tup_read AS tuples_read,
      idx_tup_fetch AS tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan ASC;
  `

  try {
    const result = await sequelize.query(query, { type: "SELECT" })
    return result.map((row: any) => ({
      schemaName: row.schemaname,
      tableName: row.tablename,
      indexName: row.indexname,
      indexScans: row.index_scans,
      tuplesRead: row.tuples_read,
      tuplesInserted: 0,
    }))
  } catch (error) {
    logger.warn("Could not retrieve index usage stats (may require pg_stat_statements extension)")
    return []
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

async function auditIndexes() {
  try {
    logger.info("🔍 Starting database index audit...")

    // Get all relevant data
    const [tableStats, indexes, foreignKeys, usageStats] = await Promise.all([
      getTableStats(),
      getIndexes(),
      getForeignKeys(),
      getIndexUsageStats(),
    ])

    logger.info("\n📊 TABLE STATISTICS")
    logger.info("=".repeat(80))
    console.table(
      tableStats.map((stat) => ({
        Table: stat.tableName,
        "Table Size": stat.tableSize,
        "Index Size": stat.indexSize,
        "Total Size": stat.totalSize,
      }))
    )

    // Check for missing indexes on foreign keys
    logger.info("\n🔗 FOREIGN KEY INDEX ANALYSIS")
    logger.info("=".repeat(80))
    const missingFKIndexes: { tableName: string; columnName: string }[] = []

    for (const fk of foreignKeys) {
      const hasIndex = indexes.some((idx) => idx.tableName === fk.tableName && idx.columnName === fk.columnName)

      if (!hasIndex) {
        missingFKIndexes.push(fk)
      }
    }

    if (missingFKIndexes.length > 0) {
      logger.warn(`⚠️  Found ${missingFKIndexes.length} foreign keys without indexes:`)
      missingFKIndexes.forEach((fk) => {
        logger.warn(`   - ${fk.tableName}.${fk.columnName}`)
        logger.info(`     Recommendation: CREATE INDEX idx_${fk.tableName}_${fk.columnName} ON ${fk.tableName}(${fk.columnName});`)
      })
    } else {
      logger.info("✅ All foreign keys have indexes")
    }

    // Analyze index usage
    if (usageStats.length > 0) {
      logger.info("\n📈 INDEX USAGE STATISTICS")
      logger.info("=".repeat(80))

      const unusedIndexes = usageStats.filter((stat) => stat.indexScans === 0 && !stat.indexName.includes("_pkey"))

      if (unusedIndexes.length > 0) {
        logger.warn(`⚠️  Found ${unusedIndexes.length} unused indexes (0 scans):`)
        unusedIndexes.forEach((idx) => {
          logger.warn(`   - ${idx.tableName}.${idx.indexName}`)
          logger.info(`     Consider: DROP INDEX IF EXISTS ${idx.indexName};`)
        })
      } else {
        logger.info("✅ All indexes are being used")
      }

      const lowUsageIndexes = usageStats.filter(
        (stat) => stat.indexScans > 0 && stat.indexScans < 10 && !stat.indexName.includes("_pkey")
      )

      if (lowUsageIndexes.length > 0) {
        logger.info(`\n📉 Indexes with low usage (< 10 scans):`)
        lowUsageIndexes.forEach((idx) => {
          logger.info(`   - ${idx.tableName}.${idx.indexName}: ${idx.indexScans} scans`)
        })
      }
    }

    // Check for duplicate indexes
    logger.info("\n🔄 DUPLICATE INDEX CHECK")
    logger.info("=".repeat(80))
    const indexGroups = new Map<string, IndexInfo[]>()

    for (const idx of indexes) {
      const key = `${idx.tableName}.${idx.columnName}`
      if (!indexGroups.has(key)) {
        indexGroups.set(key, [])
      }
      indexGroups.get(key)!.push(idx)
    }

    let foundDuplicates = false
    for (const [key, group] of indexGroups.entries()) {
      if (group.length > 1) {
        const nonPrimaryIndexes = group.filter((idx) => !idx.isPrimary)
        if (nonPrimaryIndexes.length > 1) {
          logger.warn(`⚠️  Potential duplicate indexes on ${key}:`)
          nonPrimaryIndexes.forEach((idx) => {
            logger.warn(`   - ${idx.indexName}`)
          })
          foundDuplicates = true
        }
      }
    }

    if (!foundDuplicates) {
      logger.info("✅ No duplicate indexes found")
    }

    // Recommendations for large tables
    logger.info("\n💡 RECOMMENDATIONS")
    logger.info("=".repeat(80))

    const largeTables = tableStats.filter((stat) => {
      const sizeMatch = stat.totalSize.match(/(\d+\.?\d*)\s*(\w+)/)
      if (!sizeMatch) return false
      const size = parseFloat(sizeMatch[1])
      const unit = sizeMatch[2]
      return (unit === "MB" && size > 10) || unit === "GB" || unit === "TB"
    })

    if (largeTables.length > 0) {
      logger.info("📦 Large tables that may benefit from index optimization:")
      largeTables.forEach((table) => {
        logger.info(`   - ${table.tableName}: ${table.totalSize}`)
        logger.info(`     • Review query patterns for this table`)
        logger.info(`     • Consider composite indexes for common WHERE clauses`)
        logger.info(`     • Analyze EXPLAIN plans for slow queries`)
      })
    }

    logger.info("\n✨ Audit completed successfully!")
    logger.info("\n📝 Next steps:")
    logger.info("   1. Review missing foreign key indexes and create them if needed")
    logger.info("   2. Analyze unused indexes and consider dropping them")
    logger.info("   3. Run EXPLAIN ANALYZE on slow queries to identify missing indexes")
    logger.info("   4. Monitor query performance after index changes")
    logger.info("   5. Document all index changes in migrations")
  } catch (error) {
    logger.error("Error during index audit:", error)
    throw error
  }
}

// Run the audit
if (require.main === module) {
  auditIndexes()
    .then(() => {
      logger.info("Closing database connection...")
      return sequelize.close()
    })
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      logger.error("Audit failed:", error)
      process.exit(1)
    })
}

export { auditIndexes }
