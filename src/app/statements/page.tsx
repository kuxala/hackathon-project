'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardHeader } from '../dashboard/components/DashboardHeader'
import { supabase } from '@/lib/supabase'

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
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(10,10,10)]">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[rgb(10,10,10)]">
      <DashboardHeader user={user} onSignOut={signOut} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-50">My Statements</h1>
          <p className="mt-1 text-base text-gray-400">
            View and manage your uploaded transactions
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {statements.length === 0 ? (
            <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-12 text-center">
              <p className="text-gray-400">No statements found</p>
              <p className="text-sm text-gray-500 mt-2">Upload a file to get started</p>
            </div>
          ) : (
            statements.map(statement => (
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
            ))
          )}
        </div>

        <div className="mt-4 text-sm text-gray-400">
          {statements.reduce((sum, s) => sum + s.count, 0)} total transactions across {statements.length} statement{statements.length !== 1 ? 's' : ''}
        </div>
      </main>
    </div>
  )
}
