export enum HITLRequestType {
  APPROVAL = 'APPROVAL',
  REVIEW = 'REVIEW',
  DECISION = 'DECISION',
  VALIDATION = 'VALIDATION',
  ESCALATION = 'ESCALATION',
  CONSULTATION = 'CONSULTATION',
}

export enum HITLRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  DELEGATED = 'DELEGATED',
}

export enum HITLRequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT',
}

export enum HITLDecisionType {
  SINGLE_APPROVER = 'SINGLE_APPROVER',
  MAJORITY_VOTE = 'MAJORITY_VOTE',
  UNANIMOUS = 'UNANIMOUS',
  EXPERT_CONSULTATION = 'EXPERT_CONSULTATION',
  ESCALATION_CHAIN = 'ESCALATION_CHAIN',
}

export enum HITLEscalationReason {
  TIMEOUT = 'TIMEOUT',
  COMPLEXITY = 'COMPLEXITY',
  CONFLICT = 'CONFLICT',
  EXPERTISE_REQUIRED = 'EXPERTISE_REQUIRED',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  MANUAL_ESCALATION = 'MANUAL_ESCALATION',
}

export enum HITLEventType {
  REQUEST_CREATED = 'hitl.request.created',
  REQUEST_ASSIGNED = 'hitl.request.assigned',
  REQUEST_APPROVED = 'hitl.request.approved',
  REQUEST_REJECTED = 'hitl.request.rejected',
  REQUEST_EXPIRED = 'hitl.request.expired',
  REQUEST_ESCALATED = 'hitl.request.escalated',
  REQUEST_DELEGATED = 'hitl.request.delegated',
  REQUEST_CANCELLED = 'hitl.request.cancelled',
  DISCUSSION_STARTED = 'hitl.discussion.started',
  COMMENT_ADDED = 'hitl.comment.added',
  VOTE_CAST = 'hitl.vote.cast',
  EXPERT_CONSULTED = 'hitl.expert.consulted',
  EXECUTION_PAUSED = 'hitl.execution.paused',
  EXECUTION_RESUMED = 'hitl.execution.resumed',
}
