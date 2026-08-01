/**
 * 统一 AI 排版客户端
 * 支持 DeepSeek 和 Kimi (Moonshot) 双模型
 * 
 * API Key 优先级：localStorage 存储 > config/apiConfig.js 静态配置
 */
import { DEEPSEEK_API_KEY, DEEPSEEK_MODEL, DEEPSEEK_API_URL, KIMI_API_KEY, KIMI_MODEL, KIMI_API_URL } from '../config/apiConfig.js'
import { systemPrompt, userPromptTemplate } from '../config/promptConfig.js'

/**
 * 获取实际使用的 API Key（localStorage 优先）
 */
function getEffectiveApiKey(modelId) {
  try {
    const key = modelId === 'kimi' ? 'gs_kimi_key' : 'gs_deepseek_key'
    const stored = localStorage.getItem(key)
    if (stored && stored.trim()) return stored.trim()
  } catch (e) { /* localStorage 不可用时忽略 */ }

  if (modelId === 'kimi') return KIMI_API_KEY
  return DEEPSEEK_API_KEY
}

/**
 * 检查某个模型是否已配置 API Key
 */
export function hasApiKey(model = 'deepseek') {
  const key = getEffectiveApiKey(model)
  return !!key && !key.startsWith('your-')
}

/**
 * 获取当前可用的模型列表
 */
export function getAvailableModels() {
  const models = []
  if (hasApiKey('deepseek')) models.push({ id: 'deepseek', label: 'DeepSeek', model: DEEPSEEK_MODEL })
  if (hasApiKey('kimi')) models.push({ id: 'kimi', label: 'Kimi (Moonshot)', model: KIMI_MODEL })
  if (models.length === 0) {
    // 都没配置时也返回，让用户选择
    models.push({ id: 'deepseek', label: 'DeepSeek', model: DEEPSEEK_MODEL })
    models.push({ id: 'kimi', label: 'Kimi (Moonshot)', model: KIMI_MODEL })
  }
  return models
}

/**
 * 获取模型 API 配置
 */
function getModelConfig(modelId) {
  if (modelId === 'kimi') {
    return {
      apiKey: getEffectiveApiKey('kimi'),
      apiUrl: KIMI_API_URL,
      model: KIMI_MODEL,
    }
  }
  return {
    apiKey: getEffectiveApiKey('deepseek'),
    apiUrl: DEEPSEEK_API_URL,
    model: DEEPSEEK_MODEL,
  }
}

/**
 * AI 排版错误
 */
export class AITypesetError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'AITypesetError'
    this.code = code
  }
}

/**
 * 使用 AI 进行文章排版
 * @param {string} text - 要排版的 Markdown 原文
 * @param {string} modelId - 模型 ID: 'deepseek' 或 'kimi'
 * @returns {Promise<string>} 排版后的 HTML
 */
export async function formatWithAI(text, modelId = 'deepseek') {
  const config = getModelConfig(modelId)

  if (!config.apiKey || config.apiKey.startsWith('your-')) {
    throw new AITypesetError(
      `${modelId === 'kimi' ? 'Kimi' : 'DeepSeek'} API Key 未配置\n请在 config/apiConfig.js 中设置`,
      'NO_KEY'
    )
  }

  const userPrompt = userPromptTemplate.replace('{{text}}', text)

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    }),
  })

  if (!response.ok) {
    const status = response.status
    if (status === 401) {
      throw new AITypesetError(`${modelId === 'kimi' ? 'Kimi' : 'DeepSeek'} API Key 无效或已过期，请检查配置`, 'AUTH_FAIL')
    } else if (status === 429) {
      throw new AITypesetError('请求过于频繁，请稍后重试', 'RATE_LIMIT')
    } else {
      throw new AITypesetError(`API 请求失败 (${status})，请重试`, 'API_ERROR')
    }
  }

  const data = await response.json()

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new AITypesetError('API 返回格式异常', 'PARSE_ERROR')
  }

  return data.choices[0].message.content
}

/**
 * 使用 AI 进行文字改写/润色/翻译
 * @param {string} text - 待处理文字
 * @param {string} action - 操作类型: polish/expand/shorten/translate-en/translate-ja/translate-ko
 * @param {string} modelId - 模型 ID
 * @returns {Promise<string>}
 */
export async function aiRewrite(text, action, modelId = 'deepseek') {
  const config = getModelConfig(modelId)

  if (!config.apiKey || config.apiKey.startsWith('your-')) {
    throw new AITypesetError(
      `${modelId === 'kimi' ? 'Kimi' : 'DeepSeek'} API Key 未配置`,
      'NO_KEY'
    )
  }

  const actionPrompts = {
    polish: '请润色以下文字，优化表达、修正语病，保持原意不变：\n\n',
    expand: '请扩写以下文字，丰富内容、增加细节、保持风格一致：\n\n',
    shorten: '请缩写以下文字，提炼核心内容，保留关键信息：\n\n',
    'translate-en': '请将以下文字翻译为英文：\n\n',
    'translate-ja': '请将以下文字翻译为日文：\n\n',
    'translate-ko': '请将以下文字翻译为韩文：\n\n',
  }

  const prompt = (actionPrompts[action] || actionPrompts.polish) + text

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文字编辑助手。请根据用户要求处理文字，直接返回处理结果，不要添加解释或额外内容。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) throw new Error(`API 请求失败 (${response.status})`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}