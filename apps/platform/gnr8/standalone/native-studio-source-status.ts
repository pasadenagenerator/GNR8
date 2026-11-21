const REQUEST_ID=/^[a-f0-9]{64}$/;
const ATTEMPT_ID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function nativeStudioSourceFailureKey(requestId:string,attemptId:string|null=null){
 if(!REQUEST_ID.test(requestId)||(attemptId!==null&&!ATTEMPT_ID.test(attemptId)))
  throw Error('native_studio_request_invalid');
 return `native-requests/${requestId}${attemptId?`-${attemptId}`:''}-failure.json`;
}

type Store={read<T>(key:string):Promise<T|null>};
type Result={requestId:string;sourceId:string;sourceManifestSha256:string;
 studioVersion:string;files:number;hosted:false};
type Failure={requestId:string;code:string;attemptId?:string};

/** The source receipt is shared; failures belong to the individual queue
 * attempt. A retry must not inherit an earlier attempt's failure. */
export async function readNativeStudioSourceStatus(store:Store,requestId:string,
 attemptId:string|null=null){
 const failureKey=nativeStudioSourceFailureKey(requestId,attemptId);
 const result=await store.read<Result>(`native-requests/${requestId}-result.json`);
 if(result){
  if(result.requestId!==requestId)throw Error('native_studio_receipt_invalid');
  return {state:'prepared-source' as const,...result};
 }
 const failure=await store.read<Failure>(failureKey);
 if(failure){
  if(failure.requestId!==requestId||
     (attemptId!==null&&failure.attemptId!==attemptId))
   throw Error('native_studio_receipt_invalid');
  return {state:'failed-source' as const,requestId,error:failure.code};
 }
 return {state:'preparing-source' as const,requestId};
}
