'use client'

import { useState } from 'react'

interface Transaction {
  id: string
  description: string
  merchant: string | null
  amount: number
  transaction_type: 'debit' | 'credit'
  category: string | null
}

interface CategorizationModalProps {
  isOpen: boolean
  transactions: Transaction[]
  onClose: () => void
  onSave: (categorizations: { [id: string]: string }) => Promise<void>
}

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Home',
  'Groceries',
  'Gas',
  'Insurance',
  'Income',
  'Salary',
  'Transfer',
  'Other'
]

export function CategorizationModal({ isOpen, transactions, onClose, onSave }: CategorizationModalProps) {
  const [categorizations, setCategorizations] = useState<{ [id: string]: string }>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen || transactions.length === 0) return null

  const currentTransaction = transactions[currentIndex]
  const progress = ((currentIndex + 1) / transactions.length) * 100

  const handleCategorySelect = (category: string) => {
    setCategorizations(prev => ({
      ...prev,
      [currentTransaction.id]: category
    }))

    // Auto-advance to next transaction
    if (currentIndex < transactions.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(categorizations)
      onClose()
    } catch (error) {
      console.error('Failed to save categorizations:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkipAll = () => {
    onClose()
  }

  const categorizedCount = Object.keys(categorizations).length
  const currentCategory = categorizations[currentTransaction.id]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[rgb(30,30,30)] bg-[rgb(20,20,20)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-100">
              Categorize Transactions
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Transaction {currentIndex + 1} of {transactions.length}
            </span>
            <span>
              {categorizedCount} categorized
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full h-1.5 bg-[rgb(30,30,30)] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Transaction Info */}
        <div className="px-6 py-6 border-b border-[rgb(30,30,30)]">
          <div className="bg-[rgb(20,20,20)] rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Description</p>
                <p className="text-base font-medium text-gray-100 mb-3">
                  {currentTransaction.description}
                </p>
                {currentTransaction.merchant && (
                  <>
                    <p className="text-sm text-gray-400 mb-1">Merchant</p>
                    <p className="text-sm text-gray-200 mb-3">{currentTransaction.merchant}</p>
                  </>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-sm text-gray-400 mb-1">Amount</p>
                <p className={`text-lg font-semibold ${
                  currentTransaction.transaction_type === 'credit'
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {currentTransaction.transaction_type === 'credit' ? '+' : '-'}
                  ₾{currentTransaction.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="px-6 py-6 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-gray-400 mb-4">Select a category:</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((category) => {
              const isSelected = currentCategory === category
              return (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`
                    px-4 py-3 rounded-lg text-sm font-medium transition-all
                    ${isSelected
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-[rgb(25,25,25)] text-gray-300 hover:bg-[rgb(30,30,30)] border border-[rgb(40,40,40)]'
                    }
                  `}
                >
                  {category}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[rgb(30,30,30)] bg-[rgb(20,20,20)] flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-[rgb(25,25,25)] rounded-lg hover:bg-[rgb(30,30,30)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === transactions.length - 1}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-[rgb(25,25,25)] rounded-lg hover:bg-[rgb(30,30,30)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSkipAll}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              Skip All
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || categorizedCount === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : `Save ${categorizedCount > 0 ? `(${categorizedCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
