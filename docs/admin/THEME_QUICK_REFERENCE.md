# Quick Reference: Theme-Aware Form Components
## Arine Admin Panel - Developer Guide

**Last Updated:** 2026-09-19

---

## 🎯 Quick Start

### Always Use Shared Components First

```jsx
import { Input, Textarea, Select } from '../components/ui/Input.jsx'

// ✅ These are automatically theme-aware
<Input label="Product Name" value={name} onChange={setName} />
<Textarea label="Description" rows={4} value={desc} onChange={setDesc} />
<Select label="Category" value={cat} onChange={setCat}>
  <option value="">Select...</option>
</Select>
```

---

## 📝 Raw Input Patterns (When Needed)

### Standard Text Input
```jsx
<input
  type="text"
  className="w-full rounded-lg border border-line bg-white dark:bg-ink-900 px-3 py-2 text-sm text-gray-900 dark:text-[#f2eefb] placeholder:text-gray-400 dark:placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
/>
```

### Search Input (with Icon)
```jsx
<div className="relative">
  <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-gray-400 dark:text-[#6f6488]" />
  <input
    type="search"
    placeholder="Search..."
    className="w-full rounded-lg border border-line bg-white dark:bg-ink-900 py-2 pe-3 ps-9 text-sm text-gray-900 dark:text-[#f2eefb] placeholder:text-gray-400 dark:placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
  />
</div>
```

### Select Dropdown
```jsx
<select
  className="rounded-lg border border-line bg-white dark:bg-ink-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
>
  <option value="">Select option...</option>
  <option value="1">Option 1</option>
</select>
```

### Textarea
```jsx
<textarea
  rows={4}
  className="w-full rounded-lg border border-line bg-white dark:bg-ink-900 px-3 py-2 text-sm text-gray-900 dark:text-[#f2eefb] placeholder:text-gray-400 dark:placeholder:text-[#6f6488] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400"
/>
```

---

## 🎨 Color Reference

### Background Colors
| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Input/Select** | `bg-white` | `dark:bg-ink-900` |
| **Search/Filter** | `bg-white` | `dark:bg-surface-800` or `dark:bg-ink-900` |
| **Card/Container** | `bg-white` | `dark:bg-surface-900` |
| **Modal** | `bg-white` | `dark:bg-surface-900` |

### Text Colors
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Input Text** | `text-gray-900` | `dark:text-[#f2eefb]` or `dark:text-white` |
| **Placeholder** | `placeholder:text-gray-400` | `dark:placeholder:text-[#6f6488]` |
| **Icon** | `text-gray-400` | `dark:text-[#6f6488]` |
| **Label** | `text-gray-700` | `dark:text-[#c0b6d6]` |

### Border & Focus
| State | Light Mode | Dark Mode |
|-------|------------|-----------|
| **Border** | `border-line` | `border-line` (auto-adjusts) |
| **Focus Border** | `focus:border-brand-500` | `focus:border-brand-500` |
| **Focus Ring** | `focus:ring-brand-500` | `dark:focus:ring-brand-400` |

---

## ❌ Common Mistakes to Avoid

### DON'T - Hardcoded Dark Mode Only
```jsx
// ❌ WRONG - Only works in dark mode
<input className="bg-ink-900 text-white" />

// ❌ WRONG - Will be invisible in light mode
<input className="bg-surface-800 text-[#f2eefb]" />

// ❌ WRONG - No dark mode support
<input className="bg-white text-black" />
```

### DO - Theme-Aware
```jsx
// ✅ CORRECT - Works in both themes
<input className="bg-white dark:bg-ink-900 text-gray-900 dark:text-white" />

// ✅ CORRECT - Use shared component
<Input value={val} onChange={setVal} />
```

---

## 🧪 Testing Checklist

Before committing changes with form inputs:

- [ ] Test in **Light Mode** - All inputs visible and readable
- [ ] Test in **Dark Mode** - All inputs visible and readable
- [ ] **Switch themes** - No white flashing or layout shifts
- [ ] Check **placeholder text** - Visible in both modes
- [ ] Check **focus states** - Clear indicators in both modes
- [ ] Check **icons** (if any) - Adjust colors for both themes
- [ ] **Build verification** - Run `npm run build` to check for errors

---

## 📂 Where to Find Examples

### Best Reference Files:
1. **`components/ui/Input.jsx`** - Global components (use these first!)
2. **`pages/Products.jsx`** - Search input + select dropdowns
3. **`pages/PackageForm.jsx`** - Book search with icon
4. **`pages/AdminTeam.jsx`** - Modal form with multiple inputs
5. **`pages/ActivityLog.jsx`** - Filter inputs and selects

---

## 🔧 Troubleshooting

### Issue: Input appears white in dark mode
**Solution:** Add `dark:bg-ink-900` or `dark:bg-surface-800`

### Issue: Text is unreadable
**Solution:** Add `text-gray-900 dark:text-white` or `dark:text-[#f2eefb]`

### Issue: Placeholder text invisible
**Solution:** Add `placeholder:text-gray-400 dark:placeholder:text-[#6f6488]`

### Issue: Icon doesn't show in light mode
**Solution:** Add `text-gray-400 dark:text-[#6f6488]` to icon component

### Issue: Focus state not visible
**Solution:** Add `focus:ring-1 focus:ring-brand-500 dark:focus:ring-brand-400`

---

## 🎓 Advanced Patterns

### Conditional Background (based on state)
```jsx
<input
  className={`
    rounded-lg border px-3 py-2 text-sm
    ${error 
      ? 'border-danger-400 bg-danger-50 dark:bg-danger-900/10' 
      : 'border-line bg-white dark:bg-ink-900'
    }
    text-gray-900 dark:text-white
    focus:border-brand-500 focus:outline-none
  `}
/>
```

### Search Input in Different Sizes
```jsx
// Small
<input className="... py-1.5 text-xs" />

// Medium (default)
<input className="... py-2 text-sm" />

// Large
<input className="... py-2.5 text-base" />
```

---

## 💡 Pro Tips

1. **Always use `border-line`** - It auto-adjusts for themes
2. **Use semantic colors** - `text-gray-900 dark:text-white` not hardcoded hex
3. **Test with real data** - Placeholders might hide issues
4. **Check RTL mode** - Use `start`/`end` instead of `left`/`right`
5. **Mobile testing** - Touch targets should be at least 44px

---

## 📞 Need Help?

- Check **`GLOBAL_THEME_FIX_SUMMARY.md`** for detailed implementation notes
- Look at existing fixed files for patterns
- Test in both themes before asking for review

---

**Last Updated:** 2026-09-19  
**Maintained by:** Arine Development Team
