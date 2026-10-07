import { useEffect, useState, type ReactNode } from 'react';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { copyText, downloadText } from '../teams/paste';
import { showToast } from '../store';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  mode: 'import' | 'export';
  /** Export: the text shown. Import: optional starting text. */
  text?: string;
  /** Import: return an error message to keep the dialog open, or nothing to close it. */
  onImport?: (text: string) => string | void;
  filename?: string;
  /** Extra controls above the text area (e.g. the import format button). */
  extra?: ReactNode;
  note?: ReactNode;
}

/** Showdown team text in/out: paste box with clipboard read/write and .txt download. */
export function PasteModal({ open, onClose, title, mode, text = '', onImport, filename = 'team.txt', extra, note }: Props) {
  const [value, setValue] = useState(text);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setValue(text); setError(''); } }, [open, text]);

  const paste = async () => {
    try { setValue(await navigator.clipboard.readText()); setError(''); }
    catch { setError('The browser blocked clipboard access — paste into the box with Ctrl/Cmd+V instead.'); }
  };
  const submit = () => {
    if (!value.trim()) { setError('Paste a team first.'); return; }
    const err = onImport?.(value);
    if (err) setError(err); else onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" className="paste"
      footer={mode === 'import' ? (
        <>
          <button className="btn btn--ghost" onClick={paste}><Icon name="download" size={14} /> Paste from clipboard</button>
          {text && <button className="btn btn--ghost" onClick={async () => showToast((await copyText(value)) ? 'Copied to clipboard.' : 'Could not copy — select the text and copy it manually.')}><Icon name="copy" size={14} /> Copy</button>}
          <button className="btn btn--primary btn--sm" onClick={submit}>Import</button>
        </>
      ) : (
        <>
          <button className="btn btn--ghost" onClick={async () => showToast((await copyText(value)) ? 'Copied to clipboard.' : 'Could not copy — select the text and copy it manually.')}><Icon name="copy" size={14} /> Copy</button>
          <button className="btn btn--ghost" onClick={() => downloadText(filename, value)}><Icon name="upload" size={14} /> Download .txt</button>
        </>
      )}>
      {extra}
      {note && <p className="dim small">{note}</p>}
      <textarea className="paste__text" data-autofocus value={value} readOnly={mode === 'export'} spellCheck={false}
        placeholder={mode === 'import' ? 'Paste a Pokémon Showdown team export here…' : ''} aria-label="Team text"
        onChange={(e) => { setValue(e.target.value); setError(''); }} onFocus={(e) => mode === 'export' && e.currentTarget.select()} />
      {error && <p className="paste__err" role="alert"><Icon name="alert" size={14} /> {error}</p>}
    </Modal>
  );
}

export function ConfirmModal({ open, onClose, title, message, confirmLabel, onConfirm }: {
  open: boolean; onClose: () => void; title: string; message: ReactNode; confirmLabel: string; onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md"
      footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn--danger-solid btn--sm" data-autofocus onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button></>}>
      <p>{message}</p>
    </Modal>
  );
}
