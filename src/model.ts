export interface Ticket {
  id: string
  title: string
  description: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  homeId: string | null
  homeLabel?: string
  reportedByResidentId?: string | null
  blockId: string | null
  createdAt: string
  firstResponseAt: string | null
}

export interface Feedback {
  id: string
  ticketId: string | null
  residentId: string
  score: number
  createdAt: string
}

export interface Resident {
  id: string
  homeId: string
  moveInDate?: string
  moveOutDate: string | null
}

export interface Snapshot {
  tickets: Ticket[]
  feedback: Feedback[]
  residents: Resident[]
}
