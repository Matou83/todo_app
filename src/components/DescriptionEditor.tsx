import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function DescriptionEditor({ value, onChange, placeholder = 'Description optionnelle…' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, code: false, horizontalRule: false }),
      TaskList,
      TaskItem.configure({
      nested: false,
      HTMLAttributes: {
        style: 'display:flex;flex-direction:row;align-items:center;gap:8px;',
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

  // Sync value when modal re-opens with a different task
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(value || '')
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null

  const isTaskList = editor.isActive('taskList')
  const isBulletList = editor.isActive('bulletList')

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
