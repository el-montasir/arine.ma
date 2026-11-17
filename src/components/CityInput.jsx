import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { MapPin, Check, ChevronDown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { cityLabel, titleCaseCity, normalizeCityName, closestCities } from '../utils/cities'

// City picker with the courier's list: type "فا" → "فاس" (picked as "Fes"). A custom dropdown
// (not <datalist>) so it looks like the store and works on every phone.
// Falls back to a plain text field when the list is unavailable.
export default function CityInput({ cities, value, onChange, className, placeholder, ...inputProps }) {
  const { language, t } = useLanguage()
  const listId = useId()
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const options = useMemo(
    () =>
      cities.map((c) => {
        const label = cityLabel(c, language)
        const other = language === 'ar' ? titleCaseCity(c.name) : c.nameAr
        return { key: c.name, label, other: other && other !== label ? other : null, n1: normalizeCityName(c.name), n2: normalizeCityName(c.nameAr) }
      }),
    [cities, language]
  )

  const query = normalizeCityName(value)
  // Every courier city when empty; otherwise prefix matches first, then
  // "contains", and for a misspelling the closest names ("did you mean").
  const { results, suggested } = useMemo(() => {
    if (!query) return { results: options, suggested: false }
    const starts = []
    const contains = []
    for (const o of options) {
      if (o.n1.startsWith(query) || o.n2.startsWith(query)) starts.push(o)
      else if (o.n1.includes(query) || o.n2.includes(query)) contains.push(o)
    }
    if (starts.length || contains.length) return { results: [...starts, ...contains], suggested: false }
    return { results: closestCities(options, query), suggested: true }
  }, [options, query])

  const selectedKey = useMemo(() => options.find((o) => (o.n1 && o.n1 === query) || (o.n2 && o.n2 === query))?.key, [options, query])

  // Close when tapping anywhere else.
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  // Keep the keyboard-highlighted option visible.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  if (!cities.length) {
    return <input type="text" autoComplete="address-level2" value={value} onChange={onChange} placeholder={placeholder} className={className} {...inputProps} />
  }

  // The field always gets the Latin name ("Fes"), whatever language the list
  // is shown in, so orders carry the courier's spelling.
  const choose = (o) => {
    onChange({ target: { value: titleCaseCity(o.key) } })
    setOpen(false)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`${className} pe-10`}
        {...inputProps}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={placeholder}
        onClick={() => setOpen((o) => !o)}
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-[#7A6D80]"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1.5 max-h-[min(18rem,45vh)] w-full overflow-y-auto overscroll-contain rounded-[14px] border border-[#EFE8F2] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(107,33,120,0.35)]"
        >
          {suggested && results.length > 0 ? (
            <li className="px-3 pb-1.5 pt-1 text-[0.74rem] font-semibold text-[#8F3AA1]">{t('cityDidYouMean')}</li>
          ) : null}
          {results.length === 0 ? (
            <li className="px-3 py-3 text-center text-[0.8rem] text-[#7A6D80]">{t('cityNoMatch')}</li>
          ) : (
            results.map((o, i) => (
              <li
                key={o.key}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.key === selectedKey}
                // Select on click (a touch that scrolls the list never clicks);
                // mousedown preventDefault keeps the input focused on desktop.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onPointerEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 ${
                  i === active ? 'bg-[#F5F1F7]' : ''
                }`}
              >
                <MapPin className="h-4 w-4 shrink-0 text-[#8F3AA1]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.88rem] font-semibold text-[#1C1220]">{o.label}</span>
                  {o.other ? <span className="block truncate text-[0.74rem] text-[#7A6D80]">{o.other}</span> : null}
                </span>
                {o.key === selectedKey ? <Check className="h-4 w-4 shrink-0 text-[#8F3AA1]" aria-hidden="true" /> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
