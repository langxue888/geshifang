/**
 * HTML 转 Markdown 转换器
 * 支持：标题(h1~h6)、加粗、斜体、链接、图片、列表(ul/ol)、引用、代码块、行内代码、分割线、段落
 */
export function htmlToMarkdown(html) {
  if (!html || !html.trim()) return ''

  let text = html

  // 1. 保护代码块（先提取，避免被后续规则破坏）
  const codeBlocks = []
  text = text.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, match => {
    const idx = codeBlocks.length
    const code = match
      .replace(/<\/?pre[^>]*>/gi, '')
      .replace(/<code[^>]*>/gi, '')
      .replace(/<\/code>/gi, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x60;/g, '`')
    codeBlocks.push(code.trim())
    return `\x00CODEBLOCK${idx}\x00`
  })

  // 保护行内代码
  const inlineCodes = []
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, match => {
    const idx = inlineCodes.length
    const code = match
      .replace(/<\/?code[^>]*>/gi, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    inlineCodes.push(code)
    return `\x00INLINECODE${idx}\x00`
  })

  // 2. 移除无用标签
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<!--[\s\S]*?-->/g, '')
  text = text.replace(/<(?!\/?(?:h[1-6]|p|br|b|strong|i|em|a|img|ul|ol|li|blockquote|hr|div|span|br|table|thead|tbody|tr|th|td|del|s|u|br|figure|figcaption))[^>]+>/gi, '')

  // 3. 替换块级标签为换行
  text = text.replace(/<\/(?:h[1-6]|p|div|blockquote|li|tr|table|figure|figcaption)>/gi, '$&\n')

  // 4. 处理图片
  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
    const altMatch = match.match(/alt=["']([^"']*)["']/)
    const alt = altMatch ? altMatch[1] : ''
    return `![${alt}](${src})`
  })

  // 5. 处理链接
  text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, content) => {
    content = content.trim()
    if (!content) return href
    return `[${content}](${href})`
  })

  // 6. 处理加粗/斜体
  text = text.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
  text = text.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*')
  text = text.replace(/<(?:del|s)>([\s\S]*?)<\/(?:del|s)>/gi, '~~$1~~')
  text = text.replace(/<u>([\s\S]*?)<\/u>/gi, '__$1__')

  // 7. 处理标题
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n')
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n')
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n')
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n')
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n')
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n')

  // 8. 处理分割线
  text = text.replace(/<hr[^>]*>/gi, '\n---\n')

  // 9. 处理引用
  while (/<blockquote[^>]*>/.test(text)) {
    text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
      return content.split('\n').map(line => line.trim() ? `> ${line}` : '>').join('\n') + '\n'
    })
  }

  // 10. 处理列表
  // 先处理有序列表
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let idx = 1
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, c) => {
      return `${idx++}. ${c.trim()}\n`
    })
  })
  // 再处理无序列表
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, c) => {
      return `- ${c.trim()}\n`
    })
  })

  // 11. 处理表格
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
    const rows = []
    let inHeader = false
    content.replace(/<thead[^>]*>([\s\S]*?)<\/thead>/gi, (m, c) => {
      inHeader = true
      c.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (rm, rc) => {
        const cells = []
        rc.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, (cm, cc) => { cells.push(cc.trim()) })
        rc.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (cm, cc) => { cells.push(cc.trim()) })
        if (cells.length) rows.push(cells)
      })
      return ''
    })
    content.replace(/<tbody[^>]*>([\s\S]*?)<\/tbody>/gi, (m, c) => {
      c.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (rm, rc) => {
        const cells = []
        rc.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, (cm, cc) => { cells.push(cc.trim()) })
        rc.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (cm, cc) => { cells.push(cc.trim()) })
        if (cells.length) rows.push(cells)
      })
      return ''
    })
    // 也处理没有thead/tbody的表格
    if (!rows.length) {
      content.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (rm, rc) => {
        const cells = []
        rc.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, (cm, cc) => { cells.push(cc.trim()) })
        rc.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (cm, cc) => { cells.push(cc.trim()) })
        if (cells.length) rows.push(cells)
      })
    }
    if (!rows.length) return ''
    const mdRows = rows.map((row, i) => {
      const line = `| ${row.join(' | ')} |`
      return i === 0 && inHeader ? line + '\n' + `| ${row.map(() => '---').join(' | ')} |` : line
    })
    return mdRows.join('\n') + '\n'
  })

  // 12. 处理换行
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/?div[^>]*>/gi, '\n')
  text = text.replace(/<\/?span[^>]*>/gi, '')
  text = text.replace(/<p[^>]*>/gi, '')
  text = text.replace(/<\/p>/gi, '\n')
  text = text.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, '$1\n')

  // 13. 恢复行内代码
  text = text.replace(/\x00INLINECODE(\d+)\x00/g, (match, idx) => {
    return `\`${inlineCodes[parseInt(idx)]}\``
  })

  // 14. 恢复代码块
  text = text.replace(/\x00CODEBLOCK(\d+)\x00/g, (match, idx) => {
    const code = codeBlocks[parseInt(idx)]
    // 尝试检测语言
    return `\`\`\`\n${code}\n\`\`\`\n`
  })

  // 15. 清理多余空行
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/^\n+/, '')
  text = text.replace(/\n+$/, '')

  // 16. HTML 实体解码
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&#x27;/g, "'")
  text = text.replace(/&#x60;/g, '`')
  text = text.replace(/&#x2018;/g, "'")
  text = text.replace(/&#x2019;/g, "'")
  text = text.replace(/&#x201C;/g, '"')
  text = text.replace(/&#x201D;/g, '"')
  text = text.replace(/&#x2013;/g, '–')
  text = text.replace(/&#x2014;/g, '—')
  text = text.replace(/&#\d+;/g, '')

  return text.trim()
}