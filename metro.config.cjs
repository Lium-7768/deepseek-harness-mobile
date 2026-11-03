const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Lowlight's public barrel also re-exports every grammar. Metro eagerly bundles
// those registries; use its core entry and register only the seven mobile grammars.
const lowlightCore = path.join(path.dirname(require.resolve('lowlight')), 'lib/index.js')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lowlight') return { type: 'sourceFile', filePath: lowlightCore }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
