import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadAudioEngine, typescriptModuleUrl } from './audio-test-module.mjs';
const { getBlockDuration } = await loadAudioEngine();
const { getGuidedJinglePlan, JINGLE_LEAD, JINGLE_TAIL } = await import(await typescriptModuleUrl(new URL('../src/audio/jinglePlan.ts',import.meta.url)));
const { JINGLE_BEDS, JINGLE_STYLES, JINGLE_CREDIT_BEDS, getJingleBed, getJingleVariants } = await import(await typescriptModuleUrl(new URL('../src/data/jingleBeds.ts',import.meta.url)));
const assets = [{id:'music',duration:16},{id:'title',duration:2},{id:'intro',duration:2.6},{id:'hook',duration:2.3}];
const block = { type:'jingle',jingle:{production:'guided-v3',musicAssetId:'music',style:'dynamic',takes:{title:{assetId:'title',sourceStart:0,sourceEnd:2},intro:{assetId:'intro',sourceStart:0,sourceEnd:2.6},hook:{assetId:'hook',sourceStart:0,sourceEnd:2.3}}}};
let plan=getGuidedJinglePlan(block,assets);
assert.equal(plan.ready,true);
assert.equal(getBlockDuration(block,assets),16,'The bed, not the sum of voice durations, must define jingle length.');
assert.ok(plan.starts.title>=3 && plan.starts.title<=4);
assert.ok(Math.abs(plan.total-plan.outroStart-JINGLE_TAIL)<.000001,'Reserve exactly the final music window.');
assert.ok(plan.starts.intro>=plan.starts.title+plan.durations.title+1,'Leave the title repetition away from the presentation.');
assert.ok(plan.starts.hook>=plan.starts.intro+plan.durations.intro+.79,'Leave a musical lift before the hook.');
assert.ok(JINGLE_LEAD>=3&&JINGLE_TAIL>=3);
const empty={...block,jingle:{...block.jingle,takes:{}}};
assert.equal(getBlockDuration(empty,assets),0,'A draft must not add music or empty voice slots to the export.');
const budget=getGuidedJinglePlan(empty,assets).limits;
const shortTitle={...empty,jingle:{...empty.jingle,takes:{title:{assetId:'title',sourceStart:0,sourceEnd:1}}}};
assert.ok(getGuidedJinglePlan(shortTitle,assets).limits.intro>budget.intro,'Unused title time must be reclaimed.');
const long={...block,jingle:{...block.jingle,takes:{...block.jingle.takes,intro:{assetId:'long',sourceStart:0,sourceEnd:8}}}};
assert.equal(getGuidedJinglePlan(long,[...assets,{id:'long',duration:8}]).fits,false);
assert.equal(getBlockDuration(long,[...assets,{id:'long',duration:8}]),0,'Overlong voices must not be truncated or spill into the end music.');
assert.equal(getBlockDuration(block,assets.filter(a=>a.id!=='hook')),0,'All three voice assets must exist.');
assert.equal(getBlockDuration({...block,jingle:{style:'dynamic',musicLevel:'low',voiceAssetId:'title'}},assets),7,'Existing single-announcement jingles keep their original timing.');
assert.equal(JINGLE_STYLES.length,6,'Show one card per style, independently of music duration.');
assert.equal(JINGLE_BEDS.length,12);
assert.equal(new Set(JINGLE_BEDS.map(b=>b.filename)).size,12);
assert.equal(new Set(JINGLE_CREDIT_BEDS.map(b=>b.id)).size,JINGLE_CREDIT_BEDS.length,'Current and previous music need distinct credit IDs.');
const selectedTracks={dynamic:['Hurry Funk Intro','326085','Diamond_Tunes'],adventure:['Spirit Of Adventure Powerful Opening','146810','Hot_Dope'],historical:['Short Heroic Orchestral Loop','541095','NR-Music'],mysterious:['Cinematic of Emotions - Intro 11','272366','Voidwave'],serious:['Flash News 30 Seconds Buildup','431803','Sonican']};
for(const [style,[title,track,author]] of Object.entries(selectedTracks)) {
  const variants=getJingleVariants(style);
  assert.ok(variants.every(bed=>bed.title===title&&bed.author===author&&bed.sourcePage.endsWith(`-${track}/`)),'Use exactly the selected recording for each style.');
  assert.ok(variants.every(bed=>bed.licenseName==='Pixabay Content License'),'Do not mislabel the new music as Creative Commons.');
  const previous=JINGLE_CREDIT_BEDS.find(bed=>bed.style===style&&bed.id.endsWith('-35-v4'));
  assert.ok(previous,'Keep the previous source credited for existing projects.');
  assert.equal(getJingleBed(style,previous.id).duration,35,'Updating the music of an old long jingle must keep the long option.');
  assert.notEqual(getJingleBed(style,previous.id).id,previous.id);
}
assert.ok(getJingleVariants('modern-radio').every(bed=>bed.title==='Funky Chunk'&&bed.id.endsWith('-v4')),'Retain the current Radio music exactly.');
for (const style of JINGLE_STYLES) {
  const variants = getJingleVariants(style.style);
  assert.deepEqual(variants.map(b=>b.duration),[25,35]);
  assert.equal(getJingleBed(style.style).duration,25);
  assert.equal(getJingleBed(style.style,variants[1].id).duration,35,'Reopening a saved long jingle must retain its duration.');
  assert.equal(getJingleBed(style.style,undefined,'extended').duration,35,'Changing style must retain the duration choice.');
  assert.equal(getJingleBed(style.style,'obsolete-id').duration,25,'Older beds must upgrade to a valid prepared bed when editing.');
}
const longerAssets=[{id:'music',duration:25},{id:'title',duration:5},{id:'intro',duration:8},{id:'hook',duration:6}];
const longerBlock={...block,jingle:{...block.jingle,takes:Object.fromEntries(['title','intro','hook'].map(part=>[part,{assetId:part,sourceStart:0,sourceEnd:longerAssets.find(a=>a.id===part).duration}]))}};
assert.equal(getGuidedJinglePlan(longerBlock,longerAssets).fits,false,'The short option must not truncate long phrases.');
assert.equal(getGuidedJinglePlan(longerBlock,longerAssets.map(a=>a.id==='music'?{...a,duration:35}:a)).ready,true,'The longer option must accept the same retained takes.');
assert.ok(getGuidedJinglePlan(empty,[{id:'music',duration:35}]).limits.title>getGuidedJinglePlan(empty,[{id:'music',duration:25}]).limits.title);
const dualAssets=[{id:'music',duration:25},{id:'title',duration:2},{id:'title-alt',duration:1.8},{id:'intro',duration:4.5},{id:'hook',duration:3.2}];
const dual={...block,jingle:{...block.jingle,production:'guided-v4',takes:Object.fromEntries(dualAssets.filter(a=>a.id!=='music').map(a=>[a.id,{assetId:a.id,sourceStart:0,sourceEnd:a.duration}]))}};
const dualPlan=getGuidedJinglePlan(dual,dualAssets);
assert.equal(dualPlan.ready,true);
assert.equal(getBlockDuration(dual,dualAssets),25);
assert.equal(dualPlan.starts['title-alt']-dualPlan.starts.title,1.5,'Move the echo onset by exactly half a second, keeping the existing overlap concept.');
assert.ok(Math.abs(dualPlan.starts.intro-Math.max(dualPlan.starts.title+dualPlan.durations.title,dualPlan.starts['title-alt']+dualPlan.durations['title-alt'])-.83)<.000001,'Leave half a second more after the echo.');
assert.ok(dualPlan.titleReturnStart>=dualPlan.starts.intro+dualPlan.durations.intro+.299);
assert.ok(dualPlan.starts.hook>=dualPlan.titleReturnStart+dualPlan.durations.title+.799);
assert.ok(Math.abs(dualPlan.total-dualPlan.outroStart-JINGLE_TAIL)<.000001);
assert.equal(getBlockDuration(dual,dualAssets.filter(a=>a.id!=='title-alt')),0,'Never silently reuse take 1 instead of recording take 2 in the new production.');
for(const total of [25,35]) {
  let recorded={...dual,jingle:{...dual.jingle,takes:{}}};
  const available=[{id:'music',duration:total}];
  for(const part of ['title','title-alt','intro','hook']) {
    const limit=getGuidedJinglePlan(recorded,available).limits[part];
    assert.ok(Number.isFinite(limit)&&limit>=.15);
    const duration=Math.floor(limit*.8*10)/10;
    available.push({id:part,duration});
    recorded.jingle.takes[part]={assetId:part,sourceStart:0,sourceEnd:duration};
  }
  assert.equal(getGuidedJinglePlan(recorded,available).ready,true,'The recorder budgets must reserve the second title playback and all later takes.');
}
const flexible = {...dual,jingle:{...dual.jingle,production:'guided-v5'}};
const tightAssets=dualAssets.map(asset=>asset.id==='intro'?{...asset,duration:8.5}:asset.id==='hook'?{...asset,duration:3.3}:asset);
const tight={...flexible,jingle:{...flexible.jingle,takes:Object.fromEntries(tightAssets.filter(asset=>asset.id!=='music').map(asset=>[asset.id,{assetId:asset.id,sourceStart:0,sourceEnd:asset.duration}]))}};
const tightPlan=getGuidedJinglePlan(tight,tightAssets);
assert.equal(getGuidedJinglePlan({...tight,jingle:{...tight.jingle,production:'guided-v4'}},tightAssets).fits,false,'This realistic longer intro must exceed the previous fixed-gap arrangement.');
assert.equal(tightPlan.ready,true,'Compress musical gaps instead of cutting the longer intro.');
assert.equal(getBlockDuration(tight,tightAssets),25);
assert.equal(tightPlan.starts['title-alt']-tightPlan.starts.title,1.5,'Keep the clarified echo onset.');
const echoEnd=Math.max(tightPlan.starts.title+tightPlan.durations.title,tightPlan.starts['title-alt']+tightPlan.durations['title-alt']);
assert.ok(tightPlan.starts.intro-echoEnd>=.299 && tightPlan.starts.intro-echoEnd<.83);
assert.ok(tightPlan.titleReturnStart>=tightPlan.starts.intro+tightPlan.durations.intro+.119);
assert.ok(tightPlan.starts.hook>=tightPlan.titleReturnStart+tightPlan.durations.title+.399);
assert.ok(Math.abs(tightPlan.total-tightPlan.outroStart-JINGLE_TAIL)<.000001,'The final music window remains intact.');
assert.ok(getGuidedJinglePlan(flexible,dualAssets).limits.intro>dualPlan.limits.intro+1,'Give the presentation the unused speaking time rather than a fixed small percentage.');
const spaciousPlan=getGuidedJinglePlan(flexible,dualAssets);
assert.ok(Math.abs(spaciousPlan.starts.intro-(spaciousPlan.starts['title-alt']+spaciousPlan.durations['title-alt'])-.83)<.000001,'Short recordings keep the more spacious rhythm.');
for(const total of [25,35]) {
  for(const fraction of [.5,.8,1]) {
    const available=[{id:'music',duration:total}];
    const recorded={...flexible,jingle:{...flexible.jingle,takes:{}}};
    for(const part of ['title','title-alt','intro','hook']) {
      const before=getGuidedJinglePlan(recorded,available);
      const duration=Math.floor(before.limits[part]*fraction*10)/10;
      assert.ok(duration>=.15,'Each sequential recording must get usable speaking time.');
      available.push({id:part,duration});
      recorded.jingle.takes[part]={assetId:part,sourceStart:0,sourceEnd:duration};
      const after=getGuidedJinglePlan(recorded,available);
      for(const earlier of Object.keys(recorded.jingle.takes)) assert.ok(after.durations[earlier]<=after.limits[earlier]+.025,'Do not invalidate an earlier take by recording the next one within its displayed budget.');
    }
    const finished=getGuidedJinglePlan(recorded,available);
    assert.equal(finished.ready,true,'Even recording every displayed maximum must fit all five voice playbacks.');
    for(const part of ['title','title-alt','intro','hook']) {
      const replacement=finished.limits[part];
      const replacedAssets=available.map(asset=>asset.id===part?{...asset,duration:replacement}:asset);
      const replaced={...recorded,jingle:{...recorded.jingle,takes:{...recorded.jingle.takes,[part]:{assetId:part,sourceStart:0,sourceEnd:replacement}}}};
      assert.equal(getGuidedJinglePlan(replaced,replacedAssets).ready,true,'Re-recording up to the new budget must preserve the other three takes.');
    }
  }
}
const overlongAssets=tightAssets.map(asset=>asset.id==='intro'?{...asset,duration:12}:asset);
const overlong={...tight,jingle:{...tight.jingle,takes:{...tight.jingle.takes,intro:{assetId:'intro',sourceStart:0,sourceEnd:12}}}};
assert.equal(getBlockDuration(overlong,overlongAssets),0,'Do not truncate an overlong recording.');
assert.equal(getGuidedJinglePlan(overlong,overlongAssets.map(asset=>asset.id==='music'?{...asset,duration:35}:asset)).ready,true,'Switching to 35 seconds keeps all four takes usable.');
const sources=JSON.parse(await readFile(new URL('../public/audio/jingles/sources.json',import.meta.url),'utf8'));
for(const bed of JINGLE_CREDIT_BEDS){
  const path=new URL(`../public/audio/jingles/${bed.filename}`,import.meta.url);
  assert.ok(bed.duration>=16&&bed.duration<=35);
  assert.ok((await stat(path)).size>100000);
  assert.ok(bed.sourcePage&&bed.licenseUrl);
  const source=sources.find(s=>s.id===bed.id);
  assert.ok(source,`Missing credit for ${bed.id}`);
  assert.equal(source.license,bed.licenseName);
  assert.equal(source.preparedDuration,bed.duration,'The displayed time must follow the prepared bed.');
  assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),source.sha256,'The credited file must match the prepared version.');
  assert.ok(source.originalSha256&&source.preparation.sourceEnd>source.preparation.sourceStart);
}
const wizard=await readFile(new URL('../src/components/JingleWizard.tsx',import.meta.url),'utf8');
assert.ok(!wizard.includes('onOpenLibrary')&&!wizard.includes('closingAssetId'),'Jingle creation must use automatic beds and their musical endings.');
console.log('Guided jingles: six styles with 25/35-second beds, saved duration choices, adaptive budgets, retained takes, overrun protection, music files and legacy credits verified.');
