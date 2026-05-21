import * as React from 'react'
import { Text } from '../ink.js'
import { isClaudeAISubscriber } from '../utils/auth.js'
import { shouldEnableClaudeInChrome } from '../utils/claudeInChrome/setup.js'
import { isRunningOnHomespace } from '../utils/envUtils.js'
import { useStartupNotification } from './notifs/useStartupNotification.js'

const NATIVE_HOST_PORT = 12306
const NATIVE_HOST_PING_TIMEOUT_MS = 1500

async function isChromeExtensionInstalled(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), NATIVE_HOST_PING_TIMEOUT_MS)
    const res = await fetch(`http://127.0.0.1:${NATIVE_HOST_PORT}/ping`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

function getChromeFlag(): boolean | undefined {
  if (process.argv.includes('--chrome')) {
    return true
  }
  if (process.argv.includes('--no-chrome')) {
    return false
  }
  return undefined
}

export function useChromeExtensionNotification(): void {
  useStartupNotification(async () => {
    const chromeFlag = getChromeFlag()
    if (!shouldEnableClaudeInChrome(chromeFlag)) return null

    const installed = await isChromeExtensionInstalled()
    if (!installed && !isRunningOnHomespace()) {
      // Skip notification on Homespace since Chrome setup requires different steps (see go/hsproxy)
      return {
        key: 'chrome-extension-not-detected',
        jsx: (
          <Text color="warning">
            Chrome extension not detected or Chrome not start yet? · https://langcli.com/docs/chrome_use to install
          </Text>
        ),
        priority: 'immediate',
        timeoutMs: 30000,
      }
    }

    if (chromeFlag === undefined) {
      // Show low priority notification only when Chrome is enabled by default
      // (not explicitly enabled with --chrome or disabled with --no-chrome)
      return {
        key: 'claude-in-chrome-default-enabled',
        text: `Chrome Use mcp enabled · /chrome`,
        priority: 'low',
      }
    }
    if (chromeFlag && installed) {
      return {
        key: 'claude-in-chrome-default-enabled',
        jsx: (
          <Text color="warning">
            Chrome Use mcp connected · /chrome
          </Text>
        ),
        priority: 'immediate',
        timeoutMs: 30000,
      }
    }

    return null
  })
}
