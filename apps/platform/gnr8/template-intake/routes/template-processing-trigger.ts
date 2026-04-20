function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function triggerTemplateProcessingJob(input: {
  request: Request
  clientId: string
  templateId: string
}): void {
  const endpoint = new URL('/api/internal/gnr8/template-intake-processor', input.request.url)
  const sharedToken = normalizeText(process.env.GNR8_TEMPLATE_PROCESSOR_SHARED_TOKEN)

  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(sharedToken ? { 'x-gnr8-template-processor-token': sharedToken } : {}),
    },
    cache: 'no-store',
    body: JSON.stringify({
      clientId: input.clientId,
      templateId: input.templateId,
    }),
  })
    .then(async (response) => {
      if (response.ok) return
      const body = await response.text().catch(() => '')
      console.error('[template-intake] TEMPLATE_PROCESSOR_TRIGGER_FAILED', {
        clientId: input.clientId,
        templateId: input.templateId,
        status: response.status,
        body,
      })
    })
    .catch((error) => {
      console.error('[template-intake] TEMPLATE_PROCESSOR_TRIGGER_FAILED', {
        clientId: input.clientId,
        templateId: input.templateId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
}
