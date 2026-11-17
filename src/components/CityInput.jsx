import { useId } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { cityLabel, titleCaseCity } from '../utils/cities'

// City field with suggestions from the courier's list: typing "فا" offers
// "فاس". Plain text input when the list is unavailable.
export default function CityInput({ cities, className, ...inputProps }) {
  const { language } = useLanguage()
  const listId = useId()

  return (
    <>
      <input type="text" autoComplete="address-level2" list={cities.length ? listId : undefined} className={className} {...inputProps} />
      {cities.length ? (
        <datalist id={listId}>
          {cities.map((c) => {
            const value = cityLabel(c, language)
            const other = language === 'ar' ? titleCaseCity(c.name) : c.nameAr
            return <option key={c.name} value={value} label={other && other !== value ? other : undefined} />
          })}
        </datalist>
      ) : null}
    </>
  )
}
