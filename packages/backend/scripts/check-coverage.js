#!/usr/bin/env node

/**
 * Coverage Threshold Checker
 *
 * Checks if coverage meets the required thresholds and fails if not.
 * This script is used in CI to enforce minimum coverage requirements.
 */

const fs = require('fs')
const path = require('path')

const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json')
const thresholds = {
  lines: 70,
  functions: 70,
  branches: 70,
  statements: 70,
}

if (!fs.existsSync(coveragePath)) {
  console.error('❌ Coverage report not found at:', coveragePath)
  console.error('Run tests with coverage first: npm run test:coverage')
  process.exit(1)
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
const total = coverage.total

console.log('\n📊 Coverage Report Summary\n')
console.log('━'.repeat(60))

let failed = false

for (const [key, threshold] of Object.entries(thresholds)) {
  const pct = total[key].pct
  const status = pct >= threshold ? '✅' : '❌'
  const message = `${status} ${key.padEnd(12)} ${pct.toFixed(2)}% (threshold: ${threshold}%)`

  console.log(message)

  if (pct < threshold) {
    failed = true
  }
}

console.log('━'.repeat(60))

if (failed) {
  console.error('\n❌ Coverage is below required thresholds!')
  console.error('Please add more tests to improve coverage.\n')
  process.exit(1)
} else {
  console.log('\n✅ All coverage thresholds met!\n')
  process.exit(0)
}
