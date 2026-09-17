import Spinner from './Spinner.jsx'
import EmptyState from './EmptyState.jsx'

// Flat admin table: light borders, zebra-optional rows, sticky header.
export default function Table({ columns, rows, rowKey, loading, empty, onRowClick }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="جارِ التحميل…" />
      </div>
    )
  }
  if (!rows || rows.length === 0) {
    return <EmptyState message={empty || 'لا توجد بيانات بعد'} />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-soft text-start">
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-2.5 text-start text-xs font-semibold text-[#8b80a8] ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-line-soft/60 last:border-0 ${onRowClick ? 'cursor-pointer transition-colors hover:bg-surface-800/60' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-3 py-3 align-middle text-[#e3dcf0] ${col.className || ''}`}>
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