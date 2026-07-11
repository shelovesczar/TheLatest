import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const DIST_DIR = path.resolve(process.cwd(), 'dist', 'assets')
const JS_BUDGET_BYTES = 800 * 1024
const CSS_BUDGET_BYTES = 220 * 1024
const GZIP_TOTAL_BUDGET_BYTES = 420 * 1024

function getFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Build assets directory not found: ${directory}`)
  }

  return fs.readdirSync(directory).map((name) => path.join(directory, name))
}

function summarizeFiles(files, extension) {
  const matching = files.filter((file) => file.endsWith(extension))
  const totalBytes = matching.reduce((sum, file) => sum + fs.statSync(file).size, 0)
  const gzipBytes = matching.reduce((sum, file) => sum + zlib.gzipSync(fs.readFileSync(file)).length, 0)
  return { count: matching.length, totalBytes, gzipBytes }
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function main() {
  const files = getFiles(DIST_DIR)
  const js = summarizeFiles(files, '.js')
  const css = summarizeFiles(files, '.css')
  const totalGzip = js.gzipBytes + css.gzipBytes

  console.log(`JS assets: ${js.count} files, ${formatKb(js.totalBytes)} raw, ${formatKb(js.gzipBytes)} gzip`)
  console.log(`CSS assets: ${css.count} files, ${formatKb(css.totalBytes)} raw, ${formatKb(css.gzipBytes)} gzip`)
  console.log(`Total JS+CSS gzip: ${formatKb(totalGzip)}`)

  const errors = []
  if (js.totalBytes > JS_BUDGET_BYTES) {
    errors.push(`JavaScript bundle budget exceeded: ${formatKb(js.totalBytes)} > ${formatKb(JS_BUDGET_BYTES)}`)
  }
  if (css.totalBytes > CSS_BUDGET_BYTES) {
    errors.push(`CSS bundle budget exceeded: ${formatKb(css.totalBytes)} > ${formatKb(CSS_BUDGET_BYTES)}`)
  }
  if (totalGzip > GZIP_TOTAL_BUDGET_BYTES) {
    errors.push(`Combined gzip budget exceeded: ${formatKb(totalGzip)} > ${formatKb(GZIP_TOTAL_BUDGET_BYTES)}`)
  }

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`- ${error}`))
    process.exit(1)
  }

  console.log('Bundle audit passed.')
}

main()