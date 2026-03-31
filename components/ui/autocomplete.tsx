'use client'

import { useState, useRef, useEffect, useId } from 'react'

export interface AutocompleteOption {
  label:        string
  address?:     string
  clientName?:  string
  clientAddress?: string
}

interface AutocompleteProps {
  name:         string
  value:        string
  onChange:     (value: string) => void
  onSelect?:    (option: AutocompleteOption) => void
  options:      AutocompleteOption[]
  placeholder?: string
  required?:    boolean
  label?:       string
}

export function Autocomplete({
  name, value, onChange, onSelect, options, placeholder, required, label,
}: AutocompleteProps) {
  const [open, setOpen]         = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLUListElement>(null)
  const listId    = useId()

  const filtered = value.trim()
    ? options.filter(o => o.label.toLowerCase().includes(value.toLowerCase()))
    : options

  useEffect(() => {
    setActiveIdx(-1)
  }, [value])

  function handleSelect(opt: AutocompleteOption) {
    onChange(opt.label)
    onSelect?.(opt)
    setOpen(false)
    setActiveIdx(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {label && <label htmlFor={name}>{label}</label>}
      <input
        ref={inputRef}
        id={name}
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          style={{
            position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0,
            background: '#1c1c1e', border: '1px solid #3a3a3c', borderRadius: 6,
            listStyle: 'none', margin: 0, padding: '4px 0', maxHeight: 220, overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)', color: '#ffffff',
          }}
        >
          {filtered.map((opt, i) => (
            <li
              key={opt.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => handleSelect(opt)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: i === activeIdx ? '#2c2c2e' : 'transparent',
                borderBottom: i < filtered.length - 1 ? '1px solid #2c2c2e' : 'none',
              }}
            >
              <span style={{ fontWeight: 500 }}>{opt.label}</span>
              {opt.address && (
                <span style={{ display: 'block', fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>
                  {opt.address}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
