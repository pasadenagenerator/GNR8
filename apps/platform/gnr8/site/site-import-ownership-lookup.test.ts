import assert from 'node:assert/strict'
import test from 'node:test'
import type { PoolClient } from 'pg'
import { lookupImportOwnershipSiteId } from './site-import-ownership-lookup'

const input={runtimeSiteId:'site_scoped',clientId:'client-id',agencyId:'agency-id',domainHost:'example.org'}
const row={site_id:'site-id',org_id:input.clientId,agency_id:input.agencyId}

function clientWithRows(...rows:unknown[][]){
  const calls:{sql:string;params:unknown[]}[]=[]
  const client={query:async(sql:string,params:unknown[])=>{
    calls.push({sql,params})
    return {rows:rows[calls.length-1]??[]}
  }} as unknown as Pick<PoolClient,'query'>
  return {client,calls}
}

test('pre-capture lookup uses an owned runtime binding ahead of domain',async()=>{
  const {client,calls}=clientWithRows([row])
  assert.equal(await lookupImportOwnershipSiteId(client,input),'site-id')
  assert.equal(calls.length,1)
  assert.deepEqual(calls[0]?.params,[input.runtimeSiteId])
})

test('pre-capture lookup falls back to a same-scope domain only',async()=>{
  const {client,calls}=clientWithRows([],[row])
  assert.equal(await lookupImportOwnershipSiteId(client,input),'site-id')
  assert.equal(calls.length,2)
  assert.deepEqual(calls[1]?.params,[input.clientId,input.agencyId,input.domainHost])
  assert.match(calls[1]!.sql,/s\.agency_id = \$2::uuid/)
})

test('pre-capture lookup rejects a runtime binding from another client',async()=>{
  const {client,calls}=clientWithRows([{...row,org_id:'another-client'}])
  await assert.rejects(lookupImportOwnershipSiteId(client,input),/scope mismatch/)
  assert.equal(calls.length,1)
})

test('pre-capture lookup returns null when there is no existing site',async()=>{
  const {client}=clientWithRows([],[])
  assert.equal(await lookupImportOwnershipSiteId(client,input),null)
})
