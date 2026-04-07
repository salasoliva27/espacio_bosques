/**
 * Shared chat input bar with file attachment support.
 * Used in: ServiceChatPanel, BidModal, ProposalSubmit, CreateProject.
 *
 * Supported attachment types:
 *   Images (jpg/png/gif/webp) → Claude vision blocks
 *   PDFs                      → Claude document blocks
 *   Text/md/csv               → appended as text context
 */
import { useRef, useState } from 'react';
import { Send, Paperclip, X, CheckCircle2 } from 'lucide-react';

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  base64: string;        // raw base64, no data-uri prefix
  text?: string;         // for plain-text files
  isImage: boolean;
  previewUrl?: string;   // object URL for image previews
}

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  /** Called when user hits Send. Passes current attachments and clears them. */
  onSend: (attachments: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
  /** When set, replaces the Send button with a green confirm button */
  confirmMode?: {
    label: string;
    onConfirm: () => void;
    disabled?: boolean;
  };
}

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,.md,.csv';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file

async function readAttachment(file: File): Promise<Attachment | null> {
  if (file.size > MAX_BYTES) {
    alert(`${file.name} is too large (max 5 MB).`);
    return null;
  }
  const isImage = file.type.startsWith('image/');
  const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv');

  return new Promise(resolve => {
    const reader = new FileReader();

    if (isText) {
      reader.readAsText(file);
      reader.onload = () => resolve({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        filename: file.name,
        mimeType: file.type || 'text/plain',
        base64: '',
        text: reader.result as string,
        isImage: false,
      });
    } else {
      // Read as data URL, strip prefix to get raw base64
      reader.readAsDataURL(file);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          filename: file.name,
          mimeType: file.type,
          base64,
          isImage,
          previewUrl: isImage ? dataUrl : undefined,
        });
      };
    }
    reader.onerror = () => resolve(null);
  });
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type a message…',
  multiline = false,
  confirmMode,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const results = await Promise.all(Array.from(files).map(readAttachment));
    const valid = results.filter(Boolean) as Attachment[];
    setAttachments(prev => [...prev, ...valid]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
      return prev.filter(a => a.id !== id);
    });
  };

  const handleSend = () => {
    if (!value.trim() && attachments.length === 0) return;
    onSend(attachments);
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const inputStyle: React.CSSProperties = {
    background: '#111c2a',
    border: '1px solid #1e2d3d',
    color: '#e8f4f0',
    outline: 'none',
    resize: 'none' as const,
    fontSize: '14px',
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
              style={{ background: '#1e2d3d', color: '#9ca3af', border: '1px solid #2d3f54' }}
            >
              {att.isImage && att.previewUrl ? (
                <img src={att.previewUrl} alt={att.filename} className="w-5 h-5 rounded object-cover" />
              ) : (
                <span style={{ color: '#00e5c4' }}>📎</span>
              )}
              <span className="max-w-[120px] truncate">{att.filename}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="hover:opacity-70"
                style={{ color: '#6b7280' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 items-end">
        {/* File upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2.5 rounded-xl flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ background: '#1e2d3d', color: '#6b7280', border: '1px solid #2d3f54' }}
          title="Attach file (images, PDF, text)"
        >
          <Paperclip size={15} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {/* Text field */}
        {multiline ? (
          <textarea
            className="flex-1 rounded-xl px-3 py-2.5"
            style={inputStyle}
            rows={2}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        ) : (
          <input
            className="flex-1 rounded-xl px-3 py-2.5 text-sm"
            style={inputStyle}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        )}

        {/* Send or Confirm button */}
        {confirmMode ? (
          <button
            onClick={confirmMode.onConfirm}
            disabled={confirmMode.disabled}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: '#10b981', color: '#fff' }}
          >
            <CheckCircle2 size={15} />
            {confirmMode.label}
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            className="p-2.5 rounded-xl flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
          >
            <Send size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
