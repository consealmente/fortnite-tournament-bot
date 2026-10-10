import {createPublicKey,verify} from 'node:crypto';
export const config={api:{bodyParser:false}};
async function read(req){let b=[];for await(const c of req)b.push(c);return Buffer.concat(b)}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).end();
 const raw=await read(req),sig=req.headers['x-signature-ed25519'],time=req.headers['x-signature-timestamp'];
 if(!sig||!time||!process.env.DISCORD_PUBLIC_KEY)return res.status(401).end();
 try{
  const der=Buffer.from('302a300506032b6570032100'+process.env.DISCORD_PUBLIC_KEY,'hex');
  if(!verify(null,Buffer.concat([Buffer.from(time),raw]),createPublicKey({key:der,format:'der',type:'spki'}),Buffer.from(sig,'hex')))return res.status(401).end();
 }catch{return res.status(401).end()}
 const body=JSON.parse(raw.toString('utf8'));
 if(body.type===1)return res.status(200).json({type:1});
 return res.status(200).json({type:4,data:{content:'Tournament schedule API integration is being configured. No verified NAC tournament data is available yet.',flags:64}});
}
