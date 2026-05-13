import { useEffect, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'

function refreshCheckedStyles(dom: Element) {
  dom.querySelectorAll('li[data-checked]').forEach(li => {
    const div = li.querySelector(':scope > div') as HTMLElement | null
    if (!div) return
    const checked = (li as HTMLElement).dataset.checked === 'true'
    div.style.textDecoration = checked ? 'line-through' : ''
    div.style.color = checked ? '#94a3b8' : ''
  })
}

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function DescriptionEditor({ value, onChange, placeholder = 'Description optionnelle…' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, code: false, horizontalRule: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'tiptap-link',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: false,
        HTMLAttributes: {
          style: 'display:flex;flex-direction:row;align-items:flex-start;gap:8px;',
        },
      }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.isEmpty ? '' : editor.getHTML()
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor min-h-[80px] text-sm text-[#134E4A] focus:outline-none',
      },
    },
  })

  // Apply strikethrough on checked task items
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom

    // Initial pass for pre-checked items
    refreshCheckedStyles(dom)

    // Listen to checkbox changes directly — use input.checked (not data-checked)
    // to avoid any timing dependency on when Tiptap updates the attribute
    function handleChange(e: Event) {
      const input = e.target as HTMLInputElement
      if (input.type !== 'checkbox') return
      const li = input.closest('li') as HTMLElement | null
      if (!li) return
      const div = li.querySelector(':scope > div') as HTMLElement | null
      if (!div) return
      div.style.textDecoration = input.checked ? 'line-through' : ''
      div.style.color = input.checked ? '#94a3b8' : ''
    }

    dom.addEventListener('change', handleChange)
    return () => dom.removeEventListener('change', handleChange)
  }, [editor])

  // Sync value when modal re-opens with a different task, then re-apply styles
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(value || '')
      requestAnimationFrame(() => refreshCheckedStyles(editor.view.dom))
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const openLinkPopup = useCallback(() => {
    if (!editor) return
    const existing = editor.getAttributes('link').href ?? ''
    setLinkUrl(existing)
    setShowLinkInput(true)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor) return
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor])

  if (!editor) return null

  const isTaskList = editor.isActive('taskList')
  const isBulletList = editor.isActive('bulletList')
  const isLink = editor.isActive('link')

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-transparent transition-shadow">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100 bg-slate-50">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleTaskList().run() }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isTaskList ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          title="Liste de cases à cocher"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="2" width="5" height="5" rx="1" />
            <path strokeLinecap="round" d="M2.5 4.5l1 1L5 4" />
            <path strokeLinecap="round" d="M8 4.5h7M8 11.5h7" />
            <rect x="1" y="9" width="5" height="5" rx="1" />
          </svg>
          Checkbox
        </button>

        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isBulletList ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          title="Liste à puces"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="2" cy="5" r="1.5" />
            <circle cx="2" cy="11" r="1.5" />
            <path d="M5 5h9M5 11h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          Puce
        </button>

        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); openLinkPopup() }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isLink ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          title="Ajouter un lien"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
            <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
          </svg>
          Lien
        </button>

        {(isTaskList || isBulletList) && (
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault()
              if (isTaskList) editor.chain().focus().toggleTaskList().run()
              else editor.chain().focus().toggleBulletList().run()
            }}
            className="ml-auto px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Texte simple"
          >
            Texte
          </button>
        )}
      </div>

      {/* Link input popup */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/80">
          <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
            <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
          </svg>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') }
            }}
            placeholder="https://exemple.com"
            className="flex-1 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
            autoFocus
          />
          <button
            type="button"
            onClick={applyLink}
            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors cursor-pointer"
          >
            OK
          </button>
          {isLink && (
            <button
              type="button"
              onClick={removeLink}
              className="px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              Supprimer
            </button>
          )}
        </div>
      )}

      {/* Editor area */}
      <div className="px-3.5 py-2.5 relative">
        {editor.isEmpty && (
          <p className="absolute top-2.5 left-3.5 text-sm text-slate-400 pointer-events-none select-none">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
