import Spinner from './Spinner.jsx'
import EmptyState from './EmptyState.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'

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
      <table className="orders-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className || ''}>
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
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className || ''}>
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
