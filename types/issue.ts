// Shared issue type definitions
export type IssueStatus = 'open' | 'in-progress' | 'resolved'

export interface IssueListItem {
  id: string
  title: string
  status: IssueStatus
  createdAt: Date
  messages?: { content: string }[]
  messageCount?: number
  lastMessage?: string
}
