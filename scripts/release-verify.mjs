import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const tag = process.argv.at(-1)
if (typeof tag !== 'string') {
  console.error('Release tag must use v<major>.<minor>.<patch>.')
  process.exit(64)
}
if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error('Release tag must use v<major>.<minor>.<patch>.')
  process.exit(64)
}

const version = tag.substring(1)
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')
const packageVersion = JSON.parse(read('package.json')).version
const appVersion = JSON.parse(read('app.json')).expo.version
const androidLine = read('android/app/build.gradle').split('\n').find(line => line.includes('versionName '))
const androidVersion = androidLine ? androidLine.split('"')[1] : ''
const xcodeLines = read('ios/DeepSeekHarness.xcodeproj/project.pbxproj').split('\n')
const iosVersions = xcodeLines
  .filter(line => line.includes('MARKETING_VERSION = '))
  .map(line => line.split(' = ')[1].replace(';', ''))
const uniqueIosVersions = [...new Set(iosVersions)].join(',')
const values = [
  ['package.json', packageVersion],
  ['app.json', appVersion],
  ['android/app/build.gradle', androidVersion],
  ['ios/DeepSeekHarness.xcodeproj/project.pbxproj', uniqueIosVersions],
]
for (const [label, actual] of values) {
  if (actual !== version) {
    const display = actual || '(missing)'
    console.error(`${label} version '${display}' does not match release tag '${tag}'.`)
    process.exit(1)
  }
}
console.log(`Release metadata is aligned at ${tag}.`)
