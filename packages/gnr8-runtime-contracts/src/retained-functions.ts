export type RetainedFunctions = {
  kind: 'retained-functions-v1'
  contact?: { recipient: string; recipientConfirmed: true }
  omittedBackgroundImages?: string[]
  excludedRoutes?: Array<{path:string;reason:'obsolete-template'}>
}

export function parseRetainedFunctions(value: unknown): RetainedFunctions | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v=value as Record<string,unknown>, c=v.contact as Record<string,unknown>|undefined
  if (Object.keys(v).some(key=>!['contact','kind','excludedRoutes','omittedBackgroundImages'].includes(key)) || v.kind!=='retained-functions-v1' ||
    (c!==undefined && (!c || typeof c!=='object' || Array.isArray(c) || Object.keys(c).sort().join()!=='recipient,recipientConfirmed' ||
    c.recipientConfirmed!==true || typeof c.recipient!=='string' || c.recipient.length>254 ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(c.recipient)))) return null
  const omittedBackgroundImages:string[]=[]
  if(v.omittedBackgroundImages!==undefined){
    if(!Array.isArray(v.omittedBackgroundImages)||v.omittedBackgroundImages.length>32)return null
    for(const value of v.omittedBackgroundImages){
      if(typeof value!=='string'||value.length>2048)return null
      try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.hash||url.href!==value||omittedBackgroundImages.includes(value))return null}catch{return null}
      omittedBackgroundImages.push(value)
    }
  }
  const excludedRoutes:NonNullable<RetainedFunctions['excludedRoutes']>=[]
  if(v.excludedRoutes!==undefined){
    if(!Array.isArray(v.excludedRoutes)||v.excludedRoutes.length>32)return null
    for(const entry of v.excludedRoutes){
      if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).sort().join()!=='path,reason'||entry.reason!=='obsolete-template'||
        typeof entry.path!=='string'||!/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+(?:\.html)?\/?$/.test(entry.path))return null
      const path=entry.path.replace(/\/$/,'');if(excludedRoutes.some(e=>e.path===path))return null
      excludedRoutes.push({path,reason:'obsolete-template'})
    }
  }
  return {kind:v.kind,...(c?{contact:{recipient:c.recipient as string,recipientConfirmed:true as const}}:{}),...(excludedRoutes.length?{excludedRoutes}:{}),...(omittedBackgroundImages.length?{omittedBackgroundImages}:{})}
}
