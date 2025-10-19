'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardHeader } from '../dashboard/components/DashboardHeader'
import { FileUploadWidget } from '@/components/dashboard/FileUploadWidget'
import { CategorizationModal } from '@/components/dashboard/CategorizationModal'
import { supabase } from '@/lib/supabase'
import { LoadingState } from '@/components/shared/LoadingState'

interface Transaction {
  id: string
  transaction_date: string
  description: string
  merchant: string | null
  amount: number
  transaction_type: 'debit' | 'credit'
  balance: number | null
  category: string | null
  bank_name: string | null
  account_number: string | null
  file_name: string | null
  created_at: string
}

interface StatementGroup {
  fileName: string
  uploadDate: string
  transactions: Transaction[]
  totalCredits: number
  totalDebits: number
  count: number
}

export default function StatementsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [statements, setStatements] = useState<StatementGroup[]>([])
  const [expandedStatements, setExpandedStatements] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Transaction>>({})
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [showCategorizationModal, setShowCategorizationModal] = useState(false)
  const [transactionsToCateg, setTransactionsToCateg] = useState<Transaction[]>([])
  const [categorizationMessage, setCategorizationMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setStatements([])
        setIsLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id) // Filter by current user
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Group transactions by file_name
      const grouped = (data || []).reduce((acc, transaction) => {
        const fileName = transaction.file_name || 'Unknown File'

        if (!acc[fileName]) {
          acc[fileName] = {
            fileName,
            uploadDate: transaction.created_at,
            transactions: [],
            totalCredits: 0,
            totalDebits: 0,
            count: 0
          }
        }

        acc[fileName].transactions.push(transaction)
        acc[fileName].count++

        if (transaction.transaction_type === 'credit') {
          acc[fileName].totalCredits += transaction.amount
        } else {
          acc[fileName].totalDebits += transaction.amount
        }

        return acc
      }, {} as Record<string, StatementGroup>)

      setStatements(Object.values(grouped))
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError('Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStatement = (fileName: string) => {
    setExpandedStatements(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileName)) {
        newSet.delete(fileName)
      } else {
        newSet.add(fileName)
      }
      return newSet
    })
  }

  const deleteStatement = async (fileName: string) => {
    if (!confirm(`Delete all transactions from "${fileName}"? This cannot be undone.`)) return

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('file_name', fileName)

      if (deleteError) throw deleteError

      setStatements(prev => prev.filter(s => s.fileName !== fileName))
    } catch (err) {
      console.error('Error deleting statement:', err)
      alert('Failed to delete statement')
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditForm(transaction)
  }

  const handleSave = async () => {
    if (!editingId) return

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(editForm)
        .eq('id', editingId)

      if (updateError) throw updateError

      // Update local state
      setStatements(prev =>
        prev.map(statement => ({
          ...statement,
          transactions: statement.transactions.map(t =>
            t.id === editingId ? { ...t, ...editForm } : t
          )
        }))
      )
      setEditingId(null)
      setEditForm({})
    } catch (err) {
      console.error('Error updating transaction:', err)
      alert('Failed to update transaction')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Update local state
      setStatements(prev =>
        prev.map(statement => ({
          ...statement,
          transactions: statement.transactions.filter(t => t.id !== id),
          count: statement.transactions.filter(t => t.id !== id).length
        })).filter(statement => statement.transactions.length > 0)
      )
    } catch (err) {
      console.error('Error deleting transaction:', err)
      alert('Failed to delete transaction')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleCategorizeStatement = async (fileName: string) => {
    setIsCategorizing(true)
    setError(null)
    setCategorizationMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ fileName })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Categorization failed')
      }

      // If manual categorization is needed, show modal
      if (result.needsManualCategorization && result.transactions?.length > 0) {
        setTransactionsToCateg(result.transactions)
        setShowCategorizationModal(true)
        if (result.message) {
          setCategorizationMessage(result.message)
        }
      } else {
        // Success - refresh transactions
        setCategorizationMessage(result.message || 'Categorization complete')
        await fetchTransactions()
      }
    } catch (err) {
      console.error('Categorization error:', err)
      setError(err instanceof Error ? err.message : 'Failed to categorize transactions')
    } finally {
      setIsCategorizing(false)
    }
  }

  const handleCategorizeAll = async () => {
    setIsCategorizing(true)
    setError(null)
    setCategorizationMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Categorization failed')
      }

      // If manual categorization is needed, show modal
      if (result.needsManualCategorization && result.transactions?.length > 0) {
        setTransactionsToCateg(result.transactions)
        setShowCategorizationModal(true)
        if (result.message) {
          setCategorizationMessage(result.message)
        }
      } else {
        // Success - refresh transactions
        setCategorizationMessage(result.message || 'Categorization complete')
        await fetchTransactions()
      }
    } catch (err) {
      console.error('Categorization error:', err)
      setError(err instanceof Error ? err.message : 'Failed to categorize transactions')
    } finally {
      setIsCategorizing(false)
    }
  }

  const handleSaveCategorizations = async (categorizations: { [id: string]: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/categorize', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ categorizations })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save categorizations')
      }

      setCategorizationMessage(result.message || 'Categories saved successfully')
      setShowCategorizationModal(false)
      setTransactionsToCateg([])
      await fetchTransactions()
    } catch (err) {
      console.error('Save categorization error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save categorizations')
      throw err
    }
  }

  if (loading || isLoading) {
    return (
      <LoadingState
        fullscreen
        className="bg-[rgb(10,10,10)]"
        label="Fetching your statements"
        description="We’re compiling your uploaded files and recent transactions."
      />
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[rgb(10,10,10)]">
      <DashboardHeader user={user} onSignOut={signOut} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-50">My Statements</h1>
            <p className="mt-1 text-base text-gray-400">
              View and manage your uploaded transactions
            </p>
          </div>
          <button
            onClick={handleCategorizeAll}
            disabled={isCategorizing || statements.length === 0}
            className="px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {isCategorizing ? 'Categorizing...' : 'Categorize All'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {categorizationMessage && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <p className="text-sm text-green-400">{categorizationMessage}</p>
          </div>
        )}

        {/* Upload Widget - Always show at top */}
        <div className="mb-8">
          <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Upload New Statement</h2>
            <FileUploadWidget onUploadComplete={fetchTransactions} />
          </div>
        </div>

        <div className="space-y-4">
          {statements.length === 0 ? (
            <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-12 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-300 mb-2">No statements yet</p>
              <p className="text-sm text-gray-500">Upload your first bank statement or transaction file above to get started</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-100">Your Statements</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {statements.reduce((sum, s) => sum + s.count, 0)} total transactions across {statements.length} statement{statements.length !== 1 ? 's' : ''}
                </p>
              </div>
              {statements.map(statement => (
              <div key={statement.fileName} className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg overflow-hidden">
                {/* Statement Header */}
                <div
                  className="px-6 py-4 bg-[rgb(20,20,20)] border-b border-[rgb(30,30,30)] cursor-pointer hover:bg-[rgb(25,25,25)] transition-colors"
                  onClick={() => toggleStatement(statement.fileName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedStatements.has(statement.fileName) ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div>
                        <h3 className="text-base font-semibold text-gray-100">{statement.fileName}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Uploaded {new Date(statement.uploadDate).toLocaleDateString()} • {statement.count} transactions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Credits</p>
                        <p className="text-base font-semibold text-green-400">
                          +{statement.totalCredits.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Debits</p>
                        <p className="text-base font-semibold text-red-400">
                          -{statement.totalDebits.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCategorizeStatement(statement.fileName)
                        }}
                        disabled={isCategorizing}
                        className="ml-4 text-blue-400 hover:text-blue-300 text-sm disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        Categorize
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteStatement(statement.fileName)
                        }}
                        className="ml-4 text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transactions Table (Collapsible) */}
                {expandedStatements.has(statement.fileName) && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[rgb(18,18,18)] border-b border-[rgb(30,30,30)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Merchant</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase">Category</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgb(30,30,30)]">
                        {statement.transactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-[rgb(20,20,20)] transition-colors">
                      {editingId === transaction.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={editForm.transaction_date || ''}
                              onChange={e => setEditForm({ ...editForm, transaction_date: e.target.value })}
                              className="w-full bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded px-2 py-1 text-sm text-gray-200"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.description || ''}
                              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded px-2 py-1 text-sm text-gray-200"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.merchant || ''}
                              onChange={e => setEditForm({ ...editForm, merchant: e.target.value })}
                              className="w-full bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded px-2 py-1 text-sm text-gray-200"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.amount || ''}
                              onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                              className="w-full bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded px-2 py-1 text-sm text-gray-200"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.transaction_type || ''}
                              onChange={e => setEditForm({ ...editForm, transaction_type: e.target.value as 'debit' | 'credit' })}
                              className="w-full bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded px-2 py-1 text-sm text-gray-200"
                            >
                              <option value="debit">Debit</option>
                              <option value="credit">Credit</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.category || ''}
                              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                              className="w-full bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded px-2 py-1 text-sm text-gray-200"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-400">{transaction.bank_name}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={handleSave}
                              className="text-green-400 hover:text-green-300 text-sm mr-3"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-gray-400 hover:text-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-200">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-200 max-w-xs truncate">
                            {transaction.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {transaction.merchant || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <span className={transaction.transaction_type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                              {transaction.transaction_type === 'credit' ? '+' : '-'}
                              {transaction.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              transaction.transaction_type === 'credit'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {transaction.transaction_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {transaction.category || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="text-blue-400 hover:text-blue-300 text-sm mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            </>
          )}
        </div>
      </main>

      {/* Categorization Modal */}
      <CategorizationModal
        isOpen={showCategorizationModal}
        transactions={transactionsToCateg}
        onClose={() => {
          setShowCategorizationModal(false)
          setTransactionsToCateg([])
        }}
        onSave={handleSaveCategorizations}
      />
    </div>
  )
}
