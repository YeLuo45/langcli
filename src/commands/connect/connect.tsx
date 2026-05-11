import * as React from 'react'
import { Pane } from '../../components/design-system/Pane.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import type { CommandResultDisplay } from '../../commands.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  getSettings_DEPRECATED,
  getSettingsFilePathForSource,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'
import { applyConfigEnvironmentVariables } from '../../utils/managedEnv.js'
import TextInput from '../../components/TextInput.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'

type ConnectOption = 'langrouter' | 'deepseek' | 'custom'

type Props = {
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
      nextInput?: string
      submitNextInput?: boolean
    },
  ) => void
}

const DEEPSEEK_MODELS = [
  {
    id: 'deepseek-v4-flash[1m]',
    name: 'deepseek-v4-flash[1m] (custom)',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com',
    generationConfig: {
      timeout: 300000,
      maxRetries: 2,
      contextWindowSize: 1000000,
      samplingParams: {
        temperature: 0.3,
        top_p: 0.95,
        max_tokens: 384000,
      },
    },
  },
  {
    id: 'deepseek-v4-pro[1m]',
    name: 'deepseek-v4-pro[1m] (custom)',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com',
    generationConfig: {
      timeout: 300000,
      maxRetries: 2,
      contextWindowSize: 1000000,
      samplingParams: {
        temperature: 0.3,
        top_p: 0.95,
        max_tokens: 384000,
      },
    },
  },
]

function hasDeepseekConfigured(): boolean {
  const settings = getSettings_DEPRECATED()
  const openaiModels = settings?.modelProviders?.openai
  if (!openaiModels || openaiModels.length === 0) return false
  return openaiModels.some(
    (m: { id: string }) => m.id === 'deepseek-v4-flash[1m]' || m.id === 'deepseek-v4-pro[1m]',
  )
}

function DeepseekConnect({ onDone }: Props): React.ReactNode {
  const [apiKey, setApiKey] = React.useState('')
  const [cursorOffset, setCursorOffset] = React.useState(0)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const { columns } = useTerminalSize()
  const textInputColumns = columns - 4

  const alreadyConfigured = hasDeepseekConfigured()

  const handleCancel = React.useCallback(() => {
    onDone('Connect cancelled', { display: 'system' })
  }, [onDone])

  useKeybinding('confirm:no', handleCancel, { context: 'Confirmation' })

  if (alreadyConfigured) {
    return (
      <Pane color="permission">
        <Box flexDirection="column" gap={1}>
          <Text bold color="success">
            Deepseek API key is already configured
          </Text>
          <Text dimColor>
            Settings file: {getSettingsFilePathForSource('userSettings')}
          </Text>
          <Text dimColor>
            Open this file to verify your configuration.
          </Text>
          <Text dimColor italic>
            Esc to go back
          </Text>
        </Box>
      </Pane>
    )
  }

  const handleSubmit = async (value: string) => {
    if (!value.trim()) {
      setSaveError('Please enter a valid API key')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const currentSettings = getSettings_DEPRECATED() || {}
      const currentOpenAI = currentSettings.modelProviders?.openai || []

      // Remove any existing deepseek models to avoid duplicates, then add ours
      const filteredModels = currentOpenAI.filter(
        (m: { id: string }) => m.id !== 'deepseek-v4-flash[1m]' && m.id !== 'deepseek-v4-pro[1m]',
      )

      const result = updateSettingsForSource('userSettings', {
        env: {
          DEEPSEEK_API_KEY: value.trim(),
        },
        modelProviders: {
          openai: [...filteredModels, ...DEEPSEEK_MODELS],
          anthropic: currentSettings.modelProviders?.anthropic || [],
          gemini: currentSettings.modelProviders?.gemini || []
        },
      })

      if (result.error) {
        setSaveError(result.error.message)
        return
      }

      applyConfigEnvironmentVariables()
      onDone('Deepseek API key saved successfully', { display: 'system' })
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Pane color="permission">
      <Box flexDirection="column" gap={1}>
        <Text bold color="permission">
          Connect to Deepseek Official
        </Text>
        <Text>Please input your Deepseek API key and press Enter to continue:</Text>
        <Box borderStyle="round" borderColor="background" flexDirection="column" paddingX={1}>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            onSubmit={handleSubmit}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            columns={textInputColumns}
            placeholder="Enter your Deepseek API key here..."
            focus={true}
            showCursor={true}
          />
        </Box>
        {saveError && <Text color="error">{saveError}</Text>}
        {isSaving && <Text dimColor>Saving...</Text>}
        <Text dimColor italic>
          Esc to go back
        </Text>
      </Box>
    </Pane>
  )
}

function ConnectScreen({ onDone }: Props): React.ReactNode {
  const [selectedOption, setSelectedOption] = React.useState<ConnectOption | null>(null)

  const handleCancel = React.useCallback(() => {
    if (selectedOption === 'custom' || selectedOption === 'deepseek') {
      setSelectedOption(null)
    } else {
      onDone('Connect cancelled', { display: 'system' })
    }
  }, [selectedOption, onDone])

  useKeybinding('confirm:no', handleCancel, { context: 'Confirmation' })

  if (selectedOption === 'deepseek') {
    return <DeepseekConnect onDone={onDone} />
  }

  if (selectedOption === 'custom') {
    return (
      <Pane color="permission">
        <Box flexDirection="column" gap={1}>
          <Text bold color="permission">
            Custom Configuration
          </Text>
          <Text>
            You can configure your API key and models in settings.json
          </Text>
          <Text dimColor>
            Refer to the documentation for setup instructions
          </Text>
          <Text color="suggestion" dimColor>
            https://langcli.com/docs/model-providers/
          </Text>
          <Text dimColor italic>
            Esc to go back
          </Text>
        </Box>
      </Pane>
    )
  }

  return (
    <Pane color="permission">
      <Box flexDirection="column" gap={1}>
        <Text bold color="permission">
          Select API Key Type
        </Text>
        <Select<ConnectOption>
          hideIndexes
          options={[
            {
              label: 'LangRouter.ai API Key',
              value: 'langrouter',
              description: 'The convenient way to use mainstream LLM models.',
              dimDescription: false,
            },
            {
              label: 'Deepseek',
              value: 'deepseek',
              description: 'Connect to Deepseek official',
              dimDescription: false,
            },
            {
              label: 'Custom API Key',
              value: 'custom',
              description: 'For other OpenAI / Anthropic / Gemini-compatible providers',
              dimDescription: false,
            },
          ]}
          onChange={value => {
            if (value === 'langrouter') {
              onDone(undefined, { nextInput: '/login', submitNextInput: true })
            } else if (value === 'deepseek') {
              setSelectedOption(value)
            } else {
              setSelectedOption(value)
            }
          }}
          onCancel={handleCancel}
          layout="expanded"
        />
        <Text dimColor italic>
          Esc to go back
        </Text>
      </Box>
    </Pane>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context) => {
  return <ConnectScreen onDone={onDone} />
}
