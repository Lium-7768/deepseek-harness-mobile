import { describe, expect, it } from 'vitest'
import { toolArgument } from '@/components/session-conversation-logic'

describe('toolArgument', () => {
  it('takes the command a bash call ran', () => {
    expect(toolArgument('{"command":"ls -la /tmp/ui"}')).toBe('ls -la /tmp/ui')
  })

  it('takes the path an image read opened', () => {
    expect(toolArgument('{"file_path":"/tmp/ui/rn/01-workspace.png"}')).toBe('/tmp/ui/rn/01-workspace.png')
  })

  it('collapses a multi-line command to one line', () => {
    expect(toolArgument('{"command":"cd android\\n./gradlew assembleRelease"}')).toBe(
      'cd android ./gradlew assembleRelease',
    )
  })

  it('falls back to the raw text when the arguments are not JSON', () => {
    expect(toolArgument('/tmp/ui/ref/13-conv-top.png')).toBe('/tmp/ui/ref/13-conv-top.png')
  })

  it('has nothing to show without arguments', () => {
    expect(toolArgument(undefined)).toBeUndefined()
    expect(toolArgument('   ')).toBeUndefined()
  })

  it('takes the first string an unfamiliar call carries', () => {
    expect(toolArgument('{"job_id":"bash-123","timeout":30}')).toBe('bash-123')
  })

  it('shows nothing for an empty object', () => {
    expect(toolArgument('{}')).toBeUndefined()
    expect(toolArgument('{"timeout":30}')).toBeUndefined()
  })
})
