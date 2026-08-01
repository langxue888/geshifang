/**
 * AI 模型 API 配置
 * 
 * 配置说明：
 * - 在下方引号中填入你的 API Key
 * - DeepSeek: https://platform.deepseek.com/ 获取
 * - Kimi: https://platform.moonshot.cn/ 获取
 * - 至少配置一个模型即可使用 AI 排版功能
 */

// DeepSeek 配置
export const DEEPSEEK_API_KEY = 'your-deepseek-api-key-here'
export const DEEPSEEK_MODEL = 'deepseek-chat'
export const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// Kimi (Moonshot) 配置
export const KIMI_API_KEY = 'your-kimi-api-key-here'
export const KIMI_MODEL = 'moonshot-v1-8k'
export const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'

// 各模型显示名称
export const MODEL_LABELS = {
  deepseek: 'DeepSeek',
  kimi: 'Kimi (Moonshot)',
}