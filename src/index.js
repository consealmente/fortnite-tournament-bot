import 'dotenv/config';
import fs from 'node:fs/promises';
import {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,EmbedBuilder,PermissionFlagsBits,MessageFlags} from 'discord.js';
import cron from 'node-cron';
const needed=['DISCORD_TOKEN','DISCORD_CLIENT_ID','FORTNITE_API_KEY'];
for(const k of needed)if(!process.env[k])throw Error('Missing '+k);
const zone=process.env.TIMEZONE||'America/New_York';
const endpoint=process.env.FORTNITE_EVENTS_URL||'https://prod.api-fortnite.com/api/v1/events/global';
const client=new Client({intents:[GatewayIntentBits.Guilds]});
let state={channels:{},posted:{}},cache={time:0,rows:[]};
try{state={...state,...JSON.parse(await fs.readFile('state.json','utf8'))}}catch{}
const save=()=>fs.writeFile('state.json',JSON.stringify(state));
const cmd=[
new SlashCommandBuilder().setName('weekly').setDescription('Next 7 days of NAC tournaments'),
new SlashCommandBuilder().setName('today').setDescription('Today NAC tournaments'),
new SlashCommandBuilder().setName('tomorrow').setDescription('Tomorrow NAC tournaments'),
new SlashCommandBuilder().setName('refresh').setDescription('Refresh tournament data'),
new SlashCommandBuilder().setName('setup').setDescription('Set schedule posting channel').addChannelOption(o=>o.setName('channel').setDescription('Schedule channel').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
new SlashCommandBuilder().setName('postnow').setDescription('Post weekly schedule now').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c=>c.toJSON());
const day=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const add=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const stamp=v=>typeof v==='number'?(v<1e11?v*1000:v):typeof v==='string'&&/(Z|[+-]\d\d:?\d\d)$/.test(v)?Date.parse(v):NaN;
const nac=v=>/NAC|NA.CENTRAL|NAE|NA.EAST/i.test(String(v||''))&&!/NAW|WEST|EUROPE|OCE|ASIA/i.test(String(v||''));
function parse(data){
 const out=[],seen=new WeakSet();
 function walk(x,parent={}){
  if(!x||typeof x!=='object'||seen.has(x))return;
  seen.add(x);
  if(Array.isArray(x)){x.forEach(v=>walk(v,parent));return}
  const name=x.name||x.title||x.eventName||x.displayName||parent.name;
  const region=x.region||x.regionId||x.regionCode||parent.region;
  const start=x.beginTime||x.startTime||x.startDate||x.start||x.windowStart||x.sessionStart;
  const end=x.endTime||x.endDate||x.end||x.windowEnd||x.sessionEnd;
  const startMs=stamp(start),endMs=stamp(end);
  if(name&&nac(region)&&Number.isFinite(startMs))out.push({name:String(name),start:startMs,end:Number.isFinite(endMs)?endMs:null,id:String(x.eventWindowId||x.windowId||x.id||name)});
  const next={name,region};
  Object.values(x).forEach(v=>{if(v&&typeof v==='object')walk(v,next)});
 }
 walk(data);
 return [...new Map(out.map(x=>[x.id+':'+x.start,x])).values()].sort((a,b)=>a.start-b.start);
}
async function events(force=false){
 if(!force&&Date.now()-cache.time<3600000)return cache.rows;
 const res=await fetch(endpoint,{headers:{Authorization:process.env.FORTNITE_API_KEY,'x-api-key':process.env.FORTNITE_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error('Tournament API HTTP '+res.status);
 const rows=parse(await res.json());cache={time:Date.now(),rows};return rows;
}
async function embeds(kind='weekly',force=false){
 const rows=await events(force),today=day(Date.now());
 const first=kind==='tomorrow'?add(today,1):today;
 const days=kind==='weekly'?7:1;
 const until=add(first,days);
 const selected=rows.filter(e=>day(e.start)>=first&&day(e.start)<until);
 const e=new EmbedBuilder().setTitle('🏆 Fortnite NAC — '+(kind==='weekly'?'Next 7 Days':kind==='today'?'Today':'Tomorrow')).setColor(0xd92332).setFooter({text:'Times display in your local timezone · API data may change'});
 if(!selected.length)e.setDescription('No tournaments returned for this period. Check the official Fortnite competitive calendar.');
 else{
  let lines=selected.map(t=>'**'+t.name.slice(0,100)+'** — <t:'+Math.floor(t.start/1000)+':F>' +(t.end?' to <t:'+Math.floor(t.end/1000)+':t>':''));
  let text=lines.join('\n');if(text.length>3900)text=text.slice(0,3890)+'…';
  e.setDescription(text);
 }
 return [e];
}
async function post(guildId){
 const id=state.channels[guildId];if(!id)return;
 const channel=await client.channels.fetch(id);if(!channel?.isTextBased())return;
 await channel.send({embeds:await embeds('weekly',true)});
}
client.once('ready',async()=>{
 console.log('Logged in as '+client.user.tag);
 cron.schedule('0 9 * * 1',async()=>{
  const week=day(Date.now());
  for(const id of Object.keys(state.channels))try{
   if(state.posted[id]===week)continue;
   await post(id);state.posted[id]=week;await save();
  }catch(e){console.error('Weekly post failed',id,e)}
 },{timezone:zone});
 cron.schedule('0 5 * * *',()=>events(true).catch(console.error),{timezone:zone});
});
client.on('interactionCreate',async i=>{
 if(!i.isChatInputCommand())return;
 try{
  if(i.commandName==='setup'){
   const channel=i.options.getChannel('channel',true);
   if(!channel.isTextBased())throw Error('Choose a text channel');
   state.channels[i.guildId]=channel.id;await save();
   return i.reply({content:'Weekly NAC schedule channel set to <#'+channel.id+'>.',flags:MessageFlags.Ephemeral});
  }
  if(i.commandName==='postnow'){
   if(!state.channels[i.guildId])return i.reply({content:'Run /setup first.',flags:MessageFlags.Ephemeral});
   await i.deferReply({flags:MessageFlags.Ephemeral});await post(i.guildId);return i.editReply('Schedule posted.');
  }
  await i.deferReply();
  return i.editReply({embeds:await embeds(['today','tomorrow'].includes(i.commandName)?i.commandName:'weekly',i.commandName==='refresh')});
 }catch(e){console.error(e);const msg='Unable to load tournament schedule: '+String(e.message).slice(0,150);if(i.deferred||i.replied)await i.editReply(msg);else await i.reply({content:msg,flags:MessageFlags.Ephemeral})}
});
const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
const route=process.env.DISCORD_GUILD_ID?Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID,process.env.DISCORD_GUILD_ID):Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
await rest.put(route,{body:cmd});await client.login(process.env.DISCORD_TOKEN);
