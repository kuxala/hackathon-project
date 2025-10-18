import { supabase } from '@/lib/supabase'
import type { User } from './types'

/**
 * User Service
 * Handles user-related operations
 */

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get user stats (projects, tasks, etc.)
 */
export async function getUserStats(userId: string) {
  const [projects, tasks] = await Promise.all([
    getProjectCount(userId),
    getTaskCounts(userId)
  ])

  return {
    projectCount: projects,
    ...tasks
  }
}

async function getProjectCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) return 0
  return count || 0
}

async function getTaskCounts(userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('user_id', userId)

  if (error) return { taskCount: 0, completedCount: 0 }

  const total = data.length
  const completed = data.filter(t => t.status === 'done').length

  return {
    taskCount: total,
    completedCount: completed
  }
}
