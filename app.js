(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const screens = ['intro', 'game', 'letter', 'result'];
  const defaultMessage = '不是手滑发错人，\n是想了很久，才点下发送。\n\n想和你一起吃饭、散步，\n把平平无奇的日子，过成值得期待的明天。';
  const params = new URLSearchParams(location.search);
  let recipient = (params.get('to') || '').trim().slice(0, 20);
  let sender = (params.get('from') || '').trim().slice(0, 20);
  let message = (params.get('message') || '').trim().slice(0, 240);
  let currentScreen = 'intro', toastTimer, revealTimer, confettiTimer, thinkCount = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyLetter() {
    document.querySelectorAll('[data-recipient]').forEach(node => node.textContent = recipient || '特别的你');
    document.querySelectorAll('[data-sender]').forEach(node => node.textContent = sender || '某个喜欢你的人');
    $('letter-message').textContent = message || defaultMessage;
    document.title = recipient ? `给${recipient}的一封信 · 心动投递局` : '心动投递局 · 有一份喜欢待签收';
  }
  function showScreen(name) {
    clearTimeout(revealTimer);
    if (name !== 'game') stopRound();
    clearTimeout(toastTimer);
    $('toast').hidden = true;
    currentScreen = name;
    screens.forEach(id => $(id).hidden = id !== name);
    $('promises').hidden = name !== 'intro';
    if (name !== 'intro') $(name + '-title').focus({preventScroll:true});
    else $('start').focus({preventScroll:true});
    window.scrollTo({top:0, behavior:'instant'});
  }
  function toast(text) {
    clearTimeout(toastTimer);
    $('toast').textContent = text;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => $('toast').hidden = true, 3400);
  }
  function resetGame() {
    stopRound();
    clearTimeout(confettiTimer);
    $('confetti').replaceChildren();
    thinkCount = 0;
    $('think').textContent = '让我想想';
    stage = 0;
    $('runaway').style.left = '10px';
    $('runaway').style.top = '12px';
    $('runaway-note').textContent = '试试看，能不能抓住这颗嘴硬的心？';
    prepareStage();
  }
  $('start').addEventListener('click', () => {resetGame(); showScreen('game');});
  $('suspicious').addEventListener('click', () => toast('唯一的套路：想多陪你五分钟。奶茶可以验货，真心也是。'));
  $('skip').addEventListener('click', () => showScreen('letter'));
  $('exit-game').addEventListener('click', () => showScreen('intro'));

  const stages = [
    ['心动接收站', '喜欢正在向你靠近。', '点亮哪个格子，就点哪里。爱心、花朵和信封都能收集；遇到闹钟就等下一颗，不扣分。'],
    ['回忆照相馆', '原来，我们这么合拍。', '翻开两张卡片，找到相同的小美好。配完一组，会有新的回忆送达。'],
    ['专属暗号局', '把这串心动，记在心里。', '从 2 个暗号开始，最多 4 个。先看亮起的顺序，再照着点；忘记了可以随时重播，不扣分。'],
    ['礼物分拣处', '什么都想留一份给你。', '鲜花、奶茶、拥抱送给你；加班、烦恼和坏天气，统统退回。'],
    ['约会放映室', '把下次见面，提前排练。', '六个没有标准答案的小问题。选出你的心意，我们把它装进约会邀请。']
  ];
  let stage = 0, running = false, paused = false, elapsed = 0, tick = 0, lastTick = 0;
  let score = 0, state = {}, nextEvent = 0, choices = [];
  const symbols = ['🌷','🧋','🌙','🍰'];
  const quiz = [
    ['见面第一件事，想做什么？', ['先买两杯奶茶','一起慢慢散步','去吃惦记很久的店'], '收到，约会第一条已记在小本本上。'],
    ['突然下雨了，我们怎么办？', ['躲进小书店','撑同一把伞','找家咖啡馆听雨'], '天气预报：有雨，局部地区有心动。'],
    ['对方紧张到说不出话，你会？', ['给一个鼓励的笑','我先讲个冷笑话','递奶茶：喝一口再说'], '社恐寄件人：得救了，谢谢你。'],
    ['送你一项超能力，你选？', ['把烦恼变成小饼干','把周末延长一天','瞬移到想见的人身边'], '已向宇宙提交申请，目前由想念代办。'],
    ['约会背景音乐应该是？', ['温柔的轻音乐','一起哼的老歌','路边的人声和晚风'], '这一段，就当作我们故事的片尾曲。'],
    ['告别之前，想留下一句？', ['今天很开心','下次还一起吧','到家记得告诉我'], '邀请已封好。接下来，是那句藏了很久的话。']
  ];
  function shuffle(items) {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
    return array;
  }
  function makeButton(text, onClick, className = 'play-tile') {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = text;
    button.addEventListener('click', onClick); return button;
  }
  function active() {return running && !paused && !document.hidden && !$('custom-dialog').open;}
  function stopRound() {clearInterval(tick); tick = 0; running = false;}
  function prepareStage() {
    stopRound(); $('playfield').inert = false; $('playfield').classList.remove('paused'); paused = false; elapsed = 0; score = 0; state = {}; choices = stage === 0 ? [] : choices;
    $('stage-label').textContent = `0${stage + 1} / ${stages[stage][0]}`;
    $('game-title').textContent = stages[stage][1];
    $('stage-description').textContent = stages[stage][2];
    document.querySelectorAll('.route li').forEach((item, i) => {
      item.classList.toggle('current', i === stage); item.classList.toggle('done', i < stage);
      if (i === stage) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current');
    });
    $('stage-score').textContent = stage === 4 ? '约会清单 0 / 6' : '本关收集 0';
    $('stage-clock').textContent = stage === 4 ? '不用赶，慢慢选' : '60 秒小挑战';
    $('time-fill').style.width = '0%';
    $('stage-feedback').textContent = '准备好了，就按下开始。这一站没有失败。';
    $('playfield').replaceChildren();
    const welcome = document.createElement('div'); welcome.className = 'stage-welcome';
    const icon = document.createElement('span'); icon.textContent = ['💌','📷','🎵','🎁','🎬'][stage];
    const title = document.createElement('strong'); title.textContent = stages[stage][0];
    const copy = document.createElement('p'); copy.textContent = ['每一颗收到的心，都有一点点偏爱。','奶茶、月亮、小猫，还有想一起做的小事。','不用心有灵犀，愿意再听一遍就好。','你的快乐我签收，你的烦恼我退货。','这一场约会，你说了算。'][stage];
    welcome.append(icon,title,copy); $('playfield').append(welcome);
    $('stage-start').hidden = false; $('stage-next').hidden = true; $('pause').hidden = true;
    $('pause').textContent = '暂停一下';
  }
  function updateScore(text) {$('stage-score').textContent = text || `本关收集 ${score}`;}
  function finishStage() {
    stopRound(); $('pause').hidden = true;
    $('playfield').querySelectorAll('button').forEach(button => button.disabled = true);
    $('time-fill').style.width = '100%'; $('stage-clock').textContent = '这一站，已收好';
    $('stage-feedback').textContent = stage === 4 ? '约会清单完成。最后一封信，等你亲自打开。' : `收下 ${score} 份小美好。${['你的偏爱已装进信封。','原来平凡的小事，也值得被记住。','暗号记住了，想念也记住了。','快乐已打包，烦恼已退回。'][stage]}`;
    $('stage-next').textContent = stage === 4 ? '拆开最后的告白 →' : '盖好邮戳，去下一站 →';
    $('stage-next').hidden = false; $('stage-next').focus({preventScroll:true});
  }
  function startRound() {
    if (running) return;
    running = true; elapsed = 0; nextEvent = 0; lastTick = performance.now();
    $('stage-start').hidden = true; $('pause').hidden = false;
    $('stage-feedback').textContent = '出发！你的每一次点击，都算数。';
    $('playfield').replaceChildren();
    if (stage === 0) initCatch();
    if (stage === 1) initMemory();
    if (stage === 2) initSequence();
    if (stage === 3) initSort();
    if (stage === 4) {state.question = 0; renderQuiz();}
    tick = setInterval(() => {
      const now = performance.now(), delta = Math.min(now - lastTick, 300); lastTick = now;
      const playing = active();
      $('playfield').classList.toggle('paused', !playing);
      $('playfield').inert = !playing;
      if (!playing) return;
      if (stage === 4) return;
      elapsed += delta;
      $('stage-clock').textContent = `剩余 ${Math.max(0,Math.ceil((60000 - elapsed) / 1000))} 秒`;
      $('time-fill').style.width = Math.min(100, elapsed / 600) + '%';
      if (elapsed >= 60000) {finishStage(); return;}
      if (stage === 0 && elapsed >= nextEvent) spawnCatch();
      if (stage === 1 && state.resolveAt && elapsed >= state.resolveAt) resolveMemory();
      if (stage === 2) stepSequence();
    }, 100);
  }
  $('stage-start').addEventListener('click', startRound);
  $('stage-next').addEventListener('click', () => {
    if (stage === 4) {showScreen('letter'); return;}
    stage++; prepareStage(); $('game-title').focus({preventScroll:true});
  });
  $('pause').addEventListener('click', () => {
    paused = !paused; $('pause').textContent = paused ? '继续旅程' : '暂停一下';
    $('playfield').inert = paused; $('playfield').classList.toggle('paused', paused);
  });
  function initCatch() {
    const grid = document.createElement('div'); grid.className = 'catch-grid'; state.cells = [];
    for (let i = 0; i < 9; i++) {
      const button = makeButton('·', () => {
        if (!active() || state.target !== i || state.caught) return;
        state.caught = true;
        if (state.good) {score++; button.textContent = '✓'; $('stage-feedback').textContent = ['这颗是偏爱，收好。','多一份喜欢，多一点勇气。','想见你的心，又藏不住了。'][score % 3];}
        else {button.textContent = '💤'; $('stage-feedback').textContent = '闹钟就算了，让喜欢你的人多睡五分钟。';}
        button.classList.remove('lit'); updateScore();
      }); button.setAttribute('aria-label', `第 ${i+1} 格，等待心动`); state.cells.push(button); grid.append(button);
    }
    $('playfield').append(grid); spawnCatch();
  }
  function spawnCatch() {
    state.cells.forEach((b,i) => {b.textContent = '·'; b.classList.remove('lit'); b.setAttribute('aria-label', `第 ${i+1} 格，等待心动`);});
    state.target = Math.floor(Math.random()*9); state.good = Math.random() > .12; state.caught = false;
    const button = state.cells[state.target]; button.textContent = state.good ? ['💌','💗','🌷'][score % 3] : '⏰';
    button.setAttribute('aria-label',state.good ? '接住心动' : '闹钟，不用接'); button.classList.add('lit'); nextEvent = elapsed + 2400;
  }
  function initMemory() {
    state.deck = shuffle([...symbols,...symbols]); state.open = []; state.matched = 0; state.resolveAt = 0;
    const grid = document.createElement('div'); grid.className = 'memory-grid';
    state.cards = state.deck.map((symbol,i) => {
      const button = makeButton('♡', () => {
        if (!active() || state.resolveAt || button.disabled || state.open.includes(i)) return;
        button.textContent = symbol; button.classList.add('flipped'); button.setAttribute('aria-label',symbol);
        state.open.push(i);
        if (state.open.length === 2) state.resolveAt = elapsed + 800;
      }); button.setAttribute('aria-label',`翻开第 ${i+1} 张回忆`); grid.append(button); return button;
    });
    $('playfield').replaceChildren(grid);
  }
  function resolveMemory() {
    const [a,b] = state.open;
    if (state.deck[a] === state.deck[b]) {
      score++; state.matched += 2; [a,b].forEach(i=>{state.cards[i].disabled=true;state.cards[i].classList.add('matched');});
      $('stage-feedback').textContent = '找到一对小美好。想和你拥有更多共同回忆。'; updateScore();
    } else [a,b].forEach(i=>{state.cards[i].textContent='♡';state.cards[i].classList.remove('flipped');state.cards[i].setAttribute('aria-label',`翻开第 ${i+1} 张回忆`);});
    state.open=[];state.resolveAt=0;
    if (state.matched===symbols.length*2) {initMemory();$('stage-feedback').textContent='这一页全是美好，下一页也一起收集。';}
  }
  function initSequence() {
    state.sequence = []; state.pads = []; state.length = 2;
    const grid = document.createElement('div'); grid.className = 'sequence-grid';
    ['🌷 花','🌙 月','💌 信','⭐ 星'].forEach((label,i)=>{
      const button = makeButton(label,()=>{
        if (!active() || state.mode !== 'input') return;
        if (state.sequence[state.input] !== i) { $('stage-feedback').textContent='差一点点！再听一次，慢慢来。'; beginSequence(false); return; }
        state.input++; $('stage-feedback').textContent=`对上了 ${state.input} / ${state.sequence.length} 个暗号`;
        if (state.input===state.sequence.length) {score++;updateScore();state.length=Math.min(4,state.length+1);beginSequence(true);}
      });state.pads.push(button);grid.append(button);
    });
    $('playfield').append(grid);
    const repeat=makeButton('再看一次暗号',()=>{if(active())beginSequence(false);},'text-button'); $('playfield').append(repeat);
    beginSequence(true);
  }
  function beginSequence(fresh) {
    if (fresh) state.sequence=Array.from({length:state.length},()=>Math.floor(Math.random()*4));
    state.mode='show';state.step=0;state.input=0;state.due=elapsed+900;
    state.pads.forEach(b=>b.classList.remove('lit'));
    $('stage-feedback').textContent=`先看顺序：这一轮有 ${state.sequence.length} 个暗号。`;
  }
  function stepSequence() {
    if(state.mode!=='show'||elapsed<state.due)return;
    state.pads.forEach(b=>b.classList.remove('lit'));
    if(state.step >= state.sequence.length*2){state.mode='input';$('stage-feedback').textContent='轮到你了：'+state.sequence.map(i=>state.pads[i].textContent).join(' → ');return;}
    if(state.step%2===0){const b=state.pads[state.sequence[state.step/2]];b.classList.add('lit');$('stage-feedback').textContent=`暗号 ${state.step/2+1}：${b.textContent}`;}
    state.step++;state.due=elapsed+(state.step%2 ? 900 : 400);
  }
  const gifts = [['🌷 鲜花',true],['🧋 奶茶',true],['🫂 拥抱',true],['🍰 蛋糕',true],['🌅 日落',true],['🐈 小猫的呼噜',true],['💼 周末加班',false],['🌧 坏天气',false],['😣 小烦恼',false],['⏰ 早八闹钟',false],['🦟 蚊子',false],['🔋 电量不足',false]];
  function initSort() {
    state.queue = shuffle(gifts); state.gift = state.queue.pop();
    const item=document.createElement('div');item.id='gift-item';item.className='gift-item';item.textContent=state.gift[0];
    const row=document.createElement('div');row.className='sort-actions';
    [true,false].forEach(value=>row.append(makeButton(value?'♥ 送给你':'↩ 退回去',()=>{
      if(!active())return;
      if(value===state.gift[1]){score++;$('stage-feedback').textContent=value?'快乐加一份，你值得所有美好。':'这份烦恼，投递局替你挡住了。';}
      else $('stage-feedback').textContent='分错也没关系，投递员偷偷帮你换好了。';
      updateScore();if(!state.queue.length)state.queue=shuffle(gifts);state.gift=state.queue.pop();item.textContent=state.gift[0];
    },'button secondary')));
    $('playfield').append(item,row);
  }
  function renderQuiz() {
    const q=quiz[state.question];state.answered=false;
    const card=document.createElement('div');card.className='quiz-card';
    const count=document.createElement('p');count.className='eyebrow';count.textContent=`SCENE 0${state.question+1} / 06`;
    const title=document.createElement('h3');title.textContent=q[0];card.append(count,title);
    q[1].forEach(answer=>card.append(makeButton(answer,()=>{
      if(!active()||state.answered)return;state.answered=true;choices.push(answer);
      card.querySelectorAll('.quiz-option').forEach(b=>{b.disabled=true;b.classList.toggle('chosen',b.textContent===answer);});
      $('stage-feedback').textContent=q[2];updateScore(`约会清单 ${choices.length} / 6`);$('time-fill').style.width=choices.length/6*100+'%';
      const next=makeButton(state.question===5?'把约会清单装进信里 →':'看看下一个场景 →',()=>{
        if(!active())return;
        if(state.question===5){finishStage();renderItinerary();}else{state.question++;renderQuiz();}
      },'button primary');card.append(next);next.focus({preventScroll:true});
    },'quiz-option')));
    $('playfield').replaceChildren(card);
  }
  function renderItinerary() {
    const card=document.createElement('div');card.className='quiz-card';
    const title=document.createElement('h3');title.textContent='我们的约会备忘录';const list=document.createElement('ol');list.className='itinerary';
    choices.forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});card.append(title,list);$('playfield').replaceChildren(card);
  }
  let dodgeCount=0;
  function dodge(event) {
    if(event)event.preventDefault();
    const button=$('runaway'), arena=$('runaway-arena');
    const maxX=Math.max(0,arena.clientWidth-button.offsetWidth-16), maxY=Math.max(0,arena.clientHeight-button.offsetHeight-16);
    const oldX=button.offsetLeft, oldY=button.offsetTop;
    let x,y;
    for(let i=0;i<12;i++){x=8+Math.random()*maxX;y=8+Math.random()*maxY;if(Math.hypot(x-oldX,y-oldY)>90)break;}
    button.style.left=x+'px';button.style.top=y+'px';
    dodgeCount++;
    $('runaway-note').textContent=['窗口去买奶茶了，请稍后再试。','拒绝申请：被一阵喜欢吹跑了。','你追我逃，嘴硬的小心思藏不住了。','抓到了也不算，这只是一个调皮按钮。'][dodgeCount%4];
  }
  $('runaway').addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')dodge(event);});
  $('runaway').addEventListener('pointerdown',dodge);
  $('runaway').addEventListener('click',event=>{event.preventDefault();});
  window.addEventListener('resize',()=>{$('runaway').style.left='10px';$('runaway').style.top='12px';});
  function celebrate() {
    $('confetti').replaceChildren();
    if (reducedMotion.matches) return;
    const colors = ['#be3d49','#e5a1a2','#b99b59','#7d9785','#d4bbae'];
    for (let i = 0; i < 48; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.setProperty('--left', Math.random() * 100 + '%');
      piece.style.setProperty('--delay', Math.random() * .7 + 's');
      piece.style.setProperty('--color', colors[i % colors.length]);
      $('confetti').append(piece);
    }
    confettiTimer = setTimeout(() => $('confetti').replaceChildren(), 3500);
  }
  function result(kind) {
    const accepted = kind === 'yes';
    $('result-label').textContent = accepted ? 'MISSION: HEART DELIVERED' : 'THANK YOU FOR BEING HONEST';
    $('result-title').textContent = accepted ? '签收成功，快乐有点超标。' : '心意收到，谢谢你的认真。';
    $('result-copy').textContent = accepted ? '寄件人正在原地转圈圈。\n那么，下一次见面，就从一起吃顿饭开始吧。' : '有些喜欢，送到就已经很勇敢。\n愿我们都遇见，刚刚好的心动。';
    $('receipt-text').textContent = accepted ? '双向奔赴 · 故事待续' : '谢谢回应 · 愿你开心';
    showScreen('result');
    if (accepted) celebrate();
  }
  $('yes').addEventListener('click', () => result('yes'));
  $('decline').addEventListener('click', () => result('no'));
  $('think').addEventListener('click', () => {
    thinkCount += 1;
    const jokes = ['正在召集恋爱脑开会…你慢慢想，我不催。', '会议决定：先请你喝杯奶茶，再慢慢想。', '没有倒计时，想好了再告诉我就好。'];
    $('think').textContent = thinkCount === 1 ? '还在认真想' : '允许我再想想';
    toast(jokes[Math.min(thinkCount - 1, jokes.length - 1)]);
  });
  $('replay').addEventListener('click', () => {resetGame(); showScreen('intro');});

  function shareUrl() {
    const url = new URL(location.href);
    url.search = ''; url.hash = '';
    if (recipient) url.searchParams.set('to', recipient);
    if (sender) url.searchParams.set('from', sender);
    if (message) url.searchParams.set('message', message);
    return url.href;
  }
  async function copyLink() {
    const url = shareUrl();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      $('copy-fallback').hidden = true;
      return true;
    } catch {
      $('copy-fallback').hidden = false;
      $('share-url').value = url;
      if (!$('custom-dialog').open) openCustomize();
      $('share-url').focus(); $('share-url').select();
      return false;
    }
  }
  function openCustomize() {
    $('recipient').value = recipient;
    $('sender').value = sender;
    $('message').value = message;
    if (!$('custom-dialog').open) $('custom-dialog').showModal();
  }
  $('customize').addEventListener('click', () => {$('copy-fallback').hidden = true; openCustomize();});
  $('close-custom').addEventListener('click', () => $('custom-dialog').close());
  $('custom-form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = $('custom-form').querySelector('[type=submit]');
    submit.disabled = true;
    recipient = $('recipient').value.trim().slice(0, 20);
    sender = $('sender').value.trim().slice(0, 20);
    message = $('message').value.trim().slice(0, 240);
    applyLetter();
    try {history.replaceState(null, '', shareUrl());} catch { /* Direct file previews may restrict history changes. */ }
    const copied = await copyLink();
    submit.disabled = false;
    if (copied) {$('custom-dialog').close(); toast('链接已复制，把这份喜欢送出去吧。');}
  });
  $('share').addEventListener('click', async () => {if (await copyLink()) toast('链接已复制，心动准备出发！');});
  $('custom-dialog').addEventListener('click', event => {
    if (event.target !== $('custom-dialog')) return;
    const box = $('custom-dialog').getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $('custom-dialog').close();
  });
  applyLetter();
})();
