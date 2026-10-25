(() => {
  'use strict';
  const toggle = document.getElementById('music-toggle');
  const status = document.getElementById('music-status');
  const volume = document.getElementById('music-volume');
  let context, master, timer, wanted = false, touched = false, nextNote = 0, beat = 0, revision = 0;
  // An original, slow pentatonic music-box loop. No external audio requests.
  const melody = [72,76,79,83,81,79,76,null,74,76,79,81,79,76,74,null,72,74,76,79,76,74,72,null,69,72,76,79,76,74,72,null];
  const bass = [48,53,57,55];
  function note(midi, at, length, strength) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(strength, at + .035);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    oscillator.connect(envelope); envelope.connect(master);
    oscillator.start(at); oscillator.stop(at + length + .05);
    oscillator.onended = () => {oscillator.disconnect(); envelope.disconnect();};
  }
  function schedule() {
    if (!wanted || document.hidden || context.state !== 'running') return;
    if (nextNote < context.currentTime) nextNote = context.currentTime + .06;
    while (nextNote < context.currentTime + .35) {
      const pitch = melody[beat % melody.length];
      if (pitch !== null) note(pitch, nextNote, 1.35, .28);
      if (beat % 8 === 0) {
        const root = bass[Math.floor(beat / 8) % bass.length];
        note(root, nextNote, 3.5, .18); note(root + 7, nextNote + .12, 3.2, .09);
      }
      beat++; nextNote += .58;
    }
  }
  function paint() {
    toggle.setAttribute('aria-pressed', String(wanted));
    toggle.textContent = wanted ? '♫ 关闭音乐' : '♫ 开启音乐';
    status.textContent = wanted ? '轻柔八音盒 · 正在陪你' : '轻柔八音盒 · 已关闭';
  }
  async function sync() {
    const version = ++revision;
    clearInterval(timer); timer = null;
    paint();
    if (!wanted || document.hidden) {
      if (context) {
        master.gain.setValueAtTime(0, context.currentTime);
        await context.suspend().catch(() => {});
      }
      return;
    }
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error('Audio unavailable');
        context = new Audio(); master = context.createGain();
        master.gain.value = 0; master.connect(context.destination);
      }
      await context.resume();
      if (version !== revision || !wanted || document.hidden) return;
      if (context.state !== 'running') throw new Error('Audio blocked');
      master.gain.setTargetAtTime(Number(volume.value) / 100 * .5, context.currentTime, .15);
      nextNote = context.currentTime + .08;
      schedule(); timer = setInterval(schedule, 150);
    } catch {
      if (version !== revision) return;
      wanted = false; paint(); status.textContent = '音乐未能播放，请再点一次开启';
    }
  }
  toggle.addEventListener('click', () => {touched = true; wanted = !wanted; sync();});
  document.getElementById('start').addEventListener('click', () => {
    if (!touched) {wanted = true; sync();}
  });
  volume.addEventListener('input', () => {
    if (master && wanted && !document.hidden) master.gain.setTargetAtTime(Number(volume.value) / 100 * .5, context.currentTime, .1);
  });
  document.addEventListener('visibilitychange', () => {if (context) sync();});
  window.addEventListener('pagehide', () => {wanted = false; sync();});
})();
