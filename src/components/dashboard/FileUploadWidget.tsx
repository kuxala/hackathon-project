'use client'

import { useState, useCallback, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseFile, ParseResult } from '@/services/fileParser'
import { supabase } from '@/lib/supabase'

interface FileUploadWidgetProps {
  onUploadComplete?: () => void
}

export function FileUploadWidget({ onUploadComplete }: FileUploadWidgetProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const uploadParsedFile = useCallback(async (result: ParseResult) => {
    if (!selectedFile) return

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('You must be logged in to upload files')
        setIsUploading(false)
        return
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('parsed_data', JSON.stringify(result))

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
        keepalive: true
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const uploadResult = await response.json()

      if (!response.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      // Success!
      setTimeout(() => {
        setSelectedFile(null)
        setParseResult(null)
        setUploadProgress(0)
        setIsUploading(false)
        onUploadComplete?.()
      }, 500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [selectedFile, onUploadComplete])

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setError(null)
    setParseResult(null)
    setShowConfirmation(false)

    // Validate file
    const validTypes = ['.csv', '.xlsx', '.xls', '.pdf']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!validTypes.includes(ext)) {
      setError('Invalid file type. Please upload CSV, Excel, or PDF files.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.')
      return
    }

    // Parse file for preview (SERVER-SIDE with AI)
    try {

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
        keepalive: true // Continue fetch even if user switches tabs
      })

      const result = await response.json()

      setParseResult(result)

      if (!result.success) {
        setError(result.error || 'Failed to parse file')
        setIsUploading(false) // Hide loading state
      } else {
        // Auto-upload without confirmation (confirmation disabled)
        await uploadParsedFile(result)
        // Show confirmation modal after successful parse (DISABLED)
        // setShowConfirmation(true)
      }
    } catch (err) {
      console.error('❌ Parse error:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      setIsUploading(false) // Hide loading state on error
    }
  }, [])

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

  const handleReparse = useCallback(async () => {
    if (!selectedFile) return

    setError(null)
    setParseResult(null)
    setShowConfirmation(false)

    // Re-parse the file (SERVER-SIDE)
    try {

      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
        keepalive: true // Continue fetch even if user switches tabs
      })

      const result = await response.json()

      setParseResult(result)

      if (!result.success) {
        setError(result.error || 'Failed to parse file')
      } else {
        setShowConfirmation(true)
      }
    } catch (err) {
      console.error('❌ Re-parse error:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    }
  }, [selectedFile])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !parseResult?.success) return

    setShowConfirmation(false)
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('You must be logged in to upload files')
        setIsUploading(false)
        return
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('parsed_data', JSON.stringify(parseResult))

      // Simulate progress (since FormData doesn't support progress events easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Success!
      setTimeout(() => {
        setSelectedFile(null)
        setParseResult(null)
        setUploadProgress(0)
        setIsUploading(false)
        onUploadComplete?.()
      }, 500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [selectedFile, parseResult, onUploadComplete])

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

              {/* Retry button */}
              {selectedFile && (
                <button
                  onClick={() => {
                    setError(null)
                    handleFileSelect(selectedFile)
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isUploading && !parseResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-6"
          >
            <div className="flex flex-col items-center gap-4">
              {/* Animated Spinner with Dots */}
              <div className="relative h-20 w-20">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 rounded-full border-4 border-gray-700/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-green-500 border-r-green-400 animate-spin"></div>

                {/* Inner pulsing dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="h-3 w-3 rounded-full bg-green-500"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </div>

              {/* Loading Text with Animation */}
              <div className="text-center space-y-2">
                <motion.p
                  className="text-sm font-medium text-gray-200"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Analyzing file with AI...
                </motion.p>
                <div className="flex items-center gap-1 justify-center">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-green-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-green-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-green-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Detecting columns and categorizing transactions
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview */}
      <AnimatePresence>
        {selectedFile && parseResult?.success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {parseResult.transactions.length} transactions
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null)
                  setParseResult(null)
                }}
                className="text-gray-400 hover:text-gray-200"
                disabled={isUploading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Bank Info */}
            {parseResult.detectedBank && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Detected Bank</p>
                  <p className="text-sm font-medium text-blue-400">
                    {parseResult.detectedBank}
                    {parseResult.accountNumber && ` • ${parseResult.accountNumber}`}
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-400">Period</p>
                <p className="text-sm font-medium text-gray-200">
                  {parseResult.periodStart && parseResult.periodEnd
                    ? `${new Date(parseResult.periodStart).toLocaleDateString()} - ${new Date(parseResult.periodEnd).toLocaleDateString()}`
                    : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Income</p>
                <p className="text-sm font-medium text-green-500">
                  ${parseResult.totalCredits.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Spending</p>
                <p className="text-sm font-medium text-rose-500">
                  ${parseResult.totalDebits.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Confirmation or Upload Button */}
            {!showConfirmation ? (
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={isUploading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Review Before Upload
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-lg border-2 border-yellow-500/30 bg-yellow-500/10">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-500">Please Review the Data</p>
                      <p className="text-xs text-yellow-400/80 mt-1">
                        Check if the amounts look correct. If something seems wrong, try re-parsing or upload a different file.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleReparse}
                    disabled={isUploading}
                    className="flex-1 rounded-lg bg-gray-600 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    🔄 Re-parse
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    ✓ Looks Good, Upload
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setParseResult(null)
                    setShowConfirmation(false)
                  }}
                  className="w-full text-sm text-gray-400 hover:text-gray-200"
                >
                  Cancel & Choose Different File
                </button>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="h-2 w-full bg-[rgb(30,30,30)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-center text-gray-400">
                  {uploadProgress}% complete
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
