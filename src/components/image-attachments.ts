import type { DraftImage } from '@/components/composer-types'
import { ATTACHMENT_MAX_EDGE, ATTACHMENT_QUALITY, base64Bytes, resizeTargetFor } from '@/components/attachment-policy'

/**
 * Shrinks one picked image and returns the encoded attachment a send can carry.
 *
 * The picker hands back a file URI rather than base64: a full-resolution phone photo
 * costs several megabytes as base64, and the shrunken encode is the only payload that
 * ever crosses the bridge. The engine loads on the first attachment for the same reason
 * the haptic engine does — an Expo package reaches its runtime on import, which a Node
 * test process cannot satisfy.
 *
 * @param asset - Picked image with its file URI and pixel size.
 * @returns The encoded attachment with its decoded byte size.
 * @throws When the engine is unavailable or the image cannot be decoded.
 */
export async function prepareAttachment(asset: {
  height?: number
  name?: string
  uri: string
  width?: number
}): Promise<DraftImage> {
  const engine = await import('expo-image-manipulator')
  const context = engine.ImageManipulator.manipulate(asset.uri)
  const target = resizeTargetFor(asset.width ?? 0, asset.height ?? 0)
  if (target !== undefined) context.resize({ width: target.width })
  const rendered = await context.renderAsync()
  const saved = await rendered.saveAsync({
    base64: true,
    compress: ATTACHMENT_QUALITY,
    format: engine.SaveFormat.JPEG,
  })
  if (saved.base64 === undefined) throw new Error('image-encode-missing')
  return {
    bytes: base64Bytes(saved.base64),
    data: saved.base64,
    mediaType: 'image/jpeg',
    ...(asset.name === undefined ? {} : { name: asset.name }),
    uri: saved.uri,
  }
}

/** Long edge the composer offers in its copy, so the promise matches the encode. */
export const ATTACHMENT_EDGE_COPY = ATTACHMENT_MAX_EDGE
