// Shared types for services

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id?: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
