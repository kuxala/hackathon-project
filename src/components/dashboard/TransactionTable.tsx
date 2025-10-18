'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

interface TransactionWithBank extends Transaction {
  bank?: string
}

export function TransactionTable() {
  const [transactions, setTransactions] = useState<TransactionWithBank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'debit' | 'credit'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 20

  useEffect(() => {
    fetchTransactions()
  }, [filter, categoryFilter, page])

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view transactions')
        setLoading(false)
        return
      }

      // Build query params
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('type', filter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      params.append('limit', pageSize.toString())
      params.append('offset', ((page - 1) * pageSize).toString())

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transactions')
      }

      // Transactions already have bank_name field
      const transactionsWithBanks = result.transactions.map((tx: any) => ({
        ...tx,
        bank: tx.bank_name || 'Unknown Bank'
      }))

      setTransactions(transactionsWithBanks)
      setTotalPages(Math.ceil((result.total || 0) / pageSize))

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(result.transactions.map((t: Transaction) => t.category).filter(Boolean))
      )
      setCategories(uniqueCategories as string[])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-gray-500/20 text-gray-400 border-gray-500/30'

    const colors: { [key: string]: string } = {
      'Income': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Food & Dining': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Transportation': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Bills & Utilities': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Shopping': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Entertainment': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Healthcare': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Travel': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'Other': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-[rgb(30,30,30)] text-gray-400 hover:text-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('credit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'credit'
                ? 'bg-green-600 text-white'
                : 'bg-[rgb(30,30,30)] text-gray-400 hover:text-gray-200'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter('debit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'debit'
                ? 'bg-green-600 text-white'
                : 'bg-[rgb(30,30,30)] text-gray-400 hover:text-gray-200'
            }`}
          >
            Expenses
          </button>
        </div>

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgb(30,30,30)] text-gray-200 border border-[rgb(60,60,60)] focus:outline-none focus:border-green-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Transactions Table */}
      {!loading && !error && (
        <div className="rounded-xl border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgb(40,40,40)] bg-[rgb(25,25,25)]">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(40,40,40)]">
                <AnimatePresence mode="popLayout">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No transactions found. Upload a bank statement to get started.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, index) => (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-[rgb(25,25,25)] transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <p className="text-gray-200 font-medium">
                              {tx.merchant || tx.description}
                            </p>
                            {tx.merchant && tx.description !== tx.merchant && (
                              <p className="text-gray-400 text-xs mt-1">{tx.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {tx.bank}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {tx.category && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getCategoryColor(tx.category)}`}>
                              {tx.category}
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                          tx.transaction_type === 'credit' ? 'text-green-500' : 'text-rose-500'
                        }`}>
                          {tx.transaction_type === 'credit' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[rgb(40,40,40)] px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgb(30,30,30)] text-gray-200 hover:bg-[rgb(40,40,40)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[rgb(30,30,30)] text-gray-200 hover:bg-[rgb(40,40,40)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
