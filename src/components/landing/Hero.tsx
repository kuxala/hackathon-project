'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, ChangeEvent } from 'react'

export default function Hero() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    // Convert file to base64 and store in localStorage
    const reader = new FileReader()
    reader.onload = () => {
      const fileData = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        content: reader.result as string,
        uploadedAt: new Date().toISOString()
      }
      localStorage.setItem('pendingFinancialFile', JSON.stringify(fileData))

      // Redirect to login page
      router.push('/login?redirect=analyze')
    }
    reader.readAsDataURL(selectedFile)
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-6 pt-20 relative">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h1 className="text-6xl md:text-8xl font-bold text-foreground mb-6 leading-tight">
          Your <span className="text-green-500">AI</span>
          <br />
          Finance Assistant
        </h1>

        <p className="text-xl md:text-2xl text-foreground/60 mb-12 max-w-2xl mx-auto">
          Upload your financial data and let AI provide <span className="text-green-400 font-semibold">instant insights</span>, analysis, and <span className="text-green-400 font-semibold">personalized recommendations</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <label
            htmlFor="financial-file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer px-8 py-4 rounded-lg border-2 border-dashed ${
              isDragging ? 'border-foreground bg-foreground/5' : 'border-border bg-foreground/[0.02]'
            } transition-all hover:border-foreground/60 hover:bg-foreground/5 font-medium text-lg`}
          >
            <span className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-foreground/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {selectedFile ? (
                <span className="text-foreground truncate max-w-[200px]">{selectedFile.name}</span>
              ) : (
                <span className="text-foreground/80">Upload File</span>
              )}
            </span>
            <input
              id="financial-file-upload"
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            onClick={handleAnalyze}
            disabled={!selectedFile}
            className="px-8 py-4 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze Now
          </button>
        </div>

        <div className="mt-6">
          <Link
            href="#features"
            className="text-foreground/60 hover:text-foreground transition-colors text-sm"
          >
            See how it works →
          </Link>
        </div>
      </div>
    </section>
  )
}
