import React, { useState, useEffect } from 'react'
import { execFileSync } from 'child_process'
import { createRequire } from 'module'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'

type DoctorCheck = {
  id: string
  title: string
  status: 'ok' | 'warn' | 'error'
  message: string
  details?: Record<string, unknown>
}

type DoctorReport = {
  ok: boolean
  summary: { ok: number; warn: number; error: number }
  checks: DoctorCheck[]
  fixes: Array<{ id: string; description: string; success: boolean; error?: string }>
  nextSteps: string[]
}

type Props = {
  onDone: (result?: string) => void
  report: DoctorReport | null
  error: string | null
}

function ChromeDoctorMenu({ onDone, report, error }: Props): React.ReactNode {
  if (error) {
    return (
      <Dialog title="mcp-chrome Doctor" onCancel={() => onDone()} color="chromeYellow">
        <Box flexDirection="column" gap={1}>
          <Text color="error">Error running doctor: {error}</Text>
          <Text dimColor>Try running: langcli --chrome</Text>
        </Box>
      </Dialog>
    )
  }

  if (!report) {
    return (
      <Dialog title="mcp-chrome Doctor" onCancel={() => onDone()} color="chromeYellow">
        <Text>Loading...</Text>
      </Dialog>
    )
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Text color="success">[OK]</Text>
      case 'warn':
        return <Text color="warning">[WARN]</Text>
      case 'error':
        return <Text color="error">[ERROR]</Text>
      default:
        return <Text>[{status}]</Text>
    }
  }

  return (
    <Dialog title="mcp-chrome Doctor" onCancel={() => onDone()} color="chromeYellow">
      <Box flexDirection="column" gap={1}>
        <Text>
          Status: {report.ok ? (
            <Text color="success">All checks passed</Text>
          ) : (
            <Text color="error">{report.summary.error} error(s), {report.summary.warn} warning(s)</Text>
          )}
        </Text>

        <Box flexDirection="column" gap={0}>
          {report.checks.map((check) => (
            <Box key={check.id}>
              <Text>
                {statusBadge(check.status)} {check.title}: {check.message}
              </Text>
            </Box>
          ))}
        </Box>

        {report.fixes.length > 0 && (
          <Box flexDirection="column" gap={0}>
            <Text bold>Fix attempts:</Text>
            {report.fixes.map((fix) => (
              <Box key={fix.id}>
                <Text>
                  {fix.success ? (
                    <Text color="success">[OK]</Text>
                  ) : (
                    <Text color="error">[ERROR]</Text>
                  )}{' '}
                  {fix.description}
                  {!fix.success && fix.error ? ` (${fix.error})` : ''}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {report.nextSteps.length > 0 && (
          <Box flexDirection="column" gap={0}>
            <Text bold>Next steps:</Text>
            {report.nextSteps.map((step, i) => (
              <Text key={i}>  {i + 1}. {step}</Text>
            ))}
          </Box>
        )}

        <Text dimColor>
          Usage: langcli --chrome (enable) | langcli --no-chrome (disable)
        </Text>
      </Box>
    </Dialog>
  )
}

export const call = async function (
  onDone: (result?: string) => void,
  _context: unknown,
  _args: string,
): Promise<React.ReactNode> {
  let report: DoctorReport | null = null
  let error: string | null = null

  try {
    const require = createRequire(import.meta.url)
    const cliPath = require.resolve(
      '@claude-code-best/mcp-chrome-bridge/dist/cli.js',
    )

    const output = execFileSync(
      'node',
      [cliPath, 'doctor', '--json', '--fix', '--browser', 'chrome'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000,
      },
    )

    report = JSON.parse(output) as DoctorReport
  } catch (err) {
    if (err instanceof Error) {
      error = err.message
    } else {
      error = String(err)
    }
  }

  return <ChromeDoctorMenu onDone={onDone} report={report} error={error} />
}
