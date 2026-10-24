// 파일명: qa/company-policy-steward.test.mjs
// 임포트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditFourPolicyDocuments,resolveActiveOwnerPolicy} from '../tools/company-policy-steward.mjs';
import {ownerDevelopmentHeld} from '../tools/vibe2-queue-control.mjs';
import {loadCentralPolicySnapshot} from '../tools/vibe2-central-work-contract.mjs';
import {selectRobloxDevelopmentPortfolio,planVibe2AutonomousTasks,enqueueOwnerRobloxOnePatch} from '../tools/vibe2-auto-planner.mjs';

// 메인
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=[
  'company-learning/platform-release-roadmap.json',
  'company-learning/company-log-map.json',
  'company-learning/company-architecture-map.json',
  'company-learning/security-immune-system.json'
];
function fixture(fn){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'four-policy-steward-'));
  try{
    for(const file of paths){
      fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});
      fs.copyFileSync(path.join(root,file),path.join(tmp,file));
    }
    // 과거 혼합 정책 fixture에서 최신 단일 플랫폼 지시로 전환하는 동작을 검증한다.
    const file=path.join(tmp,paths[0]);
    const baseline=JSON.parse(fs.readFileSync(file,'utf8'));
    baseline.ownerActiveDevelopmentScope20261009={status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-17_ROBLOX_AND_GENERAL_WEB',activeTargets:['ROBLOX','WEB'],ownerHeldTargets:['UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN']};
    baseline.developmentAccess.ROBLOX='ALWAYS_ALLOWED';
    baseline.developmentAccess.WEB='ALWAYS_ALLOWED';
    fs.writeFileSync(file,JSON.stringify(baseline));
    return fn(tmp);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('four existing documents stay bit-for-bit immutable',()=>fixture(tmp=>{
  const originals=paths.map(p=>fs.readFileSync(path.join(tmp,p),'utf8'));
  const audit=auditFourPolicyDocuments({root:tmp});
  assert.deepEqual(audit.managedDocuments,paths);
  assert.equal(audit.writesAllowed,false);
  assert.equal(audit.nonBlockingAudit,true);
  assert.equal(audit.securityAndReleaseChecksUnchanged,true);
  assert.deepEqual(paths.map(p=>fs.readFileSync(path.join(tmp,p),'utf8')),originals);
}));
test('latest approved owner scope wins over stale legacy access only in audit',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(p,JSON.stringify(doc));
  const before=fs.readFileSync(p,'utf8');
  const audit=auditFourPolicyDocuments({root:tmp});
  assert.equal(audit.effectiveDevelopmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.ok(audit.staleLegacyPolicyFields.includes('ROBLOX'));
  assert.equal(fs.readFileSync(p,'utf8'),before);
}));
test('a newer approved owner directive supersedes the old scope without changing game code',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerNextDevelopment={authority:'OWNER_DIRECTIVE_2026-10-18_WEB_ONLY',status:'ACTIVE',activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB']};
  fs.writeFileSync(p,JSON.stringify(doc));
  const audit=auditFourPolicyDocuments({root:tmp});
  assert.equal(audit.latestOwnerSection,'ownerNextDevelopment');
  assert.equal(audit.effectiveDevelopmentAccess.ROBLOX,'OWNER_HOLD');
  assert.equal(audit.effectiveDevelopmentAccess.WEB,'ALWAYS_ALLOWED');
}));
test('invalid, missing or contradictory approved policy never authorizes work',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerActiveDevelopmentScope20261009.ownerHeldTargets.push('ROBLOX');
  fs.writeFileSync(p,JSON.stringify(doc));
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}),/OWNER_SCOPE_INVALID/);
  fs.unlinkSync(p);
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}));
}));
test('ambiguous equally recent owner instructions are not silently merged',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerConflictingScope={status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-17_SECOND_SAME_DAY',activeTargets:['UNITY'],ownerHeldTargets:['WEB']};
  fs.writeFileSync(p,JSON.stringify(doc));
  assert.throws(()=>auditFourPolicyDocuments({root:tmp}),/SAME_DATE_OWNER_CONFLICT/);
}));

test('legacy owner scope is automatically retired in the actual Vibe queue',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerDeprecatedOwnerScope={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-09-23_OLD_HOLD',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB']
  };
  doc.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(p,JSON.stringify(doc));
  const effective=resolveActiveOwnerPolicy(doc);
  assert.ok(effective.retiredOwnerSections.includes('ownerDeprecatedOwnerScope'));
  assert.equal(effective.effectiveDevelopmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','roblox',{}),false);
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','unity_android',{}),true);
  assert.equal(doc.developmentAccess.ROBLOX,'OWNER_HOLD');
  assert.ok(auditFourPolicyDocuments({root:tmp}).retiredOwnerSections.includes('ownerDeprecatedOwnerScope'));
}));
test('new owner hold overrides earlier permissive values in actual Vibe queue',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerLaterScope={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-18_WEB_ONLY',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN']
  };
  fs.writeFileSync(p,JSON.stringify(doc));
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','roblox',{}),true);
  assert.equal(ownerDevelopmentHeld(doc,'unheld-policy-regression','web',{}),false);
  assert.equal(doc.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
}));
test('all four documents retain security, log and architecture fail-closed contracts',()=>fixture(tmp=>{
  for(const [index,mutate,expected] of [
    [1,doc=>{doc.retained.unknownOrMissingPolicy='ALLOW';},/LOG_CONTRACT_INVALID/],
    [2,doc=>{doc.constitutionalEnforcement.mode='ALLOW';},/ARCHITECTURE_CONTRACT_INVALID/],
    [3,doc=>{doc.enforcement.unverified='ALLOW';},/SECURITY_CONTRACT_INVALID/]
  ]){
    const file=path.join(tmp,paths[index]);
    const original=fs.readFileSync(file,'utf8');
    const doc=JSON.parse(original);
    mutate(doc);
    fs.writeFileSync(file,JSON.stringify(doc));
    assert.throws(()=>auditFourPolicyDocuments({root:tmp}),expected);
    fs.writeFileSync(file,original);
  }
}));
test('conflicting date-less or malformed ACTIVE owner scope is rejected',()=>fixture(tmp=>{
  const p=path.join(tmp,paths[0]);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  doc.ownerBadScope={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_UNDATED',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX']
  };
  assert.throws(()=>resolveActiveOwnerPolicy(doc),/OWNER_DIRECTIVE_INVALID/);
}));

test('work contract fingerprint follows latest directive, not stale legacy holds',()=>fixture(tmp=>{
  const file=path.join(tmp,paths[0]);
  const before=loadCentralPolicySnapshot({repoRoot:tmp,required:true});
  assert.match(before.executionFingerprint,/^[a-f0-9]{64}$/);
  const policy=JSON.parse(fs.readFileSync(file,'utf8'));
  policy.developmentAccess.ROBLOX='OWNER_HOLD';
  fs.writeFileSync(file,JSON.stringify(policy));
  const legacyChange=loadCentralPolicySnapshot({repoRoot:tmp,required:true});
  assert.equal(legacyChange.executionFingerprint,before.executionFingerprint);
  policy.ownerNextDevelopment={
    status:'ACTIVE',authority:'OWNER_DIRECTIVE_2026-10-18_WEB_ONLY',
    activeTargets:['WEB'],ownerHeldTargets:['ROBLOX','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN']
  };
  fs.writeFileSync(file,JSON.stringify(policy));
  const newest=loadCentralPolicySnapshot({repoRoot:tmp,required:true});
  assert.notEqual(newest.executionFingerprint,before.executionFingerprint);
}));

test('F0 live planner uses verified main policy only at production call site, not in fixture QA',()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const scope=resolveActiveOwnerPolicy(policy);
  const platform=policy.ownerActiveDevelopmentScope20261009.repository.platform;
  assert.deepEqual(scope.activeTargets,[platform]);
  assert.equal(ownerDevelopmentHeld(policy,'policy-f0-eligible','roblox',{}),platform!=='ROBLOX');
  assert.equal(ownerDevelopmentHeld(policy,'policy-f0-eligible','web',{}),platform!=='WEB');
  for(const workflow of [
    '.github/workflows/vibe2-24h-runner.yml',
    '.github/workflows/vibe2-continuous-core.yml'
  ]){
    const content=fs.readFileSync(path.join(root,workflow),'utf8');
    assert.ok(!content.includes('export COMPANY_VERIFIED_POLICY_PATH=') &&
      !content.includes('export COMPANY_VERIFIED_DESIGN_POLICY_PATH='),
      'Production policies must not contaminate isolated QA fixtures');
    assert.ok(content.includes('COMPANY_VERIFIED_POLICY_PATH=/tmp/vibe2-main/company-learning/platform-release-roadmap.json COMPANY_VERIFIED_DESIGN_POLICY_PATH=/tmp/vibe2-main/company-learning/platform-release-roadmap.json node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs'));
    assert.ok(content.includes('node /tmp/vibe2-main/tools/vibe2-auto-planner.mjs'));
  }
  const clock=fs.readFileSync(path.join(root,'.github/workflows/vibe2-24h-runner.yml'),'utf8');
  assert.ok(clock.includes("cron: '*/5 * * * *'"));
  assert.equal(policy.finalDevelopmentLock.sequenceLock.status,'LOCKED');
});


test('issue 8239 reserve and DESIGN_ONLY use the verified canonical policy without changing the F0–F9 chain',()=>{
  const canonical='company-learning/platform-release-roadmap.json';
  const reserve=fs.readFileSync(path.join(root,'.github/workflows/vibe2-continuous-core.yml'),'utf8');
  const design=fs.readFileSync(path.join(root,'.github/workflows/company-seed-design-runtime.yml'),'utf8');
  assert.ok(reserve.includes('COMPANY_VERIFIED_POLICY_PATH=/tmp/vibe2-main/'+canonical+' node /tmp/vibe2-main/tools/vibe2-queue-control.mjs reserve-batch'));
  assert.ok(reserve.includes('COMPANY_VERIFIED_POLICY_PATH="$contract_root/'+canonical+'" COMPANY_VERIFIED_DESIGN_POLICY_PATH="$contract_root/'+canonical+'" node "$contract_root/tools/vibe2-continuous-runner.mjs"'));
  assert.ok(reserve.includes('COMPANY_VERIFIED_POLICY_PATH="$GITHUB_WORKSPACE/vibe2-contract/'+canonical+'" node "$GITHUB_WORKSPACE/vibe2-contract/tools/vibe2-source-worker.mjs" --apply-source=true'));
  const resolve=design.split('  resolve-seed-targets:')[1]?.split('  design-cycle:')[0];
  const cycle=design.split('  design-cycle:')[1]?.split('  promote')[0];
  for(const job of [resolve,cycle]){
    assert.ok(job,'both existing DESIGN_ONLY jobs must remain present');
    assert.ok(job.includes('COMPANY_VERIFIED_POLICY_PATH: '+canonical));
    assert.ok(job.includes('COMPANY_VERIFIED_DESIGN_POLICY_PATH: '+canonical));
  }
  assert.ok(cycle.includes('node tools/company-design-cycle.mjs &'));
  assert.ok(cycle.includes('evaluateMinimumDesignContract'));
  assert.equal((reserve.match(/COMPANY_VERIFIED_POLICY_PATH=\/tmp\/vibe2-main\/company-learning\/platform-release-roadmap.json node \/tmp\/vibe2-main\/tools\/vibe2-queue-control.mjs reserve-batch/g)||[]).length,1);
  const policy=JSON.parse(fs.readFileSync(path.join(root,canonical),'utf8'));
  assert.equal(policy.finalDevelopmentLock.sequenceLock.status,'LOCKED');
  assert.deepEqual(policy.finalDevelopmentLock.sequenceLock.candidateOrderMustRemain.slice(0,2),['F0_SOURCE_PREFLIGHT_PASS','PRIVATE_RUNTIME_CANDIDATE_DEPLOY']);
  assert.equal(policy.fixedAutonomousDevelopmentOperatingContract.sourceGrowthIntegrity.existingWorkingGameplayAndSaveSemanticsPreserved,true);
  assert.equal(policy.fixedAutonomousDevelopmentOperatingContract.autonomousBottleneckManagement.mayNotBypassSecurityQaRuntimeOrReleaseGates,true);
});

// 조직 독립 운영: 작업 이름을 위장해도 다른 플랫폼 원본을 예약·수정하지 않는다.
for(const platform of ['WEB','ROBLOX'])test(platform+' repository confines Vibe tasks and source writes to its own platform',()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const scope=policy.ownerActiveDevelopmentScope20261009;
  const other=platform==='WEB'?'ROBLOX':'WEB';
  scope.activeTargets=[platform];scope.ownerHeldTargets=[other,'UNITY','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN'];
  scope.repository={fullName:process.env.GITHUB_REPOSITORY||'test/independent',platform,sourceRoot:platform==='WEB'?'web-games/':'roblox-games/',independentVibe:true,sharedQueue:false,sharedRuntime:false,sharedLearning:false,sharedCredentials:false,homepageOnly:true};
  policy.assetProductionParallelContract.activeProductionTargets=[platform];
  const ownRoot=scope.repository.sourceRoot;
  const foreignRoot=other==='WEB'?'web-games/':'roblox-games/';
  assert.deepEqual(resolveActiveOwnerPolicy(policy).activeTargets,[platform]);
  assert.equal(ownerDevelopmentHeld(policy,'independent-test',platform.toLowerCase(),{source:{root:ownRoot+'independent-test'}}),false);
  assert.equal(ownerDevelopmentHeld(policy,'independent-test',other.toLowerCase(),{}),true);
  for(const task of [{source:{root:foreignRoot+'independent-test'}},{responsibleFiles:[foreignRoot+'independent-test/index.html']},{selectedTask:{source:{root:foreignRoot+'independent-test'}}},{sourceRoot:'../'+ownRoot+'independent-test'}])
    assert.equal(ownerDevelopmentHeld(policy,'independent-test',platform.toLowerCase(),task),true);
  assert.equal(ownerDevelopmentHeld(policy,'library',platform.toLowerCase(),{assetProductionLane:true,sourceRoot:'assets/'+platform.toLowerCase()+'/library'}),false);
  assert.throws(()=>resolveActiveOwnerPolicy(policy,{repository:'other/repository'}),/REPOSITORY_MISMATCH/);
  scope.repository.sharedQueue=true;
  assert.throws(()=>resolveActiveOwnerPolicy(policy,{allowMissing:true}),/REPOSITORY_SCOPE_INVALID/);
});

// 로블록스 개발은 전체 46개를 기계적으로 예약하지 않고 실제 소스 준비도와 오너 순서를 검증한다.
test('Roblox organization admits only six source-ready prioritized games without changing the catalog',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8'));
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const before=fs.readFileSync(path.join(root,'game-catalog.json'),'utf8');
  const projects=catalog.games.map(game=>({
    gameId:game.id,engine:'roblox',projectPath:'roblox-games/'+game.id,
    releaseState:game.productionClass==='DEVELOPMENT_CONFIRMED'?'development-confirmed':'other'
  }));
  const result=selectRobloxDevelopmentPortfolio(projects,catalog,root);
  assert.equal(result.enabled,true);
  assert.equal(catalog.games.length,46);
  assert.equal(result.selectedGameIds.length,policy.robloxDevelopmentInvestment.activePortfolio.activeGameTarget);
  assert.deepEqual(result.selectedGameIds,[
    'simple-rpg','insect-survival','cozy-island','fantasy-survival','daechung-rpg','bug-defense'
  ]);
  assert.ok(result.sourceBlockedGameIds.includes('horror-escape-room'));
  assert.ok(policy.robloxDevelopmentInvestment.activePortfolio.preferredGameIds.includes('horror-escape-room'));
  assert.equal(result.maxQueuedDevelopmentTasks,null);
  assert.equal(policy.robloxDevelopmentInvestment.activePortfolio.taskAllocation,'EXISTING_CANONICAL_QUEUE_AND_RUNNER_BACKPRESSURE_NO_PER_GAME_CAP');
  assert.ok(result.sourceReadyGameIds.length>result.selectedGameIds.length);
  assert.ok(result.sourceReadyGameIds.length<catalog.games.length);
  assert.ok(result.sourceBlockedGameIds.includes('ocean-voyage'));
  assert.equal(result.projects.length,6);
  assert.ok(result.projects.every(project=>project.engine==='roblox'));
  assert.equal(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8'),before);
  const foreign={...projects[0],engine:'web',projectPath:'web-games/'+projects[0].gameId};
  assert.equal(selectRobloxDevelopmentPortfolio([foreign],catalog,root).projects.length,0);
});
test('Roblox portfolio selector never restricts unrelated repository architecture',()=>fixture(tmp=>{
  const file=path.join(tmp,'company-learning/company-architecture-map.json');
  const architecture=JSON.parse(fs.readFileSync(file,'utf8'));
  architecture.repository.fullName='hans1177/jaewoon-games';
  fs.writeFileSync(file,JSON.stringify(architecture));
  const projects=[{gameId:'simple-rpg',engine:'roblox',projectPath:'roblox-games/simple-rpg',releaseState:'development-confirmed'}];
  const result=selectRobloxDevelopmentPortfolio(projects,{games:[{id:'simple-rpg',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},tmp);
  assert.equal(result.enabled,false);
  assert.equal(result.projects.length,1);
}));

// 로블록스 집중 게임 6개만 대상으로 하되, 게임당 2개/전체 12개 인위적인 상한은 두지 않는다.
test('Roblox planner keeps selection and existing runtime pressure without per-game cap',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8'));
  const result=planVibe2AutonomousTasks({
    catalog,status:{projects:[]},developmentQueue:{items:[]},
    queue:{tasks:[]},repoRoot:root,
    maxConcurrentTasks:256,queueMaxConcurrentTasks:256,
    planningBacklogTarget:80,planningBacklogMinimum:40
  });
  const portfolio=result.planningBacklog?.robloxPortfolio;
  assert.ok(portfolio,'portfolio must be selected inside canonical planner');
  assert.equal(portfolio.selectedGameIds.length,6);
  assert.ok(result.tasks.every(task=>portfolio.selectedGameIds.includes(task.gameId)),
    'unselected Roblox games must not be planned');
  assert.equal(result.planned,true,'canonical planner must actually create work');
  assert.ok(result.tasks.length>0,'source-ready Roblox games must produce implementable tasks');
  const queueTasks=result.queue.tasks.filter(task=>['queued','running'].includes(task.status));
  assert.equal(queueTasks.length,result.tasks.length,'all proposed tasks must enter the normalized canonical queue');
  assert.ok(queueTasks.every(task=>
    portfolio.selectedGameIds.includes(task.gameId)
    &&task.target==='roblox'
    &&task.sourceRoot==='roblox-games/'+task.gameId
    &&['GAME_PRIMARY','ASSET_DEVELOPMENT'].includes(task.executionLane)),
    'selected Roblox game work must enter the canonical execution lanes');
  const primary=result.tasks.filter(task=>task.executionLane==='GAME_PRIMARY');
  assert.ok(portfolio.maxQueuedDevelopmentTasks==null,'no synthetic 12-task ceiling');
  assert.ok(primary.length<=256,'canonical queue capacity remains enforced');
  // 같은 계획을 반복해도 다른 조직 게임이 들어오거나 원래 큐 용량을 넘기면 안 된다.
  const refill=planVibe2AutonomousTasks({
    catalog,status:{projects:[]},developmentQueue:{items:[]},
    queue:result.queue,repoRoot:root,
    maxConcurrentTasks:256,queueMaxConcurrentTasks:256,
    planningBacklogTarget:80,planningBacklogMinimum:40
  });
  const activePrimary=refill.queue.tasks.filter(task=>
    ['queued','running'].includes(task.status)&&task.executionLane==='GAME_PRIMARY');
  assert.ok(activePrimary.length<=256,'repeat planning may not overflow canonical queue');
  assert.ok(activePrimary.every(task=>portfolio.selectedGameIds.includes(task.gameId)));
  console.log('ROBLOX_PORTFOLIO_PLAN_REASON='+result.reason);
  console.log('ROBLOX_PORTFOLIO_PLAN_BACKLOG='+JSON.stringify({capacity:result.planningBacklog?.capacity,current:result.planningBacklog?.current,target:result.planningBacklog?.target,sourceReadyCount:result.planningBacklog?.robloxPortfolio?.sourceReadyCount,missing:result.planningBacklog?.robloxPortfolio?.sourceBlockedGameIds?.length}));
  console.log('ROBLOX_PORTFOLIO_PLAN_OUTPUT='+JSON.stringify({planned:result.planned,count:result.count,reason:result.reason,taskCount:result.tasks.length,lanes:result.tasks.reduce((m,t)=>(m[t.executionLane||'UNSPECIFIED']=(m[t.executionLane||'UNSPECIFIED']||0)+1,m),{}),sample:result.tasks.slice(0,5).map(t=>({id:t.id,gameId:t.gameId,target:t.target,executionLane:t.executionLane,assetProductionLane:t.assetProductionLane}))}));
  console.log('ROBLOX_PORTFOLIO_PLANNED_TASKS='+primary.length);
  console.log('ROBLOX_PORTFOLIO_REFILL_ACTIVE_TASKS='+activePrimary.length);
});

// 로블 조직 한방패치: 웹 조직과 동일한 접수 간소화, 안전 게이트는 유지.
test('owner onepatch enters existing Roblox queue, merges build-up, and cannot touch foreign files',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8'));
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const gameId='simple-rpg',sourceRoot='roblox-games/'+gameId;
  const request={gameId,goal:'기존 캐릭터 움직임과 화면 UI를 함께 자연스럽게 수정',requestId:'1234567',
    files:'client/Game.client.luau;shared/GameConfig.luau'};
  const before=fs.readFileSync(path.join(root,sourceRoot,'client/Game.client.luau'),'utf8');
  const created=enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog,request,repoRoot:root,policy});
  assert.equal(created.added,true);
  assert.equal(created.queue.tasks.length,1);
  assert.equal(created.queue.tasks[0].target,'roblox');
  assert.equal(created.queue.tasks[0].executionLane,'GAME_PRIMARY');
  assert.equal(created.queue.tasks[0].responsibleFiles.length,2);
  assert.ok(created.queue.tasks[0].goal.includes('기존 F0~F9/보안/런타임/출시 검증을 유지한다'));
  assert.equal(fs.readFileSync(path.join(root,sourceRoot,'client/Game.client.luau'),'utf8'),before);
  const replay=enqueueOwnerRobloxOnePatch({queue:created.queue,catalog,request,repoRoot:root,policy});
  assert.equal(replay.added,false);
  assert.equal(replay.queue.tasks.length,1);
  const existing={id:'current-build-up',gameId,target:'roblox',sourceRoot,status:'queued',
    buildUpDirectiveId:'verified-existing-build-up',goal:'현재 빌드업 단계',responsibleFiles:[sourceRoot+'/server/Game.server.luau'],evidence:[]};
  const merged=enqueueOwnerRobloxOnePatch({queue:{tasks:[existing]},catalog,request,repoRoot:root,policy});
  assert.equal(merged.merged,true);
  assert.equal(merged.queue.tasks.length,1);
  assert.equal(merged.queue.tasks[0].id,existing.id);
  assert.equal(merged.queue.tasks[0].ownerDirective,true);
  assert.ok(merged.queue.tasks[0].responsibleFiles.includes(sourceRoot+'/client/Game.client.luau'));
  for(const file of ['../web-games/foo/index.html','../../package.json','/tmp/escape','web-games/other/index.html']){
    assert.throws(()=>enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog,
      request:{...request,files:file,requestId:'8765432'},repoRoot:root,policy}),/ROBLOX_ONEPATCH_/);
  }
  assert.throws(()=>enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog,request,repoRoot:root,
    policy:{...policy,developmentAccess:{...policy.developmentAccess,ROBLOX:'OWNER_HOLD'}}}),/ROBLOX_ONEPATCH_CENTRAL_POLICY_NOT_AUTHORIZED/);
});
test('Roblox F0 then private deploy then post-deploy F1-F9 QA precedes canonical final publish',()=>{
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const sequence=policy.finalDevelopmentLock?.sequenceLock?.candidateOrderMustRemain||[];
  const index=name=>sequence.indexOf(name);
  assert.equal(index('F0_SOURCE_PREFLIGHT_PASS'),0);
  assert.equal(index('PRIVATE_RUNTIME_CANDIDATE_DEPLOY'),1);
  assert.ok(index('F1_SERVER_BOOT_PASS')>index('PRIVATE_RUNTIME_CANDIDATE_DEPLOY'));
  assert.ok(index('F9_RELEASE_REGRESSION_PASS')>index('F1_SERVER_BOOT_PASS'));
  assert.ok(index('INTERNAL_PLATFORM_RELEASE')>index('F9_RELEASE_REGRESSION_PASS'));
  assert.equal(policy.finalDevelopmentLock.sequenceLock.status,'LOCKED');
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/vibe2-continuous-core.yml'),'utf8');
  assert.match(workflow,/roblox_game:/);
  assert.match(workflow,/VIBE2_ROBLOX_ONEPATCH_GOAL:/);
  assert.match(workflow,/ROBLOX_ONEPATCH_GAME_PRIMARY_LANE_REQUIRED/);
  assert.match(workflow,/vibe2-candidate-release\.yml\/dispatches/);
  assert.equal(policy.robloxDevelopmentInvestment.activePortfolio.onePatchRelease,
    'AFTER_ALL_CANONICAL_VERIFIED_GATES_ONLY');
});


// 로블록스 독립 조직: 기존 실행기의 외부 플랫폼 변경 감지와 필수 공통 모듈 복구 경계.
test('Roblox-only workflow triggers and restored canonical runner modules remain local',()=>{
  const architecture=JSON.parse(fs.readFileSync(path.join(root,'company-learning/company-architecture-map.json'),'utf8'));
  const roadmap=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  assert.equal(architecture.repository?.fullName,'jaewoon-roblox/games');
  assert.equal(architecture.repository?.developmentPlatform,'ROBLOX');
  assert.equal(architecture.repository?.vibeExecution,'OWN_REPOSITORY_ONLY');
  assert.equal(roadmap.developmentAccess?.ROBLOX,'ALWAYS_ALLOWED');
  for(const target of ['WEB','UNITY','FORTNITE_UEFN','UNITY_WEB','UNITY_ANDROID']){
    assert.equal(roadmap.developmentAccess?.[target],'OWNER_HOLD',target+' must remain held');
  }
  for(const file of ['.github/workflows/vibe2-24h-runner.yml','.github/workflows/vibe2-continuous-core.yml']){
    const workflow=fs.readFileSync(path.join(root,file),'utf8');
    assert.doesNotMatch(workflow,/^\s+- ['"]?(?:web-games|unity-games|unreal-games)\/\*\*/m,
      file+' must never wake from a foreign game source tree');
    assert.match(workflow,/roblox-games\/\*\*/);
  }
  for(const file of ["tools/vibe2-neural-expansion-readiness.mjs","tools/vibe2-neural-shadow-audit.mjs","tools/vibe2-neural-phase2-readiness.mjs","tools/vibe2-remote-work-lock.mjs","tools/vibe2-performance-sanity.mjs","tools/company-design-checkpoint-recovery.mjs","tools/vibe2-system-steward.mjs","tools/vibe2-fan-in-review.mjs","tools/vibe2-incremental-qa.mjs","tools/vibe2-experience-control.mjs","tools/vibe2-self-architecture-evolution.mjs","tools/company-development-roblox-runtime-foundation.mjs"]){
    assert.ok(fs.statSync(path.join(root,file)).isFile(),file+' must exist for canonical runner');
  }
});


// 로블록스 실행기: 원본 책임 모듈의 실제 임포트 의존성 검증 (작업·게시 실행 없음).
test('restored canonical runner module imports resolve without publishing or writing game source',async()=>{
  for(const relativePath of [
    '../tools/vibe2-system-steward.mjs',
    '../tools/vibe2-fan-in-review.mjs',
    '../tools/vibe2-incremental-qa.mjs',
    '../tools/vibe2-experience-control.mjs',
    '../tools/vibe2-self-architecture-evolution.mjs',
    '../tools/company-development-roblox-runtime-foundation.mjs'
  ]){
    const loaded=await import(new URL(relativePath,import.meta.url).href);
    assert.ok(loaded&&typeof loaded==='object','canonical module load failed: '+relativePath);
  }
});

// 실제 로블록스 중앙정책 4문서 검증. 불일치/타 플랫폼 활성화는 반드시 차단한다.
test('canonical Roblox worker context reads exactly four retained policy documents',async()=>{
  const {validateSharedWorkerContext,RETAINED_DOCUMENTS}=await import('../tools/company-shared-context.mjs');
  assert.equal(RETAINED_DOCUMENTS.length,4);
  const status=validateSharedWorkerContext({root});
  assert.equal(status.pass,true);
  assert.equal(status.policyAuthorityVerified,false);
  assert.equal(status.sourceWriteAuthorized,false);
  assert.equal(status.releaseAuthorized,false);
  assert.equal(status.hashes.directiveSha256,status.hashes.policySha256);
  assert.throws(()=>validateSharedWorkerContext({root,expectedPolicySha256:'not-current'}),/POLICY_SHA_MISMATCH/);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-context-'));
  try {
    for(const relative of paths){
      const dest=path.join(tmp,relative);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.copyFileSync(path.join(root,relative),dest);
    }
    const docFile=path.join(tmp,paths[0]),policy=JSON.parse(fs.readFileSync(docFile,'utf8'));
    policy.developmentAccess.WEB='ALWAYS_ALLOWED';
    fs.writeFileSync(docFile,JSON.stringify(policy));
    assert.throws(()=>validateSharedWorkerContext({root:tmp}),/ROBLOX_CANONICAL_POLICY_CONTRACT_INVALID/);
    fs.unlinkSync(path.join(tmp,paths[3]));
    assert.throws(()=>validateSharedWorkerContext({root:tmp}),/SECURITY_DOCUMENT_MISSING_OR_INVALID/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

// 파일명: qa/company-policy-steward.test.mjs
// 메인: 실제 로블록스 계획-예약-작업지시서 함수를 연결하는 무수정 회귀 검증.
// 원격 GitHub Actions 작업자/게임 서버/게시 검증과 구별한다.
test('Roblox canonical autonomous plan reserves a real task and generates work instruction',async()=>{
  const {reserveVibeTaskBatch}=await import('../tools/vibe2-queue-control.mjs');
  const {buildVibeContinuousWorkOrder}=await import('../tools/vibe2-continuous-runner.mjs');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'game-catalog.json'),'utf8'));
  const policy=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const runtime=JSON.parse(fs.readFileSync(path.join(root,'vibe2-runtime.json'),'utf8'));
  const initial=planVibe2AutonomousTasks({
    catalog,status:{projects:[]},developmentQueue:{items:[]},queue:{tasks:[]},
    repoRoot:root,maxConcurrentTasks:8,queueMaxConcurrentTasks:8,
    planningBacklogTarget:6,planningBacklogMinimum:1
  });
  // 관측 전용: 자동계획이 일반 코드 작업보다 자산 작업을 먼저 택하는지 실제 후보를 추적.
  const {collectProjects,findSafeTasks,selectRobloxDevelopmentPortfolio}=await import('../tools/vibe2-auto-planner.mjs');
  const projects=collectProjects({projects:[]},catalog,root,{items:[]});
  const portfolio=selectRobloxDevelopmentPortfolio(projects,catalog,root);
  const observed=portfolio.projects.map(project=>{
    const candidates=findSafeTasks(project,root,{tasks:[]});
    return {gameId:project.gameId,candidates:candidates.slice(0,12).map(task=>({
      id:task.id,lane:task.executionLane,asset:task.assetProductionLane===true,
      owner:task.ownerDirective===true,holistic:task.studioQualityEvolution?.existingHolisticBackfillRequired===true,
      focus:task.studioQualityEvolution?.focusPillar,priority:task.priority,
      files:(task.responsibleFiles||[]).slice(0,6),department:task.department,
      source:task.sourceRoot,status:task.status
    }))};
  });
  console.log('ROBLOX_AUTONOMOUS_CANDIDATE_LANES='+JSON.stringify(observed));
  assert.equal(initial.planned,true,'canonical planner must create real tasks');
  // 실측 자산 학습이 없는 경우에도 일반 로블록스 게임 개발은 별개 실행 경로다.
  // 소유자 CC0 자산 교체는 자산 전용 안전 게이트를 보존한다.
  assert.ok(initial.tasks.every(task=>task.target==='roblox'));
  assert.ok(initial.tasks.some(task=>task.ownerDirective===true),
    'existing owner CC0 directive must remain in canonical queue');
  assert.ok(initial.tasks.some(task=>task.assetProductionLane===true),
    'CC0 asset work must use the asset verification lane');
  assert.ok(initial.queue.tasks.length>0,'there must be runnable source tasks');
  const lane=initial.queue.tasks.some(t=>t.executionLane==='GAME_PRIMARY'&&t.status==='queued')
    ? 'game-primary':'asset-development';
  const batch=reserveVibeTaskBatch(initial.queue,{
    maxConcurrentTasks:2,lane,policy,
    reservation:{reservationRunId:'roblox-pr-local-check',reservationRunAttempt:1}
  });
  assert.ok(batch.reserved>0,'canonical queue must reserve at least one real task');
  assert.ok(batch.tasks.every(t=>t.target==='roblox'));
  assert.ok(batch.matrix.length>0,'canonical worker matrix must exist');
  const task=batch.tasks[0];
  const order=buildVibeContinuousWorkOrder({
    runtime,queue:batch.queue,experience:{records:[]},taskId:task.id,
    centralPolicySnapshot:null,centralPolicyLiveRef:'origin/main'
  });
  console.log('ROBLOX_CANONICAL_PLAN_RESERVE_ORDER='+JSON.stringify({
    queued:initial.queue.tasks.length,lane,reserved:batch.reserved,taskId:task.id,
    gameId:task.gameId,workOrderRun:order.run,workOrderReason:order.reason||null,
    target:order.target||null
  }));
  // 자동으로 예약된 작업은 실제 일반 코드 또는 여전히 보호된 자산 작업이어야 한다.
  assert.ok(order.run===true||order.reason==='VERIFIED_COMMERCIAL_BLACK_BOX_DISTILLATION_REQUIRED_FOR_INTERNAL_ASSET_PRODUCTION');
  assert.ok(!order.run||order.target==='roblox');
  const request={gameId:'simple-rpg',goal:'기존 캐릭터 움직임과 화면 UI를 기존 기능 보존하며 수정',requestId:'1234568',
    files:'client/Game.client.luau;shared/GameConfig.luau'};
  const queued=enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog,request,repoRoot:root,policy});
  const gameBatch=reserveVibeTaskBatch(queued.queue,{
    maxConcurrentTasks:1,lane:'game-primary',policy,
    reservation:{reservationRunId:'roblox-pr-local-owner-work',reservationRunAttempt:1}
  });
  assert.equal(gameBatch.tasks.length,1,'owner build-up must use canonical game-primary reservation');
  const gameOrder=buildVibeContinuousWorkOrder({
    runtime,queue:gameBatch.queue,experience:{records:[]},
    taskId:gameBatch.tasks[0].id,centralPolicySnapshot:null,
    centralPolicyLiveRef:'origin/main'
  });
  console.log('ROBLOX_CANONICAL_GAME_PRIMARY_ORDER='+JSON.stringify({
    reserved:gameBatch.reserved,run:gameOrder.run,reason:gameOrder.reason||null,
    taskId:gameBatch.tasks[0].id,target:gameOrder.target||null
  }));
  const learningRule=policy.developmentLifecycleMachine?.machineOnlyProjectContinuation
    ?.verifiedLearningMaxUse?.externalVerifiedBlackBoxFirstApplication;
  assert.equal(learningRule?.required,true);
  assert.equal(learningRule?.robloxExistingSourceMaintenanceWithoutVerifiedExternalLearningForbidden,true);
  assert.equal(learningRule?.internalAssetProductionMustConsumeVerifiedCommercialDistillationFirst,true);
  assert.equal(gameOrder.run,false,'unverified external learning must never authorize Roblox source write');
  assert.equal(gameOrder.reason,'VERIFIED_COMMERCIAL_BLACK_BOX_DISTILLATION_REQUIRED_FOR_INTERNAL_ASSET_PRODUCTION');
  assert.equal(gameOrder.selectedTask?.target,'roblox');
});

// 로블 조직 기존 설계·학습·복구 실행기 원본 모듈의 실제 ES import 검증.
test('restored canonical runtime modules load and side-effecting design CLIs parse',async()=>{
  // 설계기와 동일한 정본 정책 경로를 제공한다. 정책 누락/위조는 허용하지 않는다.
  const prior=process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH;
  process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH=path.join(root,paths[0]);
  try {
  for(const name of ["vibe2-verified-design-handoff","vibe2-post-release-focus","vibe2-authorized-source-memory","vibe2-release-dispatch-recovery","vibe2-release-baseline-queue","vibe2-code-pattern-ingest","free-budget-telemetry","vibe2-practice-distillation","vibe2-learning-practice-worker","company-design-cycle","company-baseline-gate","company-design-seed-normalize","company-strict-production-review","owner-design-reset","artbook-fact-pack","production-classification","vibe2-training-sample"]){
    const file='../tools/'+name+'.mjs';
    if(['artbook-fact-pack','company-design-cycle','company-baseline-gate','company-design-seed-normalize','company-strict-production-review','owner-design-reset','production-classification'].includes(name)){
      // 원본 CLI는 import 즉시 ARTBOOK_GAME_ID를 검사하고 종료하도록 설계됐다.
      // 실행 없이 문법 검사하되, 환경을 위조해 완료 증거를 만들지 않는다.
      const {execFileSync}=await import('node:child_process');
      execFileSync(process.execPath,['--check',path.join(root,'tools',name+'.mjs')],{stdio:'pipe'});
      continue;
    }
    const loaded=await import(new URL(file,import.meta.url).href);
    assert.ok(loaded&&typeof loaded==='object','canonical module import failed: '+file);
  }
  }finally{
    if(prior===undefined)delete process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH;
    else process.env.COMPANY_VERIFIED_DESIGN_POLICY_PATH=prior;
  }
});


// 웹 조직의 검증된 라이브러리 사용 원칙을 로블록스 자체 자산 원장으로 검증한다.
// 웹 조직 파일·큐·상태를 소스로 직접 연결하거나 수입하지 않는다.
test('Roblox asset library reuse and verified-license policy matches approved web principles',()=>{
  const canonical=JSON.parse(fs.readFileSync(path.join(root,paths[0]),'utf8'));
  const library=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const rules=library.rules||{};
  const assetPolicy=canonical.assetProductionParallelContract?.assetAcquisitionAndReuse||{};
  assert.equal(library.kind,'company-asset-library');
  assert.equal(rules.lookupBeforeNativeAssetChoice,true);
  assert.equal(rules.existingRepositoryInventoryBeforeExternal,true);
  assert.equal(rules.externalGapFillBeforeNewAuthoring,true);
  assert.equal(rules.externalSourceAcquisitionOnlyAfterInternalReuseFailure,true);
  assert.equal(rules.externalSourceSpeculativeDownloadForbidden,true);
  assert.equal(rules.rawExternalAssetNotVerifiedCompanyAsset,true);
  assert.equal(rules.nativeRuntimeVerificationBeforePromotion,true);
  assert.equal(rules.unityRobloxNativeVariantsSeparated,true);
  assert.equal(rules.robloxVerifiedMotionLibraryBeforeNewKeyframes,true);
  assert.equal(assetPolicy.repositoryInventoryRequiredBeforeExternalAcquisition,true);
  assert.equal(assetPolicy.assetLicenseAndProvenanceMustRemainVerified,true);
  assert.equal(assetPolicy.externalSourceRequirements?.unknownOrNonCommercialForbidden,true);
  assert.ok(assetPolicy.externalSourceRequirements?.allowedLicenses?.includes('CC0'));
  assert.equal(assetPolicy.externalSourceRequirements?.originalSourceHashRequired,true);
  assert.equal(assetPolicy.rawThirdPartyAssetMayNotBePromotedAsVerifiedCompanyAssetWithoutRuntimeConsumer,true);
  const selector=fs.readFileSync(path.join(root,'assets/asset-selector.js'),'utf8');
  assert.match(selector,/BLOCKED_LICENSE_WORDS/);
  assert.match(selector,/blockedLicense\(/);
  assert.match(selector,/licenseReviewRequired/);
  assert.match(selector,/animationResourceReady/);
  const architecture=JSON.parse(fs.readFileSync(path.join(root,paths[2]),'utf8'));
  assert.equal(architecture.repository?.vibeExecution,'OWN_REPOSITORY_ONLY');
});
// 검증된 CC0 원본은 가벼운 게임 스타일 수정이 가능하며 변형본의 검증은 별도다.
test('verified CC0 assets allow light adaptation without claiming native derivative QA',async()=>{
  const {planVibeExternalCustomization}=await import('../assets/asset-selector.js');
  const makeAsset=(id,styleFamily,license='CC0')=>({
    id,family:'CHARACTER',styleFamily,downloaded:true,license,
    path:'assets/roblox/creatures/'+id+'.glb',
    sourceHash:'a'.repeat(64),sourceUrl:'https://example.com/source/'+id,
    licenseEvidenceUrl:'https://example.com/license/'+id,
    runtimeVerificationState:'VERIFIED_RUNTIME'
  });
  const plan=planVibeExternalCustomization({
    request:'NPC character',target:'ROBLOX',gameId:'simple-rpg',
    sourceRoot:'roblox-games/simple-rpg',
    ownerScope:{status:'ACTIVE',existingPipelineOnly:true,activeTargets:['ROBLOX'],ownerHeldTargets:[]},
    styleBible:{styleFamily:'soft fantasy'},approvedDesign:{visualIdentity:'soft fantasy'},
    approvedDesignFingerprint:'b'.repeat(64),
    assets:[makeAsset('same-style','soft fantasy'),makeAsset('other-style','hard scifi'),
      makeAsset('blocked-license','soft fantasy','CC-BY-NC')]
  });
  assert.equal(plan.authorized,true);
  assert.equal(plan.existingVerifiedSourceCount,2,'NC sources must be excluded');
  const candidates=plan.references.flatMap(row=>row.sourceCandidates||[]);
  const matching=candidates.find(row=>row.assetId==='same-style');
  const mismatched=candidates.find(row=>row.assetId==='other-style');
  assert.ok(matching&&mismatched,'verified candidates must be discoverable');
  assert.equal(matching.derivative.cc0ReuseAdaptation.mode,'LIGHT_CC0_ADAPTATION');
  assert.equal(matching.derivative.cc0ReuseAdaptation.deepRemakeMandatory,false);
  assert.equal(matching.derivative.cc0ReuseAdaptation.sourceLicense,'CC0');
  assert.equal(matching.derivative.cc0ReuseAdaptation.transformedArtifactRuntimeVerified,false);
  assert.equal(matching.derivative.runtimeVerified,false);
  assert.equal(matching.derivative.createdArtifact,false);
  assert.equal(mismatched.derivative.cc0ReuseAdaptation.mode,'STYLE_COMPATIBILITY_REVIEW_REQUIRED');
  assert.ok(!candidates.some(row=>row.assetId==='blocked-license'));
  assert.equal(plan.appliedToGame,false);
  assert.equal(plan.qaPassed,false);
  assert.equal(plan.newQueueOrShadowPipelineCreated,false);
});

test('Roblox independent CC0 license ledger exists but cannot invent verification',()=>{
  const ledger=JSON.parse(fs.readFileSync(path.join(root,'assets/asset-license-ledger.json'),'utf8'));
  assert.equal(ledger.policy?.organization,'jaewoon-roblox/games');
  assert.equal(ledger.policy?.candidateCatalogIsNotLicenseProof,true);
  assert.equal(ledger.policy?.publicUseRequiresLedgerEntry,true);
  assert.equal(ledger.policy?.minimalStyleAdaptationAllowed,true);
  assert.equal(ledger.policy?.derivativeRuntimeQASeparateFromOriginal,true);
  assert.equal(ledger.policy?.onDemandAcquisitionOnlyAfterVerifiedInventoryGap,true);
  assert.deepEqual(ledger.entries,[],'unverified Roblox asset must not be promoted to a licensed source');
});

// Original company designer runs only Roblox seeds against this repository's native policy.
test('original design runtime source excludes held platform seeds and absent web directive',()=>{
  const source=fs.readFileSync(path.join(root,'.github/workflows/company-seed-design-runtime.yml'),'utf8');
  assert.ok(!source.includes("fs.readFileSync('company-directive.json'"),
    'Roblox designer must not read the removed web directive');
  assert.ok(!source.includes("'company-directive.json' \\"),
    'Roblox designer must not fetch the removed web directive');
  assert.match(source,/ROBLOX_DESIGN_OWNER_POLICY_UNVERIFIED/);
  assert.match(source,/ROBLOX_ONLY_OWNER_POLICY/);
  assert.ok(source.includes('const active=eligible.filter(seed=>String(seed?.INITIAL_TARGET_PLATFORM'));
  assert.match(source,/HELD_FOREIGN_OR_UNDECLARED/);
});

test('canonical recovery pipeline imports and rejects unverified learning promotion',async()=>{
  const {normalizeRecoveryQueue}=await import('../tools/company-recovery-queue.mjs');
  const {escalateRecoveryCandidates}=await import('../tools/company-recovery-escalation.mjs');
  const {promoteVerifiedRecoveryLearning}=await import('../tools/company-recovery-learning.mjs');
  const {distillRecoveryCodePatterns}=await import('../tools/company-recovery-code-distillation.mjs');
  const empty=normalizeRecoveryQueue({tasks:[]});
  assert.deepEqual(empty.tasks,[]);
  const escalated=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[]},systemAiQueueInput:{tasks:[]},recoveryInput:empty
  });
  assert.equal(escalated.queue.tasks.length,0);
  const result=promoteVerifiedRecoveryLearning({
    recoveryInput:{tasks:[{
      id:'roblox-unverified-test',status:'failed',failureSignature:'TEST_FAILURE',
      recoveryStrategy:'REVIEW_REQUIRED',deterministicEvidence:[],primaryAiReview:'PENDING'
    }]},
    experienceInput:{version:3,records:[]}
  });
  assert.equal(result.added,0);
  assert.deepEqual(result.experience.records,[]);
  const distilled=distillRecoveryCodePatterns({
    recoveryInput:{tasks:[]},libraryInput:{patterns:[]},authorizedSummary:{},externalMemory:{}
  });
  assert.equal(distilled.stats.internalRecoveryAdded,0);
  assert.equal(distilled.stats.externalAdvisoryAdded,0);
});
