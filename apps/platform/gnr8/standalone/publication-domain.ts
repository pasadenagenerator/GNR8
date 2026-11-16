import 'server-only';
import {lookup} from 'node:dns/promises';
import {connect} from 'node:tls';
import {isIP} from 'node:net';
/** Domain diagnostics must not turn the server into a private-network probe. */
export function isPublicPublicationAddress(address:string){
 if(isIP(address)===6)return /^[23][a-f0-9]{3}:/i.test(address)&&!/^2001:(?:0:|db8:|10:|2:)/i.test(address);
 if(isIP(address)!==4)return false;
 const [a,b]=address.split('.').map(Number);
 return !(a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0||a>=224);
}
/** DNS is resolved once; TLS connects to that public address with the exact
 * hostname as SNI/certificate identity. No redirects or HTTP body are fetched. */
export async function verifyPublicationTls(host:string):Promise<boolean>{
 if(!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(host))return false;
 try{
  const records=await lookup(host,{all:true});
  if(!records.length||records.some(r=>!isPublicPublicationAddress(r.address)))return false;
  return await new Promise<boolean>(resolve=>{
   const socket=connect({host:records[0]!.address,port:443,servername:host,rejectUnauthorized:true});
   const finish=(value:boolean)=>{socket.destroy();resolve(value);};
   socket.setTimeout(8000,()=>finish(false));socket.once('error',()=>finish(false));socket.once('secureConnect',()=>finish(socket.authorized));
  });
 }catch{return false;}
}
