(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const screens = ['intro', 'letter', 'result'];
  const defaultMessage = '不是手滑发错人，\n是想了很久，才点下发送。\n\n想和你一起吃饭、散步，\n把平平无奇的日子，过成值得期待的明天。';
  const params = new URLSearchParams(location.search);
  let recipient = (params.get('to') || '').trim().slice(0, 20);
  let sender = (params.get('from') || '').trim().slice(0, 20);
  let message = (params.get('message') || '').trim().slice(0, 240);
  let currentScreen = 'intro', toastTimer, confettiTimer, thinkCount = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyLetter() {
    document.querySelectorAll('[data-recipient]').forEach(node => node.textContent = recipient || '特别的你');
    document.querySelectorAll('[data-sender]').forEach(node => node.textContent = sender || '某个喜欢你的人');
    $('letter-message').textContent = message || defaultMessage;
    document.title = recipient ? `给${recipient}的一封信 · 心动投递局` : '心动投递局 · 有一份喜欢待签收';
  }
  function showScreen(name) {
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
  function resetLetter() {
    clearTimeout(confettiTimer);
    $('confetti').replaceChildren();
    thinkCount = 0;
    $('think').textContent = '让我想想';
    dodgeCount = 0;
    $('runaway').style.left = '10px';
    $('runaway').style.top = '12px';
    $('runaway-note').textContent = '试试看，能不能抓住这颗嘴硬的心？';
  }
  $('start').addEventListener('click', () => {resetLetter(); showScreen('letter');});
  $('suspicious').addEventListener('click', () => toast('没有闯关，没有考验，只有一句想亲口告诉你的话。'));
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
  $('replay').addEventListener('click', () => {resetLetter(); showScreen('intro');});

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
