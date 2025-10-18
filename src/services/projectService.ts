import { supabase } from '@/lib/supabase'
import type { Project } from './types'

/**
 * Project Service
 * Handles project CRUD operations
 */

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  projectData: Pick<Project, 'name' | 'description'>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: projectData.name,
      description: projectData.description,
      status: 'active'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get project by ID
 */
export async function getProjectById(
  projectId: string,
  userId: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching project:', error)
    return null
  }

  return data
}

/**
 * Update project
 */
export async function updateProject(
  projectId: string,
  userId: string,
  updates: Partial<Project>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete project
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Archive/Unarchive project
 */
export async function toggleProjectArchive(
  projectId: string,
  userId: string
): Promise<Project> {
  const project = await getProjectById(projectId, userId)
  if (!project) throw new Error('Project not found')

  return updateProject(projectId, userId, {
    status: project.status === 'active' ? 'archived' : 'active'
  })
}
