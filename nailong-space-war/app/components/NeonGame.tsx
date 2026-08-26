'use client';

import type PhaserType from 'phaser';
import { useEffect, useRef, useState } from 'react';

type Hud = { score: number; hp: number; shield: number; overload: number; progress: number; level: number; xp: number; xpMax: number; bossHp: number; bossActive: boolean };
type UpgradeChoice = { id: 'rapid' | 'spread' | 'power'; name: string; desc: string; icon: string };
type GameMode = 'menu' | 'intro' | 'playing' | 'upgrade' | 'victory' | 'defeat';
const defaultHud: Hud = { score: 0, hp: 100, shield: 25, overload: 0, progress: 0, level: 1, xp: 0, xpMax: 5, bossHp: 100, bossActive: false };
const upgradeChoices: UpgradeChoice[] = [
  { id: 'rapid', name: '奶油超频', desc: '射击间隔缩短 18%', icon: '↟' },
  { id: 'spread', name: '糖霜扇流', desc: '增加两枚斜向脉冲弹', icon: '⌁' },
  { id: 'power', name: '奶香聚能', desc: '所有脉冲伤害 +1', icon: '✦' },
];

export default function NeonGame() {
  const gameRef = useRef<PhaserType.Game | null>(null);
  const [hud, setHud] = useState(defaultHud);
  const [mode, setMode] = useState<GameMode>('menu');
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    let disposed = false;

    async function boot() {
      const Phaser = (await import('phaser')).default;
      if (disposed || gameRef.current) return;

      class BattleScene extends Phaser.Scene {
        player!: PhaserType.Physics.Arcade.Image;
        bullets!: PhaserType.Physics.Arcade.Group;
        enemyBullets!: PhaserType.Physics.Arcade.Group;
        enemies!: PhaserType.Physics.Arcade.Group;
        boss?: PhaserType.Physics.Arcade.Image;
        cursors!: PhaserType.Types.Input.Keyboard.CursorKeys;
        keys!: Record<string, PhaserType.Input.Keyboard.Key>;
        stars: PhaserType.GameObjects.Arc[] = [];
        lastShot = 0;
        nextEnemy = 0;
        nextBossAttack = 0;
        score = 0;
        hp = 100;
        shield = 25;
        overload = 0;
        startedAt = 0;
        battleActive = false;
        dragging = false;
        level = 1;
        xp = 0;
        xpMax = 5;
        fireDelay = 145;
        spreadLevel = 0;
        shotDamage = 1;
        bossHp = 180;
        bossMaxHp = 180;
        bossPhase = 0;
        bossActive = false;

        constructor() { super('battle'); }

        preload() {
          this.load.image('dragon', '/assets/player/nailong-player.png');
        }

        create() {
          this.makeTextures();
          this.makeBackdrop();
          this.bullets = this.physics.add.group({ defaultKey: 'pulse', maxSize: 160 });
          this.enemyBullets = this.physics.add.group({ defaultKey: 'enemyPulse', maxSize: 360 });
          this.enemies = this.physics.add.group({ defaultKey: 'enemy', maxSize: 48 });
          this.player = this.physics.add.image(360, 1080, 'dragon');
          this.player.setDisplaySize(110, 138).setCollideWorldBounds(true).setDepth(5).setCircle(70, 489, 500).setVisible(false);
          this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
          this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, undefined, this);
          this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, undefined, this);
          this.cursors = this.input.keyboard!.createCursorKeys();
          this.keys = this.input.keyboard!.addKeys('W,A,S,D,SHIFT,SPACE') as Record<string, PhaserType.Input.Keyboard.Key>;
          this.input.on('pointerdown', (pointer: PhaserType.Input.Pointer) => { if (this.battleActive) { this.dragging = true; this.moveTo(pointer); } });
          this.input.on('pointermove', (pointer: PhaserType.Input.Pointer) => { if (this.dragging && pointer.isDown) this.moveTo(pointer); });
          this.input.on('pointerup', () => { this.dragging = false; });
          window.addEventListener('nailong:start', this.startBattle);
          window.addEventListener('nailong:upgrade-selected', this.selectUpgrade as EventListener);
          this.events.once('shutdown', () => {
            window.removeEventListener('nailong:start', this.startBattle);
            window.removeEventListener('nailong:upgrade-selected', this.selectUpgrade as EventListener);
          });
        }

        startBattle = () => {
          this.battleActive = true;
          this.startedAt = this.time.now;
          this.score = 0; this.hp = 100; this.shield = 25; this.overload = 0;
          this.level = 1; this.xp = 0; this.xpMax = 5; this.fireDelay = 145; this.spreadLevel = 0; this.shotDamage = 1;
          this.bossHp = this.bossMaxHp; this.bossPhase = 0; this.bossActive = false; this.boss?.destroy(); this.boss = undefined;
          this.player.setPosition(360, 1080).setVisible(true).setActive(true);
          this.enemies.clear(true, true);
          this.bullets.clear(true, true);
          this.enemyBullets.clear(true, true);
          this.emitHud();
        };

        makeTextures() {
          const g = this.make.graphics({ x: 0, y: 0 });
          g.fillStyle(0x66f4ff).fillRoundedRect(0, 0, 10, 34, 5); g.fillStyle(0xffffff).fillRoundedRect(3, 0, 4, 24, 2); g.generateTexture('pulse', 10, 34); g.clear();
          g.fillStyle(0xff5470).fillCircle(9, 9, 9); g.fillStyle(0xffc0d0).fillCircle(9, 9, 3); g.generateTexture('enemyPulse', 18, 18); g.clear();
          g.fillStyle(0xff5470).fillTriangle(36, 68, 0, 8, 72, 8); g.fillStyle(0x731f55).fillRoundedRect(14, 0, 44, 50, 12); g.fillStyle(0xffa158).fillCircle(36, 23, 9); g.generateTexture('enemy', 72, 68); g.clear();
          g.fillStyle(0x131a38).fillRoundedRect(20, 40, 280, 130, 50); g.fillStyle(0x29265f).fillTriangle(80, 60, 0, 150, 126, 142).fillTriangle(240, 60, 320, 150, 194, 142); g.fillStyle(0xff5470).fillCircle(160, 102, 42); g.fillStyle(0xffb04c).fillCircle(160, 102, 18); g.lineStyle(7, 0x66f4ff, .8).strokeRoundedRect(58, 48, 204, 112, 40); g.generateTexture('boss', 320, 190); g.destroy();
        }

        makeBackdrop() {
          const graphics = this.add.graphics().setDepth(-3);
          graphics.fillGradientStyle(0x050a18, 0x050a18, 0x0b1730, 0x02040b, 1).fillRect(0, 0, 720, 1280);
          graphics.lineStyle(1, 0x4d8ba4, .1);
          for (let x = 0; x <= 720; x += 90) graphics.lineBetween(x, 0, x, 1280);
          for (let y = 0; y <= 1280; y += 90) graphics.lineBetween(0, y, 720, y);
          for (let i = 0; i < 70; i++) {
            const star = this.add.circle(Math.random() * 720, Math.random() * 1280, Math.random() * 2 + .5, i % 8 === 0 ? 0x66f4ff : 0xffffff, Math.random() * .65 + .2).setDepth(-2);
            star.setData('speed', Math.random() * 90 + 25); this.stars.push(star);
          }
          this.add.text(24, 25, 'SECTOR 07 // DEEP SPACE', { fontFamily: 'monospace', fontSize: '15px', color: '#66f4ff80', letterSpacing: 2 }).setDepth(3);
        }

        moveTo(pointer: PhaserType.Input.Pointer) {
          this.player.x = Phaser.Math.Clamp(pointer.worldX, 45, 675);
          this.player.y = Phaser.Math.Clamp(pointer.worldY - 65, 90, 1200);
        }

        selectUpgrade = (event: CustomEvent<UpgradeChoice['id']>) => {
          if (event.detail === 'rapid') this.fireDelay = Math.max(72, Math.round(this.fireDelay * .82));
          if (event.detail === 'spread') this.spreadLevel = Math.min(2, this.spreadLevel + 1);
          if (event.detail === 'power') this.shotDamage += 1;
          this.physics.resume();
          this.battleActive = true;
          this.emitHud();
        };

        fire() {
          this.firePlayerBullet(this.player.x, this.player.y - 48, 0, -920);
          if (this.spreadLevel >= 1) {
            this.firePlayerBullet(this.player.x - 25, this.player.y - 38, -180, -860);
            this.firePlayerBullet(this.player.x + 25, this.player.y - 38, 180, -860);
          }
          if (this.spreadLevel >= 2) {
            this.firePlayerBullet(this.player.x - 42, this.player.y - 24, -320, -790);
            this.firePlayerBullet(this.player.x + 42, this.player.y - 24, 320, -790);
          }
        }

        firePlayerBullet(x: number, y: number, vx: number, vy: number) {
          const bullet = this.bullets.get(x, y, 'pulse') as PhaserType.Physics.Arcade.Image | null;
          if (bullet) bullet.enableBody(true, x, y, true, true).setVelocity(vx, vy).setDepth(4).setData('damage', this.shotDamage);
        }

        spawnEnemy() {
          const x = Phaser.Math.Between(55, 665);
          const enemy = this.enemies.get(x, -70, 'enemy') as PhaserType.Physics.Arcade.Image | null;
          if (enemy) enemy.enableBody(true, x, -70, true, true).setVelocity(Phaser.Math.Between(-35, 35), Phaser.Math.Between(145, 230)).setDepth(3).setData('hp', 2);
        }

        spawnBoss() {
          this.bossActive = true;
          this.bossPhase = 1;
          this.enemies.clear(true, true);
          this.enemyBullets.clear(true, true);
          this.boss = this.physics.add.image(360, -150, 'boss').setDepth(3).setImmovable(true);
          this.boss.body.setSize(250, 120).setOffset(35, 42);
          this.physics.add.overlap(this.bullets, this.boss, this.hitBoss, undefined, this);
          this.tweens.add({ targets: this.boss, y: 170, duration: 1400, ease: 'Sine.out' });
          this.cameras.main.flash(300, 80, 20, 70, false);
          window.dispatchEvent(new CustomEvent('nailong:boss', { detail: true }));
          this.emitHud();
        }

        hitBoss(bulletObject: PhaserType.Types.Physics.Arcade.GameObjectWithBody) {
          const bullet = bulletObject as PhaserType.Physics.Arcade.Image;
          bullet.disableBody(true, true);
          this.bossHp = Math.max(0, this.bossHp - Number(bullet.getData('damage') || 1));
          const nextPhase = this.bossHp > 120 ? 1 : this.bossHp > 60 ? 2 : 3;
          if (nextPhase !== this.bossPhase) {
            this.bossPhase = nextPhase;
            this.enemyBullets.clear(true, true);
            this.cameras.main.flash(220, 255, 80, 120, false);
          }
          if (this.bossHp <= 0 && this.boss) {
            this.battleActive = false;
            this.enemyBullets.clear(true, true);
            this.tweens.add({ targets: this.boss, scale: 1.7, alpha: 0, angle: 12, duration: 800, onComplete: () => this.boss?.destroy() });
            this.cameras.main.shake(500, .025);
            window.dispatchEvent(new CustomEvent('nailong:end', { detail: 'victory' }));
          }
          this.emitHud();
        }

        bossAttack(time: number) {
          if (!this.boss?.active || this.boss.y < 120 || time < this.nextBossAttack) return;
          if (this.bossPhase === 1) {
            for (let i = -2; i <= 2; i++) this.fireEnemyBullet(this.boss.x + i * 28, this.boss.y + 75, i * 70, 300);
            this.nextBossAttack = time + 900;
          } else if (this.bossPhase === 2) {
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12 + time / 1200;
              this.fireEnemyBullet(this.boss.x, this.boss.y + 30, Math.cos(angle) * 250, Math.sin(angle) * 250);
            }
            this.nextBossAttack = time + 760;
          } else {
            const angleToPlayer = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
            for (let i = -3; i <= 3; i++) {
              const angle = angleToPlayer + i * .14;
              this.fireEnemyBullet(this.boss.x, this.boss.y + 70, Math.cos(angle) * 360, Math.sin(angle) * 360);
            }
            this.nextBossAttack = time + 520;
          }
        }

        fireEnemyBullet(x: number, y: number, vx: number, vy: number) {
          const bullet = this.enemyBullets.get(x, y, 'enemyPulse') as PhaserType.Physics.Arcade.Image | null;
          if (bullet) bullet.enableBody(true, x, y, true, true).setVelocity(vx, vy).setDepth(6);
        }

        hitEnemy(bulletObject: PhaserType.Types.Physics.Arcade.GameObjectWithBody, enemyObject: PhaserType.Types.Physics.Arcade.GameObjectWithBody) {
          const bullet = bulletObject as PhaserType.Physics.Arcade.Image;
          const enemy = enemyObject as PhaserType.Physics.Arcade.Image;
          bullet.disableBody(true, true);
          const hp = Number(enemy.getData('hp')) - Number(bullet.getData('damage') || 1);
          enemy.setData('hp', hp).setTintFill(0xffffff);
          this.time.delayedCall(45, () => enemy.active && enemy.clearTint());
          if (hp <= 0) {
            this.tweens.add({ targets: enemy, scale: 1.8, alpha: 0, duration: 130, onComplete: () => { enemy.disableBody(true, true); enemy.setScale(1).setAlpha(1); } });
            this.score += 120; this.overload = Math.min(100, this.overload + 7); this.xp += 1;
            if (this.xp >= this.xpMax && !this.bossActive) {
              this.level += 1; this.xp = 0; this.xpMax = Math.min(14, this.xpMax + 2); this.battleActive = false; this.physics.pause();
              window.dispatchEvent(new CustomEvent('nailong:upgrade', { detail: upgradeChoices }));
            }
            this.emitHud();
          }
        }

        hitPlayer(_playerObject: PhaserType.Types.Physics.Arcade.GameObjectWithBody, enemyObject: PhaserType.Types.Physics.Arcade.GameObjectWithBody) {
          const enemy = enemyObject as PhaserType.Physics.Arcade.Image;
          enemy.disableBody(true, true);
          if (this.shield > 0) this.shield = Math.max(0, this.shield - 10); else this.hp = Math.max(0, this.hp - 15);
          this.cameras.main.shake(110, .008); this.player.setTintFill(0xffffff); this.time.delayedCall(80, () => this.player.clearTint());
          if (this.hp <= 0) { this.battleActive = false; this.player.setVisible(false); window.dispatchEvent(new CustomEvent('nailong:end', { detail: 'defeat' })); }
          this.emitHud();
        }

        emitHud() {
          window.dispatchEvent(new CustomEvent('nailong:hud', { detail: { score: this.score, hp: this.hp, shield: this.shield, overload: this.overload, progress: this.bossActive ? 100 : Math.min(100, ((this.time.now - this.startedAt) / 60000) * 100), level: this.level, xp: this.xp, xpMax: this.xpMax, bossHp: Math.round((this.bossHp / this.bossMaxHp) * 100), bossActive: this.bossActive } }));
        }

        update(time: number, delta: number) {
          for (const star of this.stars) { star.y += star.getData('speed') * delta / 1000; if (star.y > 1285) { star.y = -5; star.x = Math.random() * 720; } }
          if (!this.battleActive) return;
          if (!this.dragging) {
            const speed = 430 * (this.keys.SHIFT.isDown ? .55 : 1);
            const left = this.cursors.left.isDown || this.keys.A.isDown;
            const right = this.cursors.right.isDown || this.keys.D.isDown;
            const up = this.cursors.up.isDown || this.keys.W.isDown;
            const down = this.cursors.down.isDown || this.keys.S.isDown;
            this.player.setVelocity((Number(right) - Number(left)) * speed, (Number(down) - Number(up)) * speed);
          } else this.player.setVelocity(0);
          if (time > this.lastShot + this.fireDelay) { this.fire(); this.lastShot = time; }
          if (!this.bossActive && time > this.nextEnemy) { this.spawnEnemy(); this.nextEnemy = time + Math.max(330, 760 - (time - this.startedAt) / 100); }
          if (!this.bossActive && time - this.startedAt >= 60000) this.spawnBoss();
          if (this.bossActive && this.boss?.active && this.boss.y >= 120) {
            this.boss.x = 360 + Math.sin(time / (this.bossPhase === 3 ? 430 : 700)) * (this.bossPhase === 1 ? 150 : 220);
            this.bossAttack(time);
          }
          for (const bullet of this.bullets.getChildren() as PhaserType.Physics.Arcade.Image[]) if (bullet.active && bullet.y < -50) bullet.disableBody(true, true);
          for (const bullet of this.enemyBullets.getChildren() as PhaserType.Physics.Arcade.Image[]) if (bullet.active && (bullet.y > 1340 || bullet.y < -60 || bullet.x < -60 || bullet.x > 780)) bullet.disableBody(true, true);
          for (const enemy of this.enemies.getChildren() as PhaserType.Physics.Arcade.Image[]) if (enemy.active && enemy.y > 1350) { enemy.disableBody(true, true); this.hp = Math.max(0, this.hp - 5); }
          if (Math.floor(time / 120) !== Math.floor((time - delta) / 120)) this.emitHud();
        }
      }

      gameRef.current = new Phaser.Game({ type: Phaser.AUTO, parent: 'game-root', width: 720, height: 1280, transparent: true, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [BattleScene], input: { activePointers: 3 } });
    }

    boot();
    const onHud = (event: Event) => setHud((event as CustomEvent<Hud>).detail);
    const onUpgrade = () => setMode('upgrade');
    const onEnd = (event: Event) => setMode((event as CustomEvent<'victory' | 'defeat'>).detail);
    window.addEventListener('nailong:hud', onHud);
    window.addEventListener('nailong:upgrade', onUpgrade);
    window.addEventListener('nailong:end', onEnd);
    return () => {
      disposed = true;
      window.removeEventListener('nailong:hud', onHud);
      window.removeEventListener('nailong:upgrade', onUpgrade);
      window.removeEventListener('nailong:end', onEnd);
      gameRef.current?.destroy(true); gameRef.current = null;
    };
  }, []);

  const begin = () => {
    setMode('intro');
    window.setTimeout(() => setMode(current => { if (current === 'intro') { window.dispatchEvent(new Event('nailong:start')); return 'playing'; } return current; }), 5200);
  };
  const skipIntro = () => { setMode('playing'); window.dispatchEvent(new Event('nailong:start')); };
  const chooseUpgrade = (id: UpgradeChoice['id']) => { setMode('playing'); window.dispatchEvent(new CustomEvent('nailong:upgrade-selected', { detail: id })); };
  const restart = () => { setMode('playing'); window.dispatchEvent(new Event('nailong:start')); };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /><span className="brand-name">奶龙打飞机</span><span className="brand-code">N-DRAGON / 01</span></div>
        <div className="status-row"><span>深空链路稳定</span><span className="online">ONLINE</span><button className="icon-button" type="button" aria-label={soundOn ? '关闭声音' : '开启声音'} onClick={() => setSoundOn(!soundOn)}>{soundOn ? '◖)' : '×'}</button></div>
      </header>
      <section className="battle-layout" aria-label="奶龙太空作战终端">
        <aside className="side-panel">
          <span className="panel-label">作战遥测 / Telemetry</span>
          <div className="metric-card"><div className="metric-head"><span>同步得分</span><span>SCORE</span></div><div className="metric-value">{String(hud.score).padStart(6, '0')}</div></div>
          <Meter label="生命完整度" value={hud.hp} suffix={`${hud.hp}%`} danger />
          <Meter label="能量护盾" value={hud.shield * 4} suffix={`${hud.shield}/25`} />
          <Meter label="奶龙超频" value={hud.overload} suffix={`${hud.overload}%`} />
          <Meter label={`成长等级 LV.${hud.level}`} value={(hud.xp / hud.xpMax) * 100} suffix={`${hud.xp}/${hud.xpMax}`} />
          <div><span className="panel-label">当前任务</span><p className="mission-copy">突破第七码头的机械蜂群，寻找并摧毁藏在深空裂隙中的母舰核心。</p></div>
          <div className="control-list"><span><b className="key">WASD</b>移动奶龙</span><span><b className="key">SHIFT</b>精准飞行</span><span><b className="key">拖动</b>手机与鼠标</span></div>
        </aside>
        <div className="game-column">
          <div id="game-root" aria-label="游戏画面" /><div className="scanline" aria-hidden="true" />
          {hud.bossActive && mode !== 'victory' && <div className="boss-hud"><div><span>天穹吞噬者 Ω</span><b>{hud.bossHp}%</b></div><div className="boss-bar"><span style={{ width: `${hud.bossHp}%` }} /></div></div>}
          {mode === 'menu' && <div className="menu-overlay"><p className="eyebrow">Deep Space Awakening</p><h1 className="game-title">奶龙<span>打飞机</span></h1><p className="tagline">我只是长得有点抽象，又不是不会飞。穿过霓虹星海，把挡路的机械敌人全部轰成宇宙烟花。</p><button className="primary-button" type="button" onClick={begin}>启动作战</button><span className="mini-note">AUTO FIRE 已启用 · 移动即战斗</span></div>}
          {mode === 'intro' && <div className="intro-overlay"><button className="skip" type="button" onClick={skipIntro}>跳过通讯 ›</button><div className="comms"><span className="comms-name">未知通讯 / PRIORITY Ω</span><p>奶龙，你的宇宙飞行能力已经觉醒。第七码头正在失守——穿过敌阵，找到它们的母舰，然后拯救这个世界。</p></div></div>}
          {mode === 'upgrade' && <div className="upgrade-overlay"><div className="upgrade-heading"><span>LEVEL UP</span><h2>选择奶龙强化</h2><p>战斗已暂停，选择一项继续前进。</p></div><div className="upgrade-grid">{upgradeChoices.map(choice => <button key={choice.id} type="button" className="upgrade-card" onClick={() => chooseUpgrade(choice.id)}><span className="upgrade-icon">{choice.icon}</span><strong>{choice.name}</strong><small>{choice.desc}</small></button>)}</div></div>}
          {(mode === 'victory' || mode === 'defeat') && <div className="result-overlay"><p className="eyebrow">{mode === 'victory' ? 'MISSION COMPLETE' : 'SIGNAL LOST'}</p><h2>{mode === 'victory' ? '世界暂时得救了' : '奶龙被打懵了'}</h2><p>{mode === 'victory' ? '天穹吞噬者已经解体，但裂隙深处还有新的信号。' : '没关系，重新校准翅膀，再飞一次。'}</p><div className="result-score">{String(hud.score).padStart(6, '0')}<span>本局得分</span></div><button className="primary-button" type="button" onClick={restart}>再次出击</button></div>}
        </div>
        <aside className="side-panel">
          <span className="panel-label">武器协议 / Build</span>
          <div className="build-list"><Build icon="↟" name="奶油脉冲炮" desc="高速自动射击" level="LV.1" /><Build icon="⌁" name="等离子扇流" desc="升级后解锁" level="LOCK" locked /><Build icon="◉" name="引力环刃" desc="升级后解锁" level="LOCK" locked /></div>
          <Meter label="航线推进" value={hud.progress} suffix={`${Math.floor(hud.progress)}%`} />
          <div className="danger-box"><strong>THREAT DETECTED</strong><p>天穹吞噬者 Ω 正在裂隙深处充能。预计接触：60 秒。</p></div>
        </aside>
      </section>
    </main>
  );
}

function Meter({ label, value, suffix, danger = false }: { label: string; value: number; suffix: string; danger?: boolean }) {
  return <div className="metric-card"><div className="metric-head"><span>{label}</span><span>{suffix}</span></div><div className={`bar${danger ? ' danger' : ''}`} style={{ '--value': `${Math.max(0, Math.min(100, value))}%` } as React.CSSProperties}><span /></div></div>;
}

function Build({ icon, name, desc, level, locked = false }: { icon: string; name: string; desc: string; level: string; locked?: boolean }) {
  return <div className={`build-item${locked ? ' locked' : ''}`}><span className="build-icon">{icon}</span><div><div className="build-name">{name}</div><div className="build-desc">{desc}</div></div><span className="build-level">{level}</span></div>;
}
