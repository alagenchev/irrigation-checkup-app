'use client'

import { useState, useRef, useEffect, useId, useCallback } from 'react'

interface AddressAutocompleteProps {
  name: string
  value: string
  onChange: (value: string) => void
  onSelect?: (address: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
}

export function AddressAutocomplete({
  name,
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  required,
  disabled,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const listId = useId()

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/address-suggest?q=${encodeURIComponent(query)}`)
      const data = await res.json() as string[]
      setSuggestions(data)
      setOpen(data.length > 0)
      setActiveIdx(-1)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setActiveIdx(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (newValue.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)
  }

  const handleSelect = (address: string) => {
    onChange(address)
    onSelect?.(address)
    setOpen(false)
    setSuggestions([])
    setActiveIdx(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

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
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
        onChange={handleChange}
        onFocus={() => {
          if (value.length >= 3 && suggestions.length > 0) setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      {!disabled && open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 50,
            top: '100%',
            left: 0,
            right: 0,
            background: '#1c1c1e',
            border: '1px solid #3a3a3c',
            borderRadius: 6,
            listStyle: 'none',
            margin: 0,
            padding: '4px 0',
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            color: '#ffffff',
          }}
        >
          {suggestions.map((address, i) => (
            <li
              key={address}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => handleSelect(address)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                background: i === activeIdx ? '#2c2c2e' : 'transparent',
                borderBottom: i < suggestions.length - 1 ? '1px solid #2c2c2e' : 'none',
              }}
            >
              {address}
            </li>
          ))}
        </ul>
      )}
      {loading && value.length >= 3 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            padding: '8px 12px',
            background: '#1c1c1e',
            border: '1px solid #3a3a3c',
            borderRadius: 6,
            fontSize: 13,
            color: '#a1a1aa',
          }}
        >
          Loading…
        </div>
      )}
    </div>
  )
}
