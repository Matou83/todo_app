interface Props {
  html: string
  onToggleCheckbox?: (newHtml: string) => void
}

function toggleCheckboxInHtml(html: string, index: number): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const items = doc.querySelectorAll('[data-type="taskItem"]')
  const item = items[index]
  if (!item) return html
  const checked = item.getAttribute('data-checked') === 'true'
  item.setAttribute('data-checked', checked ? 'false' : 'true')
  return doc.body.innerHTML
}

function renderNode(node: ChildNode, idx: number, onToggle: ((index: number) => void) | undefined, checkboxIndex: { current: number }): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent

  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element

  if (el.getAttribute('data-type') === 'taskList') {
    return (
      <ul key={idx} className="flex flex-col gap-1 my-1">
        {Array.from(el.childNodes).map((child, i) => renderNode(child, i, onToggle, checkboxIndex))}
      </ul>
    )
  }

  if (el.getAttribute('data-type') === 'taskItem') {
    const checked = el.getAttribute('data-checked') === 'true'
    const ci = checkboxIndex.current++
    const text = el.textContent ?? ''
    return (
      <li key={idx} className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggle?.(ci) }}
          className={`w-3.5 h-3.5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${checked ? 'bg-teal-500 border-teal-500' : 'border-slate-300 hover:border-teal-400'} ${onToggle ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={checked ? 'Décocher' : 'Cocher'}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>
        <span className={`text-xs leading-relaxed ${checked ? 'line-through text-slate-400' : 'text-slate-600'}`}>{text}</span>
      </li>
    )
  }

  if (el.tagName === 'UL') {
    return (
      <ul key={idx} className="flex flex-col gap-1 my-1">
        {Array.from(el.childNodes).map((child, i) => renderNode(child, i, onToggle, checkboxIndex))}
      </ul>
    )
  }

  if (el.tagName === 'LI') {
    return (
      <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" aria-hidden="true" />
        <span>{Array.from(el.childNodes).map((child, i) => renderNode(child, i, onToggle, checkboxIndex))}</span>
      </li>
    )
  }

  if (el.tagName === 'A') {
    const href = el.getAttribute('href') ?? ''
    return (
      <a
        key={idx}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-teal-600 hover:text-teal-700 underline underline-offset-2 break-all"
      >
        {Array.from(el.childNodes).map((child, i) => renderNode(child, i, onToggle, checkboxIndex))}
      </a>
    )
  }

  if (el.tagName === 'P') {
    return (
      <p key={idx} className="text-xs text-slate-500 leading-relaxed">
        {Array.from(el.childNodes).map((child, i) => renderNode(child, i, onToggle, checkboxIndex))}
      </p>
    )
  }

  // fallback: render children or text
  const children = Array.from(el.childNodes).map((child, i) => renderNode(child, i, onToggle, checkboxIndex)).filter(Boolean)
  if (children.length > 0) return <span key={idx} className="text-xs text-slate-500">{children}</span>
  const text = el.textContent ?? ''
  if (!text.trim()) return null
  return <span key={idx} className="text-xs text-slate-500">{text}</span>
}

export default function DescriptionRenderer({ html, onToggleCheckbox }: Props) {
  if (!html) return null

  // Plain text (no HTML)
  if (!html.trim().startsWith('<')) {
    return <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{html}</p>
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const taskItems = doc.querySelectorAll('[data-type="taskItem"]')
  const checkedCount = doc.querySelectorAll('[data-type="taskItem"][data-checked="true"]').length
  const totalCount = taskItems.length

  function handleToggle(index: number) {
    if (!onToggleCheckbox) return
    onToggleCheckbox(toggleCheckboxInHtml(html, index))
  }

  const checkboxIndex = { current: 0 }
  const nodes = Array.from(doc.body.childNodes).map((node, i) =>
    renderNode(node, i, onToggleCheckbox ? handleToggle : undefined, checkboxIndex)
  ).filter(Boolean)

  if (!nodes.length) return null

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {totalCount > 0 && (
        <div className="mb-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-semibold text-slate-400">{checkedCount}/{totalCount}</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
      {nodes}
    </div>
  )
}
