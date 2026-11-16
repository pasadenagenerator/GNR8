import 'server-only'

/** A new import may provision only into one explicitly configured GitHub owner. */
export function configuredImportGitHubOwner(){
  if(process.env.GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED!=='1'||
    process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED!=='1'||
    process.env.GNR8_SITE_GITHUB_PROVISION_ENABLED!=='1')return null
  const ownerKind=process.env.GNR8_SITE_GITHUB_OWNER_KIND??'Organization'
  const owner=process.env.GNR8_SITE_GITHUB_OWNER??
    (ownerKind==='Organization'?process.env.GNR8_SITE_GITHUB_ORG:'')??''
  const ownerId=Number(process.env.GNR8_SITE_GITHUB_OWNER_ID??
    (ownerKind==='Organization'?process.env.GNR8_SITE_GITHUB_ORG_ID:undefined))
  const provisionToken=process.env.GNR8_SITE_GITHUB_PROVISION_TOKEN??''
  const contentToken=process.env.GNR8_STACKI_GITHUB_TOKEN??''
  if(!['User','Organization'].includes(ownerKind)||
    !/^[A-Za-z0-9-]{1,39}$/.test(owner)||!Number.isSafeInteger(ownerId)||ownerId<1||
    !provisionToken||!contentToken)throw Error('site_github_provisioning_not_configured')
  return {owner,ownerId,ownerKind:ownerKind as 'User'|'Organization',provisionToken,contentToken}
}
