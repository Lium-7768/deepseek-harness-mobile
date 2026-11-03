const path = require('node:path')
const { existsSync } = require('node:fs')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Lowlight's public barrel also re-exports every grammar. Metro eagerly bundles
// those registries; use its core entry and register only the seven mobile grammars.
// lowlight 3 exports only its barrel, so resolving its subpath directly throws.
// Verify the known core file; package layout changes fall back to public exports.
const candidate = path.join(path.dirname(require.resolve('lowlight')), 'lib/index.js')
const lowlightCore = existsSync(candidate) ? candidate : undefined
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lowlight' && lowlightCore !== undefined) return { type: 'sourceFile', filePath: lowlightCore }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
