export type SearchAction = 'redirect' | 'suggest' | 'fallback'

export interface SearchCard {
  id: string
  url: string
  title: string
  breadcrumbs: string
  description: string
  aliases: string[]
  keywords: string[]
  priority: number
  is_active: boolean
  roles?: string[]
}

export interface SearchRequest {
  query?: string
  locale?: string
  user_context?: {
    current_route?: string
    role?: string
  }
}

export interface Candidate {
  id: string
  title: string
  url: string
  score: number
  vector_score: number
  keyword_score: number
  priority_boost: number
}

export interface SearchResponse {
  action: SearchAction
  query: string
  target?: Candidate
  suggestions?: Candidate[]
  message?: string
}
