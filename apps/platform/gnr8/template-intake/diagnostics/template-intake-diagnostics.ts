import type {
  TemplateDiagnosticsSummary,
  TemplateIntakeDiagnostic,
  TemplateIntakeDiagnosticCode,
  TemplateIntakeDiagnosticSeverity,
} from '@/gnr8/template-intake/types/template-intake-types'

export function createTemplateIntakeDiagnostic(input: {
  code: TemplateIntakeDiagnosticCode
  severity: TemplateIntakeDiagnosticSeverity
  message: string
  details?: Record<string, unknown> | null
}): TemplateIntakeDiagnostic {
  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
    details: input.details ?? null,
  }
}

function severityRank(value: TemplateIntakeDiagnosticSeverity): number {
  if (value === 'fatal') return 4
  if (value === 'error') return 3
  if (value === 'warning') return 2
  return 1
}

export function summarizeTemplateDiagnostics(issues: TemplateIntakeDiagnostic[]): TemplateDiagnosticsSummary {
  const dedupedBySignature = new Map<string, TemplateIntakeDiagnostic>()

  for (const issue of issues) {
    const signature = JSON.stringify([
      issue.code,
      issue.severity,
      issue.message,
      issue.details ?? null,
    ])
    const existing = dedupedBySignature.get(signature)
    if (!existing) {
      dedupedBySignature.set(signature, issue)
      continue
    }

    if (severityRank(issue.severity) > severityRank(existing.severity)) {
      dedupedBySignature.set(signature, issue)
    }
  }

  const orderedIssues = [...dedupedBySignature.values()].sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code)
    if (a.severity !== b.severity) return severityRank(b.severity) - severityRank(a.severity)
    return a.message.localeCompare(b.message)
  })

  const counts = {
    info: 0,
    warning: 0,
    error: 0,
    fatal: 0,
  }

  for (const issue of orderedIssues) {
    if (issue.severity === 'fatal') counts.fatal += 1
    else if (issue.severity === 'error') counts.error += 1
    else if (issue.severity === 'warning') counts.warning += 1
    else counts.info += 1
  }

  return {
    issues: orderedIssues,
    counts,
  }
}
