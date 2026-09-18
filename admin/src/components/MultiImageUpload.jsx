import { useState, useRef } from 'react'
import {
  UploadCloud,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Star,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { useLanguage } from '../context/LanguageContext.jsx'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function MultiImageUpload({ images = [], onChange, type = 'products' }) {
  const { t, isRTL } = useLanguage()
  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)

  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [replaceIndex, setReplaceIndex] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Normalize incoming images to standard array of objects
  const normalizedImages = (images || [])
    .map((img, idx) => {
      if (typeof img === 'string') {
        return { url: img, isPrimary: idx === 0, sortOrder: idx }
      }
      return {
        url: img?.url || '',
        isPrimary: Boolean(img?.isPrimary ?? idx === 0),
        sortOrder: img?.sortOrder ?? idx,
      }
    })
    .filter((img) => Boolean(img.url))

  // Validate a single file client-side
  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return t('errFileType') || 'نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('errFileSize') || 'حجم الملف يتجاوز الحد الأقصى المسموح به (5 ميغابايت).'
    }
    return null
  }

  // Upload handler for multiple/single files
  const handleUploadFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return

    setErrorMessage('')
    setSuccessMessage('')

    const filesToUpload = Array.from(fileList)

    // Validate all files first
    for (const file of filesToUpload) {
      const error = validateFile(file)
      if (error) {
        setErrorMessage(`${file.name}: ${error}`)
        return
      }
    }

    setUploading(true)

    try {
      const formData = new FormData()
      filesToUpload.forEach((file) => {
        formData.append('images', file)
      })

      const endpoint = type === 'packages' ? '/uploads/packages' : '/uploads/products'
      const response = await api.upload(endpoint, formData)

      const uploadedFiles = response?.files || (response?.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [])
      const newUrls = uploadedFiles.map((f) => f.url).filter(Boolean)

      if (newUrls.length === 0) {
        throw new Error(t('errUploadGeneric') || 'لم يتم استلام أي رابط للملفات المرفوعة')
      }

      // Append new images
      const hadNoImages = normalizedImages.length === 0
      const newItems = newUrls.map((url, i) => ({
        url,
        isPrimary: hadNoImages && i === 0,
        sortOrder: normalizedImages.length + i,
      }))

      const updated = [...normalizedImages, ...newItems]
      onChange(updated)
      setSuccessMessage(t('uploadSuccess') || 'تم رفع الصور بنجاح')
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      setErrorMessage(err.message || t('errUploadGeneric') || 'فشل رفع الصور، يرجى المحاولة مرة أخرى')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle replacing a specific image in place
  const handleReplaceFile = async (file) => {
    if (!file || replaceIndex === null) return

    setErrorMessage('')
    setSuccessMessage('')

    const validationError = validateFile(file)
    if (validationError) {
      setErrorMessage(`${file.name}: ${validationError}`)
      setReplaceIndex(null)
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('images', file)

      const endpoint = type === 'packages' ? '/uploads/packages' : '/uploads/products'
      const response = await api.upload(endpoint, formData)

      const uploadedFiles = response?.files || (response?.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [])
      const newUrl = uploadedFiles[0]?.url

      if (!newUrl) {
        throw new Error(t('errUploadGeneric') || 'فشل الحصول على رابط الصورة المرفوعة')
      }

      const updated = [...normalizedImages]
      updated[replaceIndex] = {
        ...updated[replaceIndex],
        url: newUrl,
      }

      onChange(updated)
      setSuccessMessage(t('uploadSuccess') || 'تم استبدال الصورة بنجاح')
      setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      setErrorMessage(err.message || t('errUploadGeneric') || 'فشل استبدال الصورة')
    } finally {
      setUploading(false)
      setReplaceIndex(null)
      if (replaceInputRef.current) {
        replaceInputRef.current.value = ''
      }
    }
  }

  // Trigger file browser for replacing an image
  const triggerReplace = (index) => {
    setReplaceIndex(index)
    if (replaceInputRef.current) {
      replaceInputRef.current.click()
    }
  }

  // Drag and drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set false if leaving the container
    if (e.currentTarget.contains(e.relatedTarget)) return
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  // Image actions: Delete, Set Primary, Move
  const handleRemove = (index) => {
    const updated = normalizedImages.filter((_, i) => i !== index)
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0].isPrimary = true
    }
    onChange(updated.map((img, idx) => ({ ...img, sortOrder: idx })))
  }

  const handleSetPrimary = (index) => {
    const target = normalizedImages[index]
    const rest = normalizedImages.filter((_, i) => i !== index)
    const reordered = [{ ...target, isPrimary: true }, ...rest.map((img) => ({ ...img, isPrimary: false }))]
    onChange(reordered.map((img, idx) => ({ ...img, sortOrder: idx })))
  }

  const handleMove = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= normalizedImages.length) return
    const updated = [...normalizedImages]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onChange(
      updated.map((img, idx) => ({
        ...img,
        sortOrder: idx,
        isPrimary: idx === 0,
      }))
    )
  }

  const PrevIcon = isRTL ? ArrowRight : ArrowLeft
  const NextIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files)
          }
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleReplaceFile(e.target.files[0])
          }
        }}
      />

      {/* Error & Success Banners */}
      {errorMessage && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-danger-950/80 border border-danger-800/80 text-danger-300 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-danger-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-ok-950/80 border border-ok-800/80 text-ok-300 text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!uploading && fileInputRef.current) {
            fileInputRef.current.click()
          }
        }}
        className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none group ${
          isDragging
            ? 'border-brand-400 bg-brand-950/50 scale-[1.01] shadow-lg shadow-brand-500/10'
            : 'border-line/80 bg-ink-950/40 hover:border-brand-500/60 hover:bg-ink-950/70'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="relative mb-3.5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-800/90 border border-line text-brand-400 group-hover:scale-110 group-hover:border-brand-500/50 group-hover:bg-brand-950/60 transition-all">
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
            ) : (
              <UploadCloud className="h-7 w-7" />
            )}
          </div>
          {!uploading && (
            <span className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
              <Plus className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-white mb-1 group-hover:text-brand-300 transition-colors">
          {uploading
            ? (t('uploadingImages') || 'جارِ رفع الصور إلى الخادم…')
            : (t('dragAndDrop') || 'اسحب الصور وأفلتها هنا')}
        </h3>

        <p className="text-xs text-[#8b80a8] mb-3 text-center">
          {t('orBrowse') || 'أو اضغط لاختيار الصور من جهازك مباشرة'}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600/90 group-hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-colors">
          <Plus className="h-4 w-4" />
          <span>{t('chooseImages') || 'اختيار صور من الجهاز'}</span>
        </div>

        <p className="text-[11px] text-[#6f6488] mt-3 font-medium">
          {t('uploadFormatHint') || 'الصيغ المدعومة: JPG، PNG، WEBP — الحد الأقصى: 5 ميغابايت لكل صورة'}
        </p>
      </div>

      {/* Uploaded Images Gallery / List */}
      {normalizedImages.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-[#8b80a8] border-b border-line pb-2">
            <span>
              {normalizedImages.length} {t('colImages') || 'صور مضافة'}
            </span>
            <span className="text-[11px]">
              {t('primaryImageHint') || 'الصورة الأولى أو المعلمة بنجمة هي صورة الغلاف الرئيسية'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {normalizedImages.map((img, index) => {
              const isFirst = index === 0 || img.isPrimary
              return (
                <div
                  key={`${img.url}-${index}`}
                  className={`relative group rounded-2xl border p-3 transition-all flex flex-col justify-between ${
                    isFirst
                      ? 'border-brand-500/80 bg-brand-950/20 shadow-md shadow-brand-500/5 ring-1 ring-brand-500/30'
                      : 'border-line bg-ink-900/40 hover:border-line-soft'
                  }`}
                >
                  {/* Image Preview & Badge */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-surface-900 border border-line/40 shadow-inner">
                    <img
                      src={img.url}
                      alt={`صورة ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://placehold.co/300x400/211839/a78bfa?text=Image+Not+Found'
                      }}
                    />

                    {/* Primary Badge */}
                    {isFirst && (
                      <span className="absolute top-2.5 start-2.5 inline-flex items-center gap-1 rounded-lg bg-brand-600/95 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {t('primaryImage') || 'الرئيسية'}
                      </span>
                    )}

                    {/* Sequence Badge */}
                    <span className="absolute bottom-2.5 end-2.5 rounded-lg bg-black/75 px-2 py-0.5 text-[11px] font-mono text-white/90 backdrop-blur-sm border border-white/10">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Path info */}
                  <p
                    dir="ltr"
                    className="text-[10px] font-mono text-[#8b80a8] truncate px-1 my-2.5 select-all"
                    title={img.url}
                  >
                    {img.url}
                  </p>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between gap-1 border-t border-line/50 pt-2.5 text-xs">
                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, index - 1)}
                        className="rounded-lg border border-line bg-surface-800/90 p-1.5 text-[#a79cc4] transition-colors hover:bg-surface-700 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                        title={t('moveForward') || 'تحريك للأمام'}
                      >
                        <PrevIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === normalizedImages.length - 1}
                        onClick={() => handleMove(index, index + 1)}
                        className="rounded-lg border border-line bg-surface-800/90 p-1.5 text-[#a79cc4] transition-colors hover:bg-surface-700 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                        title={t('moveBackward') || 'تحريك للخلف'}
                      >
                        <NextIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1">
                      {/* Replace Image */}
                      <button
                        type="button"
                        onClick={() => triggerReplace(index)}
                        className="rounded-lg border border-line bg-surface-800/90 p-1.5 text-[#a79cc4] transition-colors hover:bg-surface-700 hover:text-white"
                        title={t('replaceImage') || 'استبدال الصورة'}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>

                      {/* Set as Primary */}
                      {!isFirst && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(index)}
                          className="rounded-lg border border-brand-500/40 bg-brand-950/40 px-2 py-1 text-[11px] font-bold text-brand-300 transition-colors hover:bg-brand-600 hover:text-white"
                          title={t('setAsPrimary') || 'تعيين كصورة رئيسية'}
                        >
                          {t('setAsPrimary') || 'رئيسية'}
                        </button>
                      )}

                      {/* Delete Image */}
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="rounded-lg border border-danger-900/40 bg-danger-950/30 p-1.5 text-danger-400 transition-colors hover:bg-danger-900/60 hover:text-danger-200"
                        title={t('deleteImage') || 'حذف الصورة'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
