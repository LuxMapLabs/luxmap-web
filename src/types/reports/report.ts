export type ReportTaskKind = 'repair' | 'inspection' | 'survey'

export interface ReportEvidencePhoto {
  id: string
  kind: 'before' | 'after' | 'observation'
  url: string
  capturedAt?: string
  locationText?: string
  notes?: string
}

export interface SuperiorReportItem {
  workOrderId: string
  caseId: string
  title: string
  road: string
  communeId: string
  communeName: string
  taskKind: ReportTaskKind
  taskKindName: string
  managerName: string
  managerId?: string
  engineerName: string
  engineerId?: string
  completedDate: string
  verifiedDate: string
  initialFaultDesc: string
  solutionDesc: string
  reviewNote: string
  reportNote?: string
  evidencePhotos?: ReportEvidencePhoto[]
}

