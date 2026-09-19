import Spinner from './Spinner.jsx'
import EmptyState from './EmptyState.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'

// Flat admin table: light borders, subtle row hover, clean minimalist styling.
export default function Table({ columns, rows, rowKey, loading, empty, onRowClick }) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label={t('loadingData')} />
      </div>
    )
  }
  if (!rows || rows.length === 0) {
    return <EmptyState message={empty || t('noData')} />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-start text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-800/40 text-start">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 text-start text-xs font-semibold text-text-muted uppercase tracking-wider ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface-800/70' : 'hover:bg-surface-800/40'}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3.5 align-middle text-xs sm:text-sm text-text-main ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
