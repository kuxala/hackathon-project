'use client'

import { ChangeEvent, useCallback, useState } from 'react'

import { Modal } from '@/components/shared/Modal'

import { ChatWidget } from './components/ChatWidget'
import { DashboardHeader } from './components/DashboardHeader'

interface DashboardExampleProps {
  user?: {
    id?: string
    email?: string
  }
  onSignOut?: () => void
}

export default function DashboardExample({ user, onSignOut }: DashboardExampleProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleCloseModal = useCallback(() => {
    setIsImportModalOpen(false)
    setSelectedFiles([])
  }, [])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files

    if (!fileList?.length) {
      return
    }

    setSelectedFiles(previous => {
      const previousSignatures = new Set(
        previous.map(file => `${file.name}-${file.size}-${file.lastModified}`)
      )

      const incomingFiles = Array.from(fileList).filter(file => {
        const signature = `${file.name}-${file.size}-${file.lastModified}`

        if (previousSignatures.has(signature)) {
          return false
        }

        previousSignatures.add(signature)
        return true
      })

      if (!incomingFiles.length) {
        return previous
      }

      return [...previous, ...incomingFiles]
    })

    // Reset the value so the same file can be selected again later if needed.
    event.target.value = ''
  }, [])

  const handleUpload = useCallback(() => {
    if (!selectedFiles.length) {
      return
    }

    // TODO: integrate with backend upload endpoint
    console.log('Uploading files:', selectedFiles.map(file => file.name))
    handleCloseModal()
  }, [handleCloseModal, selectedFiles])

  return (
    <div className="flex min-h-screen w-full flex-col relative bg-[rgb(10,10,10)]">
      <DashboardHeader user={user} onSignOut={onSignOut} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-50">Financial Overview</h1>
              <p className="mt-1 text-base text-gray-400">Your financial health at a glance</p>
            </div>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Import
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] p-6 shadow-sm lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-medium text-gray-200">Spending vs. Income</p>
                  <p className="text-3xl font-bold tracking-tight text-gray-50">$12,500</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <p className="text-sm text-gray-400">Last 12 Months</p>
                    <p className="text-sm font-medium text-green-500">+5%</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded bg-primary/20 px-3 py-1 text-sm font-medium text-primary">Income</button>
                  <button className="rounded bg-[rgb(30,30,30)] px-3 py-1 text-sm font-medium text-gray-300">Spending</button>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <svg fill="none" height="100%" preserveAspectRatio="none" viewBox="0 0 472 150" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25" stroke="#12a159" strokeLinecap="round" strokeWidth="2.5"></path>
                  <path d="M0 130 C 18.1538 130 18.1538 80 36.3077 80 C 54.4615 80 54.4615 100 72.6154 100 C 90.7692 100 90.7692 60 108.923 60 C 127.077 60 127.077 90 145.231 90 C 163.385 90 163.385 50 181.538 50 C 199.692 50 199.692 80 217.846 80 C 236 80 236 110 254.154 110 C 272.308 110 272.308 70 290.462 70 C 308.615 70 308.615 95 326.769 95 C 344.923 95 344.923 65 363.077 65 C 381.231 65 381.231 105 399.385 105 C 417.538 105 417.538 75 435.692 75 C 453.846 75 453.846 115 472 115" stroke="#a78bfa" strokeLinecap="round" strokeOpacity="0.5" strokeWidth="2.5"></path>
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] p-6 shadow-sm lg:col-span-2">
              <div>
                <p className="text-base font-medium text-gray-200">Loan &amp; Debt Overview</p>
                <p className="text-3xl font-bold tracking-tight text-gray-50">$25,000</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <p className="text-sm text-gray-400">Current</p>
                  <p className="text-sm font-medium text-red-500">-2%</p>
                </div>
              </div>
              <div className="grid h-[200px] grid-cols-4 items-end gap-4 px-2 pt-4">
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-primary" style={{height: '10%'}}></div>
                  <p className="text-xs font-medium text-gray-400">Mortgage</p>
                </div>
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-primary" style={{height: '25%'}}></div>
                  <p className="text-xs font-medium text-gray-400">Car Loan</p>
                </div>
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-rose-400" style={{height: '75%'}}></div>
                  <p className="text-xs font-medium text-gray-400">Credit Card</p>
                </div>
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-primary" style={{height: '40%'}}></div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Student Loan</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-background-light p-6 shadow-sm dark:border-primary/30 dark:bg-background-dark lg:col-span-1">
              <div>
                <p className="text-base font-medium text-gray-800 dark:text-gray-200">Budget &amp; Forecast</p>
                <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">$5,000</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Next 6 Months</p>
                  <p className="text-sm font-medium text-green-500">+10%</p>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <svg fill="none" height="100%" preserveAspectRatio="none" viewBox="0 0 472 150" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25 V 150 H 0 Z" fill="url(#paint0_linear_budget)"></path>
                  <path d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25" stroke="#f472b6" strokeLinecap="round" strokeWidth="2.5"></path>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_budget" x1="236" x2="236" y1="1" y2="150">
                      <stop stopColor="#f472b6" stopOpacity="0.3"></stop>
                      <stop offset="1" stopColor="#f472b6" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ChatWidget userId={user?.id} />

      <Modal isOpen={isImportModalOpen} onClose={handleCloseModal}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-50">Import Transactions</h2>
            <p className="mt-1 text-sm text-gray-400">Upload a CSV or Excel file to add your latest transactions.</p>
          </div>
          <button
            onClick={handleCloseModal}
            className="rounded-full p-2 text-gray-400 hover:text-gray-100 hover:bg-[rgb(25,25,25)]"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <label
            htmlFor="transaction-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[rgb(60,60,60)] bg-[rgb(20,20,20)] px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-[rgb(25,25,25)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12 2.25a.75.75 0 01.75.75v9.638l2.22-2.22a.75.75 0 111.06 1.061l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 011.06-1.061l2.22 2.22V3a.75.75 0 01.75-.75zM4.5 15a.75.75 0 01.75.75v1.5A1.75 1.75 0 007 19h10a1.75 1.75 0 001.75-1.75v-1.5a.75.75 0 011.5 0v1.5A3.25 3.25 0 0117 20.75H7A3.25 3.25 0 013.75 17.25v-1.5A.75.75 0 014.5 15z"
                clipRule="evenodd"
              />
            </svg>
            <span className="mt-4 text-sm font-medium text-gray-200">Click to upload files</span>
            <span className="mt-1 text-xs text-gray-400">CSV, XLSX, or PDF up to 10MB each</span>
            <input
              id="transaction-file"
              type="file"
              multiple
              accept=".csv,.xlsx,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {!!selectedFiles.length && (
          <div className="mt-6 rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-4">
            <p className="text-sm font-medium text-gray-200">Files ready to upload</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-400">
              {selectedFiles.map(file => (
                <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCloseModal}
            className="rounded-lg border border-[rgb(60,60,60)] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[rgb(25,25,25)]"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFiles.length}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload File
          </button>
        </div>
      </Modal>
    </div>
  );
}
