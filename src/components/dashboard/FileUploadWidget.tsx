'use client'

import { useState, useCallback, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface FileUploadWidgetProps {
  onUploadComplete?: () => void
}

export function FileUploadWidget({ onUploadComplete }: FileUploadWidgetProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setError(null)
    setUploadSuccess(false)
    setIsUploading(true)

    try {
      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('You must be logged in to upload files')
        setIsUploading(false)
        return
      }

      // Step 1: Parse the file with AI
      const parseFormData = new FormData()
      parseFormData.append('file', file)

      const parseResponse = await fetch('/api/parse-file', {
        method: 'POST',
        body: parseFormData,
        keepalive: true
      })

      const parseResult = await parseResponse.json()

      if (!parseResponse.ok || !parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse file')
      }

      // Step 2: Upload file with parsed data
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('parsed_data', JSON.stringify(parseResult))

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: uploadFormData,
        keepalive: true
      })

      const uploadResult = await uploadResponse.json() as { success?: boolean; error?: string }

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      // Success! File uploaded and transactions saved
      setUploadSuccess(true)
      setIsUploading(false)

      // Step 3: Categorize in background (don't wait for it)
      fetch('/api/categorize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName: file.name })
      })
        .then(res => res.json())
        .then(result => console.log('✅ Background categorization complete:', result))
        .catch(err => console.error('❌ Background categorization failed:', err))

      // Call completion callback immediately to refresh data (no page reload)
      onUploadComplete?.()

      // Keep success message visible longer so user sees it
      setTimeout(() => {
        setSelectedFile(null)
        setUploadSuccess(false)
      }, 5000)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      setIsUploading(false)
    }
  }, [onUploadComplete])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])


  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all ${
          isDragging
            ? 'border-green-500 bg-green-500/10'
            : 'border-[rgb(60,60,60)] bg-[rgb(20,20,20)] hover:border-green-500/60 hover:bg-[rgb(25,25,25)]'
        }`}
      >
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center px-6 py-10 cursor-pointer"
        >
          <motion.div
            animate={{ scale: isDragging ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-12 w-12 ${isDragging ? 'text-green-500' : 'text-green-600'}`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25a.75.75 0 01.75.75v9.638l2.22-2.22a.75.75 0 111.06 1.061l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 011.06-1.061l2.22 2.22V3a.75.75 0 01.75-.75zM4.5 15a.75.75 0 01.75.75v1.5A1.75 1.75 0 007 19h10a1.75 1.75 0 001.75-1.75v-1.5a.75.75 0 011.5 0v1.5A3.25 3.25 0 0117 20.75H7A3.25 3.25 0 013.75 17.25v-1.5A.75.75 0 014.5 15z"
                clipRule="evenodd"
              />
            </svg>
          </motion.div>

          <span className="mt-4 text-sm font-medium text-gray-200">
            {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
          </span>
          <span className="mt-1 text-xs text-gray-400">
            CSV, Excel, or PDF up to 10MB
          </span>

          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-4"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">AI Analysis Failed</p>
                  <p className="text-xs text-red-300/80 mt-1">{error}</p>

                  {/* Show helpful message for common errors */}
                  {error.includes('rate') && (
                    <p className="text-xs text-gray-400 mt-2">
                      The AI service is temporarily busy. Please try again in a moment.
                    </p>
                  )}
                  {error.includes('date') && (
                    <p className="text-xs text-gray-400 mt-2">
                      Could not detect date column. Make sure your file has a date field.
                    </p>
                  )}
                  {error.includes('amount') && (
                    <p className="text-xs text-gray-400 mt-2">
                      Could not detect transaction amounts. Check if your file has amount columns.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full border-4 border-gray-700 border-t-green-500 animate-spin"></div>
              <div>
                <p className="text-sm font-medium text-gray-200">Processing file...</p>
                <p className="text-xs text-gray-400">
                  {selectedFile?.name} • Parsing, uploading, and categorizing
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success State */}
      <AnimatePresence>
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-green-500/30 bg-green-500/10 p-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-400">Upload complete!</p>
                <p className="text-xs text-green-300/80">
                  Transactions saved • Categorization running in background
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
