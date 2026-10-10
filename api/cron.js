export default async function handler(req,res){
 if(req.headers.authorization!=='Bearer '+process.env.CRON_SECRET)return res.status(401).json({error:'Unauthorized'});
 if(!process.env.DISCORD_CHANNEL_ID||!process.env.DISCORD_TOKEN)return res.status(503).json({error:'Set DISCORD_CHANNEL_ID and DISCORD_TOKEN'});
 const endpoint=process.env.FORTNITE_EVENTS_URL||'https://prod.api-fortnite.com/api/v1/events/global';
 const response=await fetch(endpoint,{headers:{Authorization:process.env.FORTNITE_API_KEY||'','x-api-key':process.env.FORTNITE_API_KEY||''}});
 if(!response.ok)return res.status(502).json({error:'Tournament provider HTTP '+response.status});
 const data=await response.json();
 // The provider response must be verified before tournament entries can be posted safely.
 return res.status(503).json({error:'Tournament API mapping not yet verified; no unverified schedule posted',dataType:Array.isArray(data)?'array':typeof data});
}
