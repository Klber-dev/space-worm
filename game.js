(() => {
'use strict';
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ===== Bitman: integração segura com iframe hospedeiro ===== */
const embedded = window.parent !== window;
let finished = false, matchStart = 0;
const canRestart = () => !(finished && embedded);
function sendToBitman(msg){ try { window.parent.postMessage(Object.assign({ source: 'bitman', version: 1 }, msg), '*'); } catch(e) {} }
function finishGame(points){
    if(finished) return; finished = true;
    const final = Math.max(0, Math.floor(Number(points) || 0));
    setTimeout(() => sendToBitman({ type: 'game-over', score: final }), Math.max(0, 5200 - (performance.now() - matchStart)));
    if(embedded) $('#restartBtn').disabled = true;
}
sendToBitman({ type: 'ready' });
setTimeout(() => { if(state === 'running' || state === 'paused') die(); }, 7190000);

/* ===== Pixel art & utilitários de cor ===== */
const N = 18, T = 10, LW = N * T;
const P = { eye: '#f4f4f4', pupil: '#12142a', tongue: '#ff6b8b', ink: '#0b0d1c', gold: '#ffcd75', white: '#f4f4f4', cyan: '#8ce8ff', orange: '#ff9f43' };
const css = c => 'rgb(' + c.map(Math.round).join(',') + ')';
const toRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixC = (a, b, t) => a.map((v, j) => v + (b[j] - v) * t);

// Sprites planetários redesenhados: massas contínuas, contornos limpos e sem pixels soltos.
const PLANETS = {
    mercury: {
        rows: ['...oooo...', '..oggggo..', '.oggggggo.', 'ogggcggggo', 'ogggccgggo', 'oggggggggo', 'oggggggggo', '.oggggggo.', '..oggggo..', '...oooo...'],
        pal: { o: '#384654', g: '#9aa7b1', c: '#687783', h: '#e1e7eb' },
        deb: ['#9aa7b1', '#687783', '#e1e7eb', '#384654'], glint: '#f1f5f8', halo: 'rgba(170,184,198,.14)', spk: [{x:3,y:2},{x:6,y:5}]
    },
    venus: {
        rows: ['...oooo...', '..oyyyyo..', '.oyyyyyyo.', 'oyyyaaaayo', 'oyyyywwyyo', 'oyyaaaayyo', 'oyyyyyyyyo', '.oyyyyyyo.', '..oyyyyo..', '...oooo...'],
        pal: { o: '#80502e', y: '#d89b45', a: '#f2c36e', w: '#ffe8b3' },
        deb: ['#d89b45', '#f2c36e', '#ffe8b3', '#80502e'], glint: '#fff1cf', halo: 'rgba(245,194,112,.15)', spk: [{x:3,y:2},{x:6,y:4}]
    },
    earth: {
        rows: ['...oooo...', '..obbbbo..', '.obbbggbbo', 'obbbgggbbo', 'obbbbggbbo', 'obbbbggbbo', 'obbbgggbbo', '.obbbggbo.', '..obbbbo..', '...oooo...'],
        pal: { o: '#173d70', b: '#2876c8', g: '#39a85e', h: '#c4eaff' },
        deb: ['#2876c8', '#39a85e', '#173d70', '#c4eaff'], glint: '#d8f0ff', halo: 'rgba(110,185,255,.15)', spk: [{x:3,y:2},{x:4,y:3}]
    },
    mars: {
        rows: ['...oooo...', '..orrrro..', '.orrrrrro.', 'orrrrddrro', 'orrrrddrro', 'orrrrrrrro', 'orrrraarro', '.orrrrrro.', '..orrrro..', '...oooo...'],
        pal: { o: '#54283a', r: '#bc514a', a: '#f08a61', d: '#7e3038' },
        deb: ['#bc514a', '#f08a61', '#7e3038', '#54283a'], glint: '#ffd8be', halo: 'rgba(239,125,87,.14)', spk: [{x:3,y:2},{x:2,y:4}]
    },
    jupiter: {
        rows: ['...oooo...', '..oaaaao..', '.oaaaaaao.', 'oaabbbbaao', 'oabbbbaaao', 'oaaaabbbao', 'oabbbddbao', '.oaaaaaao.', '..oaaaao..', '...oooo...'],
        pal: { o: '#70432f', a: '#e6b77f', b: '#c98e68', c: '#f3d7ae', d: '#a9434d' },
        deb: ['#e6b77f', '#c98e68', '#f3d7ae', '#70432f'], glint: '#fff4d8', halo: 'rgba(232,184,120,.15)', spk: [{x:3,y:2},{x:6,y:3}]
    },
    saturn: {
        rows: ['...oooo...', '..oyyyyo..', '.oyyyyyyo.', 'oyyyhhyyyo', 'oyyyyyyyyo', 'oyyyyyyyyo', 'oyyyhhyyyo', '.oyyyyyyo.', '..oyyyyo..', '...oooo...'],
        pal: { o: '#765038', y: '#dfb36e', h: '#ffebbd' },
        deb: ['#dfb36e', '#b88a55', '#ffebbd', '#765038'], glint: '#fff7d6', halo: 'rgba(232,184,120,.14)', spk: [{x:3,y:3},{x:8,y:5}]
    },
    uranus: {
        rows: ['...oooo...', '..occcco..', '.occcccco.', 'occcaaacco', 'occcaaacco', 'occcccccco', 'occcccccco', '.occcccco.', '..occcco..', '...oooo...'],
        pal: { o: '#225d70', c: '#55bfce', a: '#b9eee8' },
        deb: ['#55bfce', '#b9eee8', '#225d70', '#8ce8ff'], glint: '#e2ffff', halo: 'rgba(112,229,226,.15)', spk: [{x:3,y:2},{x:6,y:4}]
    },
    neptune: {
        rows: ['...oooo...', '..obbbbo..', '.obbbbbbo.', 'obbbccccbo', 'obbbccccbo', 'obbbbbbbbo', 'obbbddbbbo', '.obbbbbbo.', '..obbbbo..', '...oooo...'],
        pal: { o: '#102c62', b: '#2365bd', c: '#4d9ddc', d: '#153d83', w: '#b1e4ff' },
        deb: ['#2365bd', '#4d9ddc', '#153d83', '#b1e4ff'], glint: '#d5f0ff', halo: 'rgba(72,142,235,.16)', spk: [{x:3,y:2},{x:6,y:5}]
    },
    // Sol: disco compacto de 12x12, redondo e com camadas térmicas contínuas.
    star: {
        rows: [
            '.....oo.....',
            '...oorroo...',
            '..orrrrrro..',
            '.orryyyyrro.',
            '.oryaaaayro.',
            'orryawwayrro',
            'orryawwayrro',
            '.oryaaaayro.',
            '.orryyyyrro.',
            '..orrrrrro..',
            '...oorroo...',
            '.....oo.....'
        ],
        pal: { o: '#a94725', r: '#e66b2e', y: '#ffad38', a: '#ffd05d', w: '#fff0b0' },
        deb: ['#ffbd4a', '#fff2b4', '#ef7d57', '#f4f4f4'], glint: '#ffffff', halo: 'rgba(255,174,55,.22)', spk: [{x:4,y:3},{x:7,y:7}]
    }
};
const KINDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// Sprite 7x7 da nave devorável da arena (orientada para a direita; espelhada/rotacionada conforme direção)
const ARENA_SHIP_RIGHT = [
    '..oo...',
    '.oaaao.',
    '..oaaao',
    '.osscwo',
    '..oaaao',
    '.oaaao.',
    '..oo...'
];
const ARENA_SHIP_PAL = {
    o: '#0b0d1c',
    a: '#cfd9e6',
    s: '#94b0c2',
    c: '#ff6b4a',
    w: '#ffcd75'
};

// Iluminação direcional em pixel art (luz topo-esquerda + terminador de sombra + brilho especular)
function buildLitPlanet(key, def){
    const grid = [];
    for(let j = 0; j < def.rows.length; j++){
        const row = [];
        for(let i = 0; i < def.rows[j].length; i++){
            const ch = def.rows[j][i];
            if(ch === '.'){ row.push(null); continue; }
            const base = toRGB(def.pal[ch]);
            if(key === 'star'){
                row.push(css(base));
                continue;
            }
            const dx = i - 4.5, dy = j - 4.5;
            const light = (-dx * 0.65 - dy * 0.75) / 5.2;
            if(ch === 'o'){
                const c = light > 0.2 ? mixC(base, [255, 255, 255], 0.22) : (light < -0.25 ? mixC(base, [10, 12, 24], 0.35) : base);
                row.push(css(c));
            } else if(ch === 'p'){
                const ringC = i >= 7 ? mixC(base, [14, 16, 32], 0.45) : (i <= 2 ? mixC(base, [255, 255, 255], 0.26) : base);
                row.push(css(ringC));
            } else {
                let c = base;
                if(light > 0.48) c = mixC(c, [255, 255, 255], 0.34);
                else if(light > 0.16) c = mixC(c, [255, 255, 255], 0.14);
                else if(light < -0.45) c = mixC(c, [12, 14, 28], 0.44);
                else if(light < -0.15) c = mixC(c, [12, 14, 28], 0.22);
                row.push(css(c));
            }
        }
        grid.push(row);
    }
    def.lit = grid;
}
Object.entries(PLANETS).forEach(([k, v]) => buildLitPlanet(k, v));

const DIG = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
    '8': '111101111101111', '9': '111101111001111', '+': '000010111010000'
};

const board = $('#board'), ctx = board.getContext('2d'), wrap = $('#boardWrap');
const spaceCanvas = $('#spaceBg'), spaceCtx = spaceCanvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
spaceCtx.imageSmoothingEnabled = false;

const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
function spriteLit(grid, x, y){
    for(let j = 0; j < grid.length; j++){
        for(let i = 0; i < grid[j].length; i++){
            const c = grid[j][i];
            if(c) rect(x + i, y + j, 1, 1, c);
        }
    }
}
function spriteLitScaled(grid, x, y, size){
    const h = grid.length, w = Math.max(...grid.map(r => r.length));
    for(let j = 0; j < size; j++) for(let i = 0; i < size; i++) {
        const c = grid[Math.min(h - 1, Math.floor(j * h / size))]?.[Math.min(w - 1, Math.floor(i * w / size))];
        if(c) rect(x + i, y + j, 1, 1, c);
    }
}
function text(str, x, y, c){
    let cx = x;
    for(const ch of str){
        const g = DIG[ch]; if(!g) continue;
        for(let i = 0; i < 15; i++) if(g[i] === '1') rect(cx + (i % 3) + 1, y + Math.floor(i / 3) + 1, 1, 1, P.pupil);
        for(let i = 0; i < 15; i++) if(g[i] === '1') rect(cx + (i % 3), y + Math.floor(i / 3), 1, 1, c);
        cx += 4;
    }
}

/* ===== Fundo espacial sutil e discreto em pixel art ===== */
const bg = document.createElement('canvas'); bg.width = LW; bg.height = LW; const bx = bg.getContext('2d');
const outerBase = document.createElement('canvas'); const ox = outerBase.getContext('2d');
const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const bayer4 = (x, y) => BAYER[y & 3][x & 3] / 16;

const NEB_PALS = [
    { outer: 'rgba(28, 25, 62, 0.22)', mid: 'rgba(42, 34, 88, 0.26)', core: 'rgba(60, 48, 118, 0.28)' },
    { outer: 'rgba(20, 34, 58, 0.22)', mid: 'rgba(28, 50, 82, 0.26)', core: 'rgba(40, 72, 112, 0.28)' },
    { outer: 'rgba(38, 22, 52, 0.20)', mid: 'rgba(56, 30, 74, 0.24)', core: 'rgba(78, 42, 100, 0.26)' }
];
const GAL_PALS = [
    { core: 'rgba(190, 180, 232, 0.43)', mid: 'rgba(105, 94, 166, 0.27)', arm: 'rgba(54, 49, 106, 0.20)', glint: 'rgba(205, 198, 239, 0.48)' },
    { core: 'rgba(174, 205, 226, 0.41)', mid: 'rgba(86, 128, 166, 0.26)', arm: 'rgba(43, 72, 108, 0.19)', glint: 'rgba(195, 220, 238, 0.46)' }
];

let sessionNebulae = [], sessionGalaxies = [];
let outerStars = [], outerW = 0, outerH = 0, outerScale = 2, scale = 2;
let outerPadX = 0, outerPadY = 0, outerParallaxX = 0, outerParallaxY = 0;
let arenaParallaxX = 0, arenaParallaxY = 0;

function generateSessionScenery(){
    const count = Math.random() < 0.55 ? 2 : 3;
    sessionNebulae = [];
    for(let i = 0; i < count; i++){
        sessionNebulae.push({
            nx: rnd(0.08, 0.92),
            ny: rnd(0.08, 0.92),
            lenX: rnd(56, 88),
            lenY: rnd(15, 25),
            ang: rnd(0, Math.PI),
            curve: rnd(-11, 11),
            skew: rnd(-0.48, 0.48),
            seed: rnd(0, 100),
            pal: NEB_PALS[i % NEB_PALS.length]
        });
    }

    const galCount = Math.random() < 0.72 ? 2 : 3;
    sessionGalaxies = [];
    for(let i = 0; i < galCount; i++){
        sessionGalaxies.push({
            nx: rnd(0.06, 0.94),
            ny: rnd(0.06, 0.94),
            r: rnd(14, 20),
            ang: rnd(0, Math.PI),
            tilt: rnd(0.42, 0.68),
            arms: 2,
            spin: Math.random() < 0.5 ? 1 : -1,
            seed: rnd(0, 50),
            pal: GAL_PALS[i % GAL_PALS.length]
        });
    }
}

// Nebulosa alongada, curvada e desgastada em filamentos (sem formato circular)
function paintNebula(targetCtx, w, h, clouds, scaleFactor){
    const invS = 1 / Math.max(0.45, scaleFactor);
    for(const nb of clouds){
        const maxR = (Math.hypot(nb.lenX, nb.lenY) + Math.abs(nb.curve) + 18) * scaleFactor;
        const x0 = Math.max(0, Math.floor(nb.x - maxR));
        const x1 = Math.min(w - 1, Math.ceil(nb.x + maxR));
        const y0 = Math.max(0, Math.floor(nb.y - maxR));
        const y1 = Math.min(h - 1, Math.ceil(nb.y + maxR));
        const ca = Math.cos(nb.ang), sa = Math.sin(nb.ang);

        for(let y = y0; y <= y1; y++){
            for(let x = x0; x <= x1; x++){
                const dx = x - nb.x, dy = y - nb.y;
                const rx0 = dx * ca + dy * sa;
                const ry0 = -dx * sa + dy * ca;

                const rx = rx0 + ry0 * nb.skew;
                const bend = (Math.sin(rx * 0.055 * invS + nb.seed) * 0.65 + Math.cos(rx * 0.028 * invS - nb.seed * 0.7) * 0.35) * nb.curve * scaleFactor;
                const ry = ry0 - bend;

                const sx = rx * invS, sy = ry * invS;
                const wx = sx + Math.sin(sy * 0.17 + nb.seed) * 11 + Math.cos(sx * 0.08 - nb.seed) * 9;
                const wy = sy + Math.cos(sx * 0.14 - nb.seed) * 8 + Math.sin(sy * 0.23 + nb.seed * 1.3) * 5;

                const nu = wx / nb.lenX;
                const taper = Math.max(0.28, 1 - Math.abs(nu) * 0.52);
                const nv = wy / (nb.lenY * taper);
                const dist = Math.hypot(nu * 0.85, nv * 0.85) * 0.62 + (Math.abs(nu) * 0.45 + Math.abs(nv) * 0.65) * 0.38;
                if(dist > 1.2) continue;

                const wisp = Math.sin(wx * 0.19 + wy * 0.15 + nb.seed) * 0.19
                           + Math.cos(wx * 0.34 - wy * 0.27 - nb.seed * 0.5) * 0.14
                           + Math.sin(wx * 0.58 + wy * 0.49) * 0.08;
                const dust = Math.abs(Math.sin(wy * 0.21 + Math.sin(wx * 0.07 + nb.seed) * 2.4));
                const dustCut = dust < 0.14 ? (0.14 - dust) * 1.35 : 0;

                const f = (1.05 - dist) + wisp - dustCut;
                if(f <= 0.10) continue;

                const thr = bayer4(x, y);
                if(f > 0.72 && thr < 0.58){
                    targetCtx.fillStyle = nb.pal.core;
                    targetCtx.fillRect(x, y, 1, 1);
                } else if(f > 0.42 && thr < 0.52){
                    targetCtx.fillStyle = nb.pal.mid;
                    targetCtx.fillRect(x, y, 1, 1);
                } else if(f > 0.14 && thr < (f - 0.10) * 1.75){
                    targetCtx.fillStyle = nb.pal.outer;
                    targetCtx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
}

function paintGalaxy(targetCtx, w, h, gal){
    const span = gal.r * 1.3;
    const x0 = Math.max(0, Math.floor(gal.x - span));
    const x1 = Math.min(w - 1, Math.ceil(gal.x + span));
    const y0 = Math.max(0, Math.floor(gal.y - span));
    const y1 = Math.min(h - 1, Math.ceil(gal.y + span));
    const ca = Math.cos(gal.ang), sa = Math.sin(gal.ang);

    for(let y = y0; y <= y1; y++){
        for(let x = x0; x <= x1; x++){
            const dx = x - gal.x, dy = y - gal.y;
            const rx = dx * ca + dy * sa;
            const ry = (-dx * sa + dy * ca) / gal.tilt;
            const r = Math.hypot(rx, ry);
            if(r > gal.r) continue;
            const nr = r / gal.r;
            const thr = bayer4(x, y);

            if(nr < 0.16 && thr < 0.75){
                targetCtx.fillStyle = gal.pal.core;
                targetCtx.fillRect(x, y, 1, 1);
                continue;
            }
            const theta = Math.atan2(ry, rx);
            const spiral = Math.cos(gal.arms * (theta - gal.spin * Math.log(1 + r * 0.36) * 2.1) + gal.seed);
            if(spiral > 0.35 && nr < 0.62 && thr < 0.58){
                targetCtx.fillStyle = gal.pal.mid;
                targetCtx.fillRect(x, y, 1, 1);
            } else if(spiral > 0.08 && thr < (1 - nr) * 0.60){
                targetCtx.fillStyle = gal.pal.arm;
                targetCtx.fillRect(x, y, 1, 1);
            }
        }
    }

    // Poucos pontos luminosos nas espirais, como regiões de estrelas mais densas.
    for(let i = 0; i < 3; i++){
        const a = gal.seed * 0.13 + i * (Math.PI * 2 / 3) + gal.ang;
        const rr = gal.r * (0.34 + (i % 2) * 0.22);
        const gx = Math.round(gal.x + Math.cos(a) * rr);
        const gy = Math.round(gal.y + Math.sin(a) * rr * gal.tilt);
        targetCtx.fillStyle = gal.pal.glint || gal.pal.core;
        targetCtx.fillRect(gx, gy, 1, 1);
        if(i === 1) targetCtx.fillRect(gx + 1, gy, 1, 1);
    }
}

function buildArenaBg(){
    const topC = toRGB('#121733'), botC = toRGB('#0c0f20');
    for(let y = 0; y < LW; y++){
        bx.fillStyle = css(mixC(topC, botC, y / (LW - 1)));
        bx.fillRect(0, y, LW, 1);
    }
    const br = board.getBoundingClientRect();
    const vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    if(br.width > 0 && br.height > 0){
        const arenaClouds = sessionNebulae.map(nb => ({
            ...nb,
            x: (nb.nx * vw - br.left) / scale,
            y: (nb.ny * vh - br.top) / scale
        }));
        paintNebula(bx, LW, LW, arenaClouds, 1);
    }
}

function rebuildOuterSpace(regenerateStars){
    outerScale = Math.max(2, scale || 2);
    const w = Math.max(120, Math.ceil(window.innerWidth / outerScale));
    const h = Math.max(120, Math.ceil(window.innerHeight / outerScale));
    outerW = w;
    outerH = h;
    spaceCanvas.width = w;
    spaceCanvas.height = h;
    // Área extra ao redor do enquadramento: permite deslocar nebulosas e galáxias
    // sem revelar bordas vazias durante a paralaxe.
    outerPadX = Math.max(28, Math.ceil(w * 0.22));
    outerPadY = Math.max(28, Math.ceil(h * 0.22));
    outerParallaxX = 0;
    outerParallaxY = 0;
    const baseW = w + outerPadX * 2;
    const baseH = h + outerPadY * 2;
    outerBase.width = baseW;
    outerBase.height = baseH;
    spaceCtx.imageSmoothingEnabled = false;
    outerBase.imageSmoothingEnabled = false;

    const topC = toRGB('#0d1024'), botC = toRGB('#080a16');
    for(let y = 0; y < baseH; y++){
        ox.fillStyle = css(mixC(topC, botC, y / Math.max(1, baseH - 1)));
        ox.fillRect(0, y, baseW, 1);
    }

    const factor = (scale || 2) / outerScale;
    const clouds = sessionNebulae.map(nb => ({
        ...nb,
        x: outerPadX + nb.nx * w,
        y: outerPadY + nb.ny * h
    }));
    paintNebula(ox, baseW, baseH, clouds, factor);
    for(const gal of sessionGalaxies){
        paintGalaxy(ox, baseW, baseH, {
            ...gal,
            x: outerPadX + gal.nx * w,
            y: outerPadY + gal.ny * h,
            r: gal.r * factor
        });
    }

    if(regenerateStars || !outerStars.length){
        // Três planos de profundidade: distantes quase estáticos, médios e próximos.
        // O deslocamento proporcional a z cria paralaxe conforme a cobra avança.
        const count = Math.min(260, Math.max(120, Math.floor((w * h) / 700)));
        outerStars = Array.from({ length: count }, (_, i) => {
            const layer = i < count * 0.42 ? 0 : (i < count * 0.82 ? 1 : 2);
            const depth = layer === 0 ? rnd(0.10, 0.28) : (layer === 1 ? rnd(0.42, 0.78) : rnd(1.05, 1.65));
            const palette = layer === 0
                ? ['#202b45', '#293653', '#344263']
                : (layer === 1
                    ? ['#405477', '#566c86', '#7188a8', '#869eb8']
                    : ['#8199b8', '#a8bdd3', '#cfd9e6', '#f4f4f4']);
            return {
                x: Math.random() * w,
                y: Math.random() * h,
                z: depth,
                size: layer === 2 && Math.random() < 0.24 ? 2 : 1,
                c: pick(palette),
                tw: layer !== 0 && Math.random() < (layer === 2 ? 0.42 : 0.30),
                cross: layer === 2 && Math.random() < 0.10,
                seed: Math.random() * 6.28
            };
        });
    }
}

const STARS = Array.from({ length: 58 }, () => ({
    x: Math.random() * LW,
    y: Math.random() * LW,
    z: rnd(0.45, 1.05),
    c: ['#475978', '#566c86', '#7d98b8', '#94b0c2', '#f4f4f4'][Math.floor(Math.random() * 5)],
    tw: Math.random() < 0.3,
    seed: Math.random() * 6.28
}));

// Navinhas bem discretas no plano de fundo profundo (opacidade ~0.15 para nunca parecerem devoráveis)
function drawBgShip(targetCtx, x, y, dirX, kind, seed, inArena = false){
    const k = inArena ? 0.65 : 1;
    const flicker = Math.floor(tNow * 18 + seed) % 2 === 0;
    if(kind === 0){
        targetCtx.fillStyle = 'rgba(110, 134, 168, ' + (0.15 * k).toFixed(2) + ')';
        targetCtx.fillRect(x, y, 5, 1);
        targetCtx.fillRect(x + (dirX > 0 ? 1 : 2), y - 1, 2, 3);
        targetCtx.fillStyle = 'rgba(136, 206, 238, ' + (0.19 * k).toFixed(2) + ')';
        targetCtx.fillRect(x + (dirX > 0 ? 3 : 1), y, 1, 1);
        targetCtx.fillStyle = flicker
            ? 'rgba(235, 190, 120, ' + (0.18 * k).toFixed(2) + ')'
            : 'rgba(118, 190, 228, ' + (0.12 * k).toFixed(2) + ')';
        targetCtx.fillRect(x + (dirX > 0 ? -1 : 5), y, 1, 1);
    } else {
        targetCtx.fillStyle = 'rgba(148, 128, 206, ' + (0.14 * k).toFixed(2) + ')';
        targetCtx.fillRect(x + 1, y - 2, 1, 5);
        targetCtx.fillStyle = 'rgba(182, 194, 220, ' + (0.18 * k).toFixed(2) + ')';
        targetCtx.fillRect(x, y, 3, 1);
        targetCtx.fillStyle = flicker
            ? 'rgba(128, 206, 238, ' + (0.18 * k).toFixed(2) + ')'
            : 'rgba(148, 128, 206, ' + (0.12 * k).toFixed(2) + ')';
        targetCtx.fillRect(x + (dirX > 0 ? -1 : 3), y, 1, 1);
    }
}

function spawnBgWorm(){
    if(!outerW || !outerH) return;
    const corner = Math.floor(Math.random() * 4);
    const horiz = Math.random() < 0.5;
    const len = 7;
    let x = 0, y = 0, vx = 0, vy = 0;
    const marginX = Math.min(26, outerW * 0.14);
    const marginY = Math.min(24, outerH * 0.14);

    if(corner === 0){
        if(horiz){ x = -16; y = marginY; vx = 9.5; vy = 2.8; }
        else     { x = marginX; y = -16; vx = 2.8; vy = 9.5; }
    } else if(corner === 1){
        if(horiz){ x = outerW + 16; y = marginY; vx = -9.5; vy = 2.8; }
        else     { x = outerW - marginX; y = -16; vx = -2.8; vy = 9.5; }
    } else if(corner === 2){
        if(horiz){ x = -16; y = outerH - marginY; vx = 9.5; vy = -2.8; }
        else     { x = marginX; y = outerH + 16; vx = 2.8; vy = -9.5; }
    } else {
        if(horiz){ x = outerW + 16; y = outerH - marginY; vx = -9.5; vy = -2.8; }
        else     { x = outerW - marginX; y = outerH + 16; vx = -2.8; vy = -9.5; }
    }
    bgWorm = { x, y, vx, vy, len, phase: rnd(0, Math.PI * 2), hue: Math.random() < 0.5 ? 0 : 1 };
}

function drawBgWorm(targetCtx, w){
    const sp = Math.hypot(w.vx, w.vy) || 1;
    const ux = w.vx / sp, uy = w.vy / sp;
    const px = -uy, py = ux;
    for(let i = w.len - 1; i >= 0; i--){
        const back = i * 2.2;
        const wave = Math.sin(tNow * 4.2 + w.phase - i * 0.85) * 1.4;
        const sx = Math.round(w.x - ux * back + px * wave);
        const sy = Math.round(w.y - uy * back + py * wave);
        const alpha = (1 - i / (w.len + 1)) * (w.hue === 0 ? 0.24 : 0.22);
        targetCtx.fillStyle = w.hue === 0
            ? 'rgba(196, 165, 255, ' + alpha.toFixed(2) + ')'
            : 'rgba(140, 232, 255, ' + alpha.toFixed(2) + ')';
        if(i === 0){
            targetCtx.fillRect(sx, sy, 2, 2);
            targetCtx.fillStyle = 'rgba(244, 244, 244, 0.36)';
            targetCtx.fillRect(sx + (ux > 0 ? 1 : 0), sy + (uy > 0 ? 1 : 0), 1, 1);
        } else if(i < w.len - 2){
            targetCtx.fillRect(sx, sy, 2, 2);
        } else {
            targetCtx.fillRect(sx, sy, 1, 1);
        }
    }
}

function spawnMeteorShower(){
    if(!outerW || !outerH) return;
    const count = Math.floor(rnd(2, 4));
    const fromRight = Math.random() < 0.65;
    const baseVx = (fromRight ? -1 : 1) * rnd(78, 115);
    const baseVy = rnd(48, 76);
    for(let i = 0; i < count; i++){
        meteors.push({
            x: fromRight ? rnd(outerW * 0.25, outerW * 1.1) : rnd(-outerW * 0.1, outerW * 0.75),
            y: rnd(-outerH * 0.15, outerH * 0.45),
            vx: baseVx * rnd(0.92, 1.08),
            vy: baseVy * rnd(0.92, 1.08),
            len: Math.floor(rnd(4, 6)),
            delay: i * rnd(0.18, 0.42),
            t: 0,
            life: rnd(1.0, 1.5),
            gold: Math.random() < 0.2
        });
    }
}

function drawMeteors(targetCtx, list, coordScale, offsetX = 0, offsetY = 0){
    for(const m of list){
        if(m.delay > 0) continue;
        const k = m.t / m.life;
        const fade = k < 0.2 ? k / 0.2 : (k > 0.75 ? (1 - k) / 0.25 : 1);
        if(fade <= 0.05) continue;
        const sp = Math.hypot(m.vx, m.vy) || 1;
        const ux = m.vx / sp, uy = m.vy / sp;
        const hx = m.x * coordScale - offsetX;
        const hy = m.y * coordScale - offsetY;
        for(let t = 0; t < m.len; t++){
            const a = fade * (1 - t / m.len) * (t === 0 ? 0.42 : 0.22);
            targetCtx.fillStyle = t === 0
                ? 'rgba(244, 244, 244, ' + a.toFixed(2) + ')'
                : (m.gold ? 'rgba(255, 205, 117, ' + a.toFixed(2) + ')' : 'rgba(140, 232, 255, ' + a.toFixed(2) + ')');
            targetCtx.fillRect(Math.round(hx - ux * t), Math.round(hy - uy * t), 1, 1);
        }
    }
}

function renderOuterSpace(dt, vx, vy){
    if(!outerW || !outerH) return;
    const s = dt / 1000;
    // Nebulosas e galáxias são o plano distante: deslizam mais devagar que as estrelas.
    outerParallaxX = Math.max(-outerPadX, Math.min(outerPadX, outerParallaxX - vx * 0.26 * s));
    outerParallaxY = Math.max(-outerPadY, Math.min(outerPadY, outerParallaxY - vy * 0.26 * s));
    spaceCtx.drawImage(
        outerBase,
        outerPadX + outerParallaxX, outerPadY + outerParallaxY, outerW, outerH,
        0, 0, outerW, outerH
    );
    for(const st of outerStars){
        st.x = ((st.x + vx * st.z * s) % outerW + outerW) % outerW;
        st.y = ((st.y + vy * st.z * s) % outerH + outerH) % outerH;
        if(st.tw && opt.fx && Math.sin(tNow * 1.9 + st.seed) < -0.35) continue;
        const px = Math.round(st.x), py = Math.round(st.y);
        spaceCtx.fillStyle = st.c;
        spaceCtx.fillRect(px, py, st.size || 1, st.size || 1);
        // As estrelas próximas deixam um rastro curto quando o cenário acelera.
        if(st.z > 1.25 && Math.hypot(vx, vy) > 7){
            spaceCtx.fillStyle = 'rgba(168, 189, 211, 0.28)';
            spaceCtx.fillRect(Math.round(px - Math.sign(vx) * 2), Math.round(py - Math.sign(vy) * 2), 1, 1);
        }
        if(st.cross && opt.fx && Math.sin(tNow * 2.4 + st.seed) > 0.45){
            spaceCtx.fillStyle = 'rgba(207, 217, 230, 0.30)';
            spaceCtx.fillRect(px - 1, py, 3, 1);
            spaceCtx.fillRect(px, py - 1, 1, 3);
        }
    }
    if(bgWorm && opt.fx) drawBgWorm(spaceCtx, bgWorm);
    if(opt.fx && meteors.length) drawMeteors(spaceCtx, meteors, 1);
    if(bgShip) drawBgShip(spaceCtx, Math.round(bgShip.x), Math.round(bgShip.y), bgShip.dirX, bgShip.kind, bgShip.seed, false);
}

const STOPS = ['#cdb2ff', '#a58df0', '#8574e0'].map(toRGB);
function gradAt(t){
    const k = t * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(k));
    return mixC(STOPS[i], STOPS[i + 1], k - i);
}

/* ===== Áudio espacial temático, Doppler, trilha sonora adaptativa e proximidade ===== */
let audioCtx = null, muted = false, bus = null, noiseBuf = null, sprintNodes = null;
const COSMIC = [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99, 880.00, 1046.50, 1174.66];
const cellPan = cx => Math.max(-0.85, Math.min(0.85, ((cx / (N - 1)) * 2 - 1) * 0.72));

function initAudio(){
    if(audioCtx){ if(audioCtx.state === 'suspended') audioCtx.resume(); return; }
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for(let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    } catch(e) {}
}
function getBus(){
    if(!bus || bus.ctx !== audioCtx){
        const inp = audioCtx.createGain();
        const comp = audioCtx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.14;

        const dlyL = audioCtx.createDelay(0.5), dlyR = audioCtx.createDelay(0.5);
        const fbL = audioCtx.createGain(), fbR = audioCtx.createGain(), wet = audioCtx.createGain();
        const lpL = audioCtx.createBiquadFilter(), lpR = audioCtx.createBiquadFilter();
        const merger = audioCtx.createChannelMerger(2);

        dlyL.delayTime.value = 0.16; dlyR.delayTime.value = 0.24;
        fbL.gain.value = 0.26; fbR.gain.value = 0.26; wet.gain.value = 0.17;
        lpL.type = 'lowpass'; lpL.frequency.value = 2600;
        lpR.type = 'lowpass'; lpR.frequency.value = 2200;

        inp.connect(comp);
        inp.connect(dlyL);
        dlyL.connect(lpL); lpL.connect(fbL); fbL.connect(dlyR);
        dlyR.connect(lpR); lpR.connect(fbR); fbR.connect(dlyL);
        lpL.connect(merger, 0, 0);
        lpR.connect(merger, 0, 1);
        merger.connect(wet);
        wet.connect(comp);
        comp.connect(audioCtx.destination);
        bus = { ctx: audioCtx, inp };
    }
    return bus.inp;
}
function routeOut(node, panVal){
    if(audioCtx.createStereoPanner && typeof panVal === 'number'){
        const p = audioCtx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, panVal));
        node.connect(p);
        p.connect(getBus());
    } else {
        node.connect(getBus());
    }
}
function synth(opts){
    if(!audioCtx || muted) return;
    try {
        const t0 = audioCtx.currentTime + (opts.delay || 0);
        const dur = opts.dur || 0.15;
        const o = audioCtx.createOscillator(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
        o.type = opts.type || 'triangle';
        o.frequency.setValueAtTime(opts.freq, t0);
        if(opts.freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(18, opts.freqEnd), t0 + (opts.sweep || dur));
        f.type = opts.filterType || 'lowpass';
        f.frequency.setValueAtTime(opts.cutoff || 3600, t0);
        if(opts.cutoffEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.cutoffEnd), t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(opts.vol || 0.12, t0 + (opts.att || 0.005));
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
        o.connect(f); f.connect(g); routeOut(g, opts.pan);
        o.start(t0); o.stop(t0 + dur + 0.02);
    } catch(e) {}
}
function noise(opts){
    if(!audioCtx || muted || !noiseBuf) return;
    try {
        const t0 = audioCtx.currentTime + (opts.delay || 0);
        const dur = opts.dur || 0.14;
        const src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
        src.buffer = noiseBuf;
        f.type = opts.filterType || 'bandpass';
        f.Q.value = opts.q || 1.4;
        f.frequency.setValueAtTime(opts.freq || 1200, t0);
        if(opts.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(60, opts.freqEnd), t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(opts.vol || 0.09, t0 + (opts.att || 0.006));
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
        src.connect(f); f.connect(g); routeOut(g, opts.pan);
        src.start(t0); src.stop(t0 + dur + 0.02);
    } catch(e) {}
}

function sndTurn(){
    const pan = snake[0] ? cellPan(snake[0].x) : 0;
    synth({ type: 'sine', freq: 370, freqEnd: 554, dur: 0.042, vol: 0.045, cutoff: 2600, pan });
}
function sndThermalDrift(pan){
    noise({ filterType: 'bandpass', freq: 2400, freqEnd: 1150, q: 3.0, dur: 0.065, att: 0.003, vol: 0.048, pan });
    synth({ type: 'triangle', freq: 620, freqEnd: 310, dur: 0.055, vol: 0.032, cutoff: 2800, pan });
}
function sndSpawn(gold, cx){
    const pan = cellPan(cx);
    if(gold){
        synth({ type: 'sine', freq: 1046.5, dur: 0.24, att: 0.015, vol: 0.045, cutoff: 4200, pan });
        synth({ type: 'sine', freq: 1567.98, dur: 0.28, att: 0.02, vol: 0.038, cutoff: 4800, delay: 0.055, pan: -pan * 0.6 });
    } else {
        synth({ type: 'sine', freq: 165, freqEnd: 330, dur: 0.16, att: 0.02, vol: 0.042, cutoff: 1400, pan });
    }
}
function sndShipWarn(cx){
    const pan = cellPan(cx);
    synth({ type: 'sine', freq: 880, dur: 0.06, vol: 0.035, cutoff: 3200, pan });
    synth({ type: 'sine', freq: 1174.66, dur: 0.08, vol: 0.032, cutoff: 3600, delay: 0.09, pan });
}
function sndEatShip(cx){
    const pan = cellPan(cx);
    synth({ type: 'sine', freq: 145, freqEnd: 38, dur: 0.18, vol: 0.22, cutoff: 480, pan });
    noise({ filterType: 'bandpass', q: 2.2, freq: 1700, freqEnd: 420, dur: 0.15, vol: 0.12, pan });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => {
        synth({ type: 'triangle', freq: f, dur: 0.18, vol: 0.095, delay: 0.02 + k * 0.038, pan });
    });
}
function sndDashReady(){
    synth({ type: 'sine', freq: 739.99, dur: 0.14, att: 0.008, vol: 0.048, cutoff: 3400 });
    synth({ type: 'sine', freq: 1046.5, dur: 0.20, att: 0.01, vol: 0.044, cutoff: 3800, delay: 0.045 });
}
function startSprintAudio(){
    if(!audioCtx || muted || sprintNodes) return;
    try {
        const t0 = audioCtx.currentTime;
        const master = audioCtx.createGain();
        master.gain.setValueAtTime(0.0001, t0);
        master.gain.linearRampToValueAtTime(0.068, t0 + 0.045);

        const filt = audioCtx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.Q.value = 1.6;
        filt.frequency.setValueAtTime(340, t0);
        filt.frequency.exponentialRampToValueAtTime(1050, t0 + 0.26);

        const o1 = audioCtx.createOscillator(), o2 = audioCtx.createOscillator();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(196, t0);
        o1.frequency.exponentialRampToValueAtTime(329.63, t0 + 0.22);

        o2.type = 'triangle';
        o2.frequency.setValueAtTime(293.66, t0);
        o2.frequency.exponentialRampToValueAtTime(493.88, t0 + 0.22);

        const lfo = audioCtx.createOscillator(), lfoGain = audioCtx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 13;
        lfoGain.gain.value = 11;
        lfo.connect(lfoGain);
        lfoGain.connect(o1.frequency);

        o1.connect(filt); o2.connect(filt);
        filt.connect(master); master.connect(getBus());
        o1.start(t0); o2.start(t0); lfo.start(t0);
        sprintNodes = { master, o1, o2, lfo };
    } catch(e) {}
}
function stopSprintAudio(){
    if(!sprintNodes) return;
    const n = sprintNodes; sprintNodes = null;
    try {
        const t0 = audioCtx.currentTime;
        n.master.gain.cancelScheduledValues(t0);
        n.master.gain.setValueAtTime(Math.max(0.0001, n.master.gain.value), t0);
        n.master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
        n.o1.stop(t0 + 0.095); n.o2.stop(t0 + 0.095); n.lfo.stop(t0 + 0.095);
    } catch(e) {}
}
function sndWarp(fromX, toX){
    if(!audioCtx || muted) return;
    const panA = cellPan(fromX), panB = cellPan(toX);
    try {
        // Varredura Doppler grave 190Hz -> 65Hz com panorâmica contínua de A para B
        const t0 = audioCtx.currentTime;
        const o = audioCtx.createOscillator(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
        o.type = 'sine';
        o.frequency.setValueAtTime(190, t0);
        o.frequency.exponentialRampToValueAtTime(65, t0 + 0.28);
        f.type = 'lowpass';
        f.frequency.setValueAtTime(620, t0);
        f.frequency.exponentialRampToValueAtTime(180, t0 + 0.28);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.22, t0 + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.30);
        o.connect(f); f.connect(g);
        if(audioCtx.createStereoPanner){
            const p = audioCtx.createStereoPanner();
            p.pan.setValueAtTime(panA, t0);
            p.pan.linearRampToValueAtTime(panB, t0 + 0.26);
            g.connect(p); p.connect(getBus());
        } else {
            g.connect(getBus());
        }
        o.start(t0); o.stop(t0 + 0.32);
    } catch(e) {}
    noise({ filterType: 'bandpass', freq: 880, freqEnd: 290, q: 2.2, dur: 0.22, vol: 0.09, pan: panA });
    synth({ type: 'triangle', freq: 392, freqEnd: 784, dur: 0.20, vol: 0.075, cutoff: 2800, delay: 0.05, pan: panB });
}
function sndEat(combo, star, kind, cx){
    const i = Math.min(combo, COSMIC.length - 6);
    const pan = cellPan(cx);

    synth({ type: 'sine', freq: star ? 155 : 135, freqEnd: 24, sweep: 0.22, dur: 0.34, vol: star ? 0.27 : 0.31, cutoff: 340, pan });
    noise({ filterType: 'lowpass', q: 1.9, freq: 880, freqEnd: 95, dur: 0.36, vol: star ? 0.14 : 0.22, pan });
    noise({ filterType: 'bandpass', q: 1.3, freq: 440, freqEnd: 150, dur: 0.26, delay: 0.025, vol: 0.14, pan: -pan * 0.4 });
    [0.015, 0.055, 0.105].forEach((d, k) => {
        noise({ filterType: 'bandpass', q: 2.4, freq: 1150 - k * 240, freqEnd: 260, dur: 0.12, delay: d, vol: 0.095 - k * 0.02, pan });
    });

    if(!star){
        if(kind === 'saturn'){
            [1174.66, 1567.98].forEach((f, k) => synth({ type: 'sine', freq: f, dur: 0.22, vol: 0.055, delay: 0.04 + k * 0.045, pan: pan * 0.8 }));
        } else if(kind === 'earth'){
            noise({ filterType: 'bandpass', q: 2.2, freq: 1600, freqEnd: 620, dur: 0.24, delay: 0.03, vol: 0.075, pan });
        } else if(kind === 'jupiter'){
            synth({ type: 'sine', freq: 92, freqEnd: 20, sweep: 0.28, dur: 0.42, vol: 0.22, cutoff: 240, delay: 0.02, pan });
        } else if(kind === 'mars'){
            synth({ type: 'triangle', freq: 196, freqEnd: 74, dur: 0.22, vol: 0.11, cutoff: 950, delay: 0.02, pan });
        }
    }

    synth({ type: 'triangle', freq: COSMIC[i], dur: 0.22, vol: 0.12, delay: 0.02, pan });
    if(combo >= 2) synth({ type: 'sine', freq: COSMIC[i + 2], dur: 0.20, vol: 0.085, delay: 0.075, pan: -pan * 0.5 });
    if(star){
        [0, 2, 4, 7].forEach((o, k) => {
            const f = COSMIC[Math.min(i + o, COSMIC.length - 1)];
            synth({ type: 'triangle', freq: f, dur: 0.28, vol: 0.11, delay: 0.05 + k * 0.05, pan: k % 2 === 0 ? pan : -pan });
            synth({ type: 'sine', freq: f * 2, dur: 0.24, vol: 0.065, delay: 0.06 + k * 0.05 });
        });
    }
}
function sndStart(){
    [0, 3, 4, 7].forEach((idx, k) => {
        synth({ type: 'triangle', freq: COSMIC[idx], dur: 0.24, vol: 0.10, delay: k * 0.065, pan: (k - 1.5) * 0.25 });
        synth({ type: 'sine', freq: COSMIC[idx] * 2, dur: 0.19, vol: 0.045, delay: k * 0.065 });
    });
}
function sndDeath(){
    synth({ type: 'sine', freq: 148, freqEnd: 24, dur: 0.40, vol: 0.29, cutoff: 420 });
    noise({ filterType: 'lowpass', q: 1.8, freq: 1500, freqEnd: 130, dur: 0.46, vol: 0.17 });
    [7, 5, 3, 0].forEach((idx, k) => {
        synth({ type: 'sawtooth', freq: COSMIC[idx], freqEnd: COSMIC[idx] * 0.82, dur: 0.26, vol: 0.078, cutoff: 1500, cutoffEnd: 380, delay: k * 0.105 });
    });
}
function sndNearMiss(pan){
    synth({ type: 'sine', freq: 390, freqEnd: 690, sweep: 0.07, dur: 0.14, att: 0.015, vol: 0.042, cutoff: 1900, pan });
    noise({ filterType: 'bandpass', freq: 980, freqEnd: 2100, q: 2.6, dur: 0.13, att: 0.012, vol: 0.032, pan });
}

/* ===== Trilha sonora espacial discreta ===== */
let musicEnabled = true, musicAcc = 0, musicStep = 0;
function musicAccent(c, star){
    if(!audioCtx || muted || !musicEnabled) return;
    const base = Math.min(Math.min(c, 5), COSMIC.length - 5);
    const f1 = COSMIC[base];
    const f2 = COSMIC[Math.min(base + (star ? 4 : 2), COSMIC.length - 1)];
    synth({ type: 'sine', freq: f1 * 0.5, dur: 0.75, att: 0.12, vol: 0.026, cutoff: 950, pan: -0.25 });
    synth({ type: 'sine', freq: f2, dur: 0.65, att: 0.10, vol: 0.020, cutoff: 1400, delay: 0.06, pan: 0.25 });
}
function updateMusic(dt){
    if(!audioCtx || muted || !musicEnabled || state !== 'running') return;
    const interval = combo >= 3 ? 0.58 : (combo >= 1 ? 0.72 : 0.88);
    musicAcc += dt / 1000;
    if(musicAcc < interval) return;
    musicAcc -= interval;

    const pattern = [0, 4, 2, 6, 0, 4, 3, 5];
    const deg = pattern[musicStep % pattern.length];
    const note = COSMIC[Math.min(deg, COSMIC.length - 1)];

    if(musicStep % 2 === 0){
        synth({ type: 'sine', freq: note * 0.5, dur: 1.05, att: 0.22, vol: 0.022, cutoff: 760, pan: -0.18 });
    }
    synth({ type: 'sine', freq: note, dur: 0.78, att: 0.16, vol: 0.018, cutoff: 1200, pan: (musicStep % 2 === 0 ? 0.22 : -0.22) });

    if(combo >= 1 && (musicStep % 2 === 1 || combo >= 3)){
        const shimmerIdx = Math.min(deg + 4 + Math.min(combo, 4), COSMIC.length - 1);
        const shimmerFreq = COSMIC[shimmerIdx];
        synth({ type: 'triangle', freq: shimmerFreq, dur: 0.62, att: 0.12, vol: Math.min(0.022, 0.010 + combo * 0.0025), cutoff: 1550, delay: 0.14, pan: (musicStep % 2 === 0 ? -0.35 : 0.35) });
    }
    musicStep++;
}
const haptic = ms => { try { if(navigator.vibrate) navigator.vibrate(ms); } catch(e) {} };

/* ===== Estado do Jogo ===== */
const opt = { shake: true, fx: true, hit: true, touch: 'gestures' };
let state = 'idle', snake = [], dir = { x: 1, y: 0 }, queue = [], food = null, wormhole = null, wormholeTimer = 0;
let arenaShip = null, arenaShipTimer = 18;
let bgShip = null, bgShipTimer = 14, bgWorm = null, bgWormTimer = 55, meteorTimer = 11;
let score = 0, best = 0, combo = 0, maxCombo = 0, lastEat = -1e9, acc = 0, tNow = 0;
let freeze = 0, hitFlash = 0, hitKind = 'white', shake = 0, lastNearSnd = -1e9, wasNear = false;
let sprintHeld = false, sprintActive = false, sprintEnergy = 1, dashReadyNotified = true, dashGainFlash = 0, trailAcc = 0, sprintBurst = 0, sprintWarp = 0, lastThermalDrift = -1e9;
let dyingAcc = 0, dyingTotal = 0, lenAtDeath = 3, overT = 0, pausedBySettings = false, settingsOpen = false;
const parts = [], popups = [], sprintGhosts = [], digestions = [], meteors = [], warpWaves = [];
const SPRINT_MAX = 1.0;
const stepMs = () => sprintActive ? 45 : Math.max(85, 150 - (snake.length - 3) * 2);

function reset(){
    const y = N >> 1;
    snake = [{ x: 6, y }, { x: 5, y }, { x: 4, y }];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    combo = 0;
    maxCombo = 0;
    lastEat = -1e9;
    lastNearSnd = -1e9;
    wasNear = false;
    acc = 0;
    freeze = 0;
    hitFlash = 0;
    shake = 0;
    sprintHeld = false;
    sprintActive = false;
    sprintEnergy = 1;
    dashReadyNotified = true;
    dashGainFlash = 0;
    trailAcc = 0;
    sprintBurst = 0;
    sprintWarp = 0;
    lastThermalDrift = -1e9;
    wormhole = null;
    wormholeTimer = rnd(16, 28);
    arenaShip = null;
    arenaShipTimer = rnd(18, 28);
    bgShip = null;
    bgShipTimer = rnd(12, 24);
    bgWorm = null;
    bgWormTimer = rnd(48, 82);
    meteorTimer = rnd(8, 15);
    musicAcc = 0;
    musicStep = 0;
    stopSprintAudio();
    parts.length = 0;
    popups.length = 0;
    sprintGhosts.length = 0;
    digestions.length = 0;
    meteors.length = 0;
    warpWaves.length = 0;
    generateSessionScenery();
    buildArenaBg();
    rebuildOuterSpace(true);
    placeFood(true);
    updateHud();
}

function isPortalCell(x, y){
    return !!wormhole && ((wormhole.a.x === x && wormhole.a.y === y) || (wormhole.b.x === x && wormhole.b.y === y));
}
function placeFood(silent = false){
    const free = [];
    for(let x = 0; x < N; x++){
        for(let y = 0; y < N; y++){
            if(!snake.some(s => s.x === x && s.y === y) && !isPortalCell(x, y)) free.push({ x, y });
        }
    }
    if(!free.length){ food = null; return; }
    const c = pick(free);
    food = { x: c.x, y: c.y, gold: Math.random() < 0.14, kind: pick(KINDS), spawn: 0 };
    if(!silent && state === 'running') sndSpawn(food.gold, food.x);
}
function spawnWormhole(){
    const free = [];
    for(let x = 1; x < N - 1; x++){
        for(let y = 1; y < N - 1; y++){
            if(snake.some(s => s.x === x && s.y === y)) continue;
            if(food && food.x === x && food.y === y) continue;
            if(snake[0] && Math.abs(x - snake[0].x) + Math.abs(y - snake[0].y) < 3) continue;
            free.push({ x, y });
        }
    }
    if(free.length < 2) return;
    const a = pick(free);
    const far = free.filter(c => Math.abs(c.x - a.x) + Math.abs(c.y - a.y) >= 7);
    const b = pick(far.length ? far : free.filter(c => c !== a));
    if(!b) return;
    wormhole = { a, b, spawn: 0, used: false, closing: false, closeT: 0, life: rnd(14, 18) };
}
function spawnArenaShip(){
    const horiz = Math.random() < 0.5;
    const side = Math.random() < 0.5 ? 0 : 1; // 0: esquerda/topo, 1: direita/baixo
    const candidates = [];
    for(let i = 2; i < N - 2; i++){
        const ex = horiz ? (side === 0 ? 0 : N - 1) : i;
        const ey = horiz ? i : (side === 0 ? 0 : N - 1);
        if(snake[0] && Math.abs(ex - snake[0].x) + Math.abs(ey - snake[0].y) < 4) continue;
        candidates.push(i);
    }
    const line = candidates.length ? pick(candidates) : (N >> 1);
    const dx = horiz ? (side === 0 ? 1 : -1) : 0;
    const dy = horiz ? 0 : (side === 0 ? 1 : -1);
    const startX = horiz ? (side === 0 ? 0 : N - 1) : line;
    const startY = horiz ? line : (side === 0 ? 0 : N - 1);
    arenaShip = {
        x: startX,
        y: startY,
        px: startX * T + 5,
        py: startY * T + 5,
        dx, dy,
        vx: dx, vy: dy,
        moveX: dx, moveY: dy,
        tilt: 0,
        phase: rnd(0, Math.PI * 2),
        evading: false,
        evadeCd: 0,
        exhaustAcc: 0,
        warningT: 1.0,
        speed: 34
    };
    sndShipWarn(startX);
}
function bounceArenaShipFromBody(){
    if(!arenaShip || !snake.length) return false;
    const shipRadius = 3.2;

    for(let i = 1; i < snake.length; i++){
        const seg = snake[i];
        const fromTail = snake.length - 1 - i;
        const size = fromTail === 0 ? T - 6 : (fromTail === 1 ? T - 4 : T - 2);
        const inset = (T - size) * 0.5;
        const left = seg.x * T + inset;
        const top = seg.y * T + inset;
        const right = left + size;
        const bottom = top + size;
        const closestX = Math.max(left, Math.min(arenaShip.px, right));
        const closestY = Math.max(top, Math.min(arenaShip.py, bottom));
        let nx = arenaShip.px - closestX;
        let ny = arenaShip.py - closestY;
        let dist = Math.hypot(nx, ny);
        if(dist >= shipRadius) continue;

        if(dist < 0.001){
            // Se a nave estiver dentro do quadrado, empurra pela face de menor penetração.
            const gaps = [
                { d: arenaShip.px - left, nx: -1, ny: 0 },
                { d: right - arenaShip.px, nx: 1, ny: 0 },
                { d: arenaShip.py - top, nx: 0, ny: -1 },
                { d: bottom - arenaShip.py, nx: 0, ny: 1 }
            ].sort((a, b) => a.d - b.d);
            nx = gaps[0].nx;
            ny = gaps[0].ny;
            arenaShip.px += nx * (gaps[0].d + shipRadius + 0.35);
            arenaShip.py += ny * (gaps[0].d + shipRadius + 0.35);
        } else {
            nx /= dist;
            ny /= dist;
            const push = shipRadius - dist + 0.35;
            arenaShip.px += nx * push;
            arenaShip.py += ny * push;
        }

        // Reflete o vetor de movimento na normal da superfície, produzindo um ricochete.
        let vx = arenaShip.moveX ?? arenaShip.vx;
        let vy = arenaShip.moveY ?? arenaShip.vy;
        const dot = vx * nx + vy * ny;
        let rx = vx - 2 * dot * nx;
        let ry = vy - 2 * dot * ny;
        if(dot >= 0 || Math.hypot(rx, ry) < 0.001){
            rx = nx;
            ry = ny;
        }
        const len = Math.hypot(rx, ry) || 1;
        rx /= len;
        ry /= len;
        arenaShip.x = Math.floor(arenaShip.px / T);
        arenaShip.y = Math.floor(arenaShip.py / T);
        arenaShip.vx = rx;
        arenaShip.vy = ry;
        arenaShip.moveX = rx;
        arenaShip.moveY = ry;
        if(Math.abs(rx) >= Math.abs(ry)){
            arenaShip.dx = Math.sign(rx) || 1;
            arenaShip.dy = 0;
        } else {
            arenaShip.dx = 0;
            arenaShip.dy = Math.sign(ry) || 1;
        }
        arenaShip.evading = true;
        arenaShip.evadeCd = 0.24;
        arenaShip.speed = Math.max(arenaShip.speed || 34, 42);
        arenaShip.tilt = (nx * ry - ny * rx) >= 0 ? 2.4 : -2.4;
        if(opt.fx) burst(arenaShip.px, arenaShip.py, [P.cyan, P.white, '#a8e8ff'], 7, 34);
        return true;
    }
    return false;
}

function eatArenaShip(){
    if(!arenaShip) return;
    const sx = arenaShip.x, sy = arenaShip.y;
    const fxX = Math.round(arenaShip.px), fxY = Math.round(arenaShip.py);
    arenaShip = null;
    arenaShipTimer = rnd(22, 34);

    const pts = 15 + Math.min(combo, 6) * 3;
    score += pts;
    best = Math.max(best, score);

    const wasLow = sprintEnergy < 0.98;
    sprintEnergy = Math.min(1, sprintEnergy + 0.15);
    dashGainFlash = 0.20;
    if(wasLow && sprintEnergy >= 0.99 && !dashReadyNotified){
        dashReadyNotified = true;
        sndDashReady();
    }

    digestions.push({ progress: 0 });
    sndEatShip(sx);
    haptic(20);
    if(opt.fx){
        burst(fxX, fxY, ['#cfd9e6', '#f4f4f4', '#ff6b4a', '#8ce8ff'], 22, 74);
        popups.push({ x: fxX - ('+' + pts).length * 2, y: sy * T - 2, t: 0, text: '+' + pts, gold: true });
    }
    if(opt.shake) shake = Math.max(shake, 1.4);
    if(opt.hit){
        freeze = 65;
        hitFlash = 65;
        hitKind = 'white';
    }
    updateHud(true);
}

function setDir(d){
    if(state !== 'running') return;
    const last = queue.length ? queue[queue.length - 1] : dir;
    if((d.x === -last.x && d.y === -last.y) || (d.x === last.x && d.y === last.y)) return;
    if(queue.length < 2) queue.push(d);
}
function spawnSprintParticles(count){
    if(!opt.fx || !snake.length) return;
    const tail = snake[snake.length - 1];
    const cx = tail.x * T + 5, cy = tail.y * T + 5;
    for(let i = 0; i < count && parts.length < 320; i++){
        const spread = rnd(-4.5, 4.5);
        const sp = rnd(32, 76);
        parts.push({
            x: cx - dir.x * 4 + dir.y * spread,
            y: cy - dir.y * 4 + dir.x * spread,
            vx: -dir.x * sp + dir.y * rnd(-18, 18),
            vy: -dir.y * sp + dir.x * rnd(-18, 18),
            c: pick([P.white, P.cyan, '#c4a5ff']),
            t: 0,
            life: rnd(0.24, 0.46),
            s: Math.random() < 0.35 ? 2 : 1
        });
    }
}

// O rastro térmico usa apenas tons derivados do gradiente real da minhoca.
function thermalDriftPalette(){
    const head = gradAt(0);
    return [
        css(mixC(head, [255, 255, 255], 0.42)),
        css(head),
        css(gradAt(0.22)),
        css(gradAt(0.52))
    ];
}

function spawnThermalDrift(pivotSeg, oldDir, newDir){
    if(!opt.fx) return;
    const cx = pivotSeg.x * T + 5 + oldDir.x * 3;
    const cy = pivotSeg.y * T + 5 + oldDir.y * 3;
    const cols = thermalDriftPalette();
    for(let i = 0; i < 4 && parts.length < 320; i++){
        const vx = (oldDir.x * 0.85 - newDir.x * 0.65) * rnd(32, 62) + rnd(-12, 12);
        const vy = (oldDir.y * 0.85 - newDir.y * 0.65) * rnd(32, 62) + rnd(-12, 12);
        parts.push({
            x: cx + rnd(-1.5, 1.5),
            y: cy + rnd(-1.5, 1.5),
            vx, vy,
            c: cols[i % cols.length],
            t: 0,
            life: rnd(0.20, 0.36),
            s: i === 0 ? 2 : 1
        });
    }
}
function spawnWarpEffect(cx, cy, c1, c2){
    if(!opt.fx) return;
    for(let i = 0; i < 16 && parts.length < 320; i++){
        const a = (i / 16) * Math.PI * 2 + rnd(-0.15, 0.15);
        const sp = rnd(26, 62);
        parts.push({
            x: cx, y: cy,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            c: i % 2 === 0 ? c1 : c2,
            t: 0, life: rnd(0.28, 0.50), s: Math.random() < 0.4 ? 2 : 1
        });
    }
}

function startSprint(){
    if(state !== 'running' || sprintEnergy <= 0.08) return;
    sprintHeld = true;
    if(!sprintActive){
        sprintActive = true;
        sprintBurst = 0.16;
        dashReadyNotified = false;
        acc = Math.min(acc, 24);
        startSprintAudio();
        haptic(12);
        spawnSprintParticles(14);
        if(opt.fx) sprintGhosts.push({ segs: snake.map(s => ({ x: s.x, y: s.y })), t: 0, life: 0.22 });
    }
}
function stopSprint(){
    sprintHeld = false;
    if(sprintActive){
        sprintActive = false;
        stopSprintAudio();
    }
}

function step(){
    const prevDir = { x: dir.x, y: dir.y };
    const prevHead = { x: snake[0].x, y: snake[0].y };
    let turned = false;
    if(queue.length){
        dir = queue.shift();
        turned = (dir.x !== prevDir.x || dir.y !== prevDir.y);
        if(!sprintActive) sndTurn();
        // Só gera o rastro em curva sob pressão: dash + combo alto + proximidade de obstáculo.
        if(turned && sprintActive && combo >= 4 && wasNear && tNow - lastThermalDrift >= 0.65){
            lastThermalDrift = tNow;
            spawnThermalDrift(prevHead, prevDir, dir);
            sndThermalDrift(cellPan(prevHead.x));
        }
    }
    let nx = snake[0].x + dir.x, ny = snake[0].y + dir.y;
    if(nx < 0 || ny < 0 || nx >= N || ny >= N) return die();

    let warped = false;
    if(wormhole && !wormhole.closing && wormhole.spawn >= 0.45){
        let exit = null, entry = null;
        if(nx === wormhole.a.x && ny === wormhole.a.y){ entry = wormhole.a; exit = wormhole.b; }
        else if(nx === wormhole.b.x && ny === wormhole.b.y){ entry = wormhole.b; exit = wormhole.a; }
        if(exit){
            nx = exit.x;
            ny = exit.y;
            warped = true;
            wormhole.used = true;
            warpWaves.push({ pos: 0, amp: 1.35, dirX: dir.x, dirY: dir.y });
            sndWarp(entry.x, exit.x);
            haptic(14);
            if(opt.shake) shake = Math.max(shake, 1.1);
            spawnWarpEffect(entry.x * T + 5, entry.y * T + 5, P.cyan, '#c4a5ff');
            spawnWarpEffect(exit.x * T + 5, exit.y * T + 5, '#ff7eb6', P.cyan);
        }
    }

    const eating = !!food && nx === food.x && ny === food.y;
    const eatingShip = !!arenaShip && arenaShip.warningT <= 0 && (
        (nx === arenaShip.x && ny === arenaShip.y) ||
        Math.hypot((nx * T + 5) - arenaShip.px, (ny * T + 5) - arenaShip.py) < 7.5
    );
    if((eating ? snake : snake.slice(0, -1)).some(s => s.x === nx && s.y === ny)) return die();

    snake.unshift({ x: nx, y: ny });
    if(!eating) snake.pop();

    // A digestão acompanha a mudança de índice dos segmentos da cobra.
    for(let i = digestions.length - 1; i >= 0; i--){
        digestions[i].progress += 1;
        if(digestions[i].progress > snake.length + 1) digestions.splice(i, 1);
    }

    if(eating) eat();
    if(eatingShip) eatArenaShip();

    if(!warped && state === 'running'){
        const isBlocked = (cx, cy) => cx < 0 || cy < 0 || cx >= N || cy >= N || snake.slice(3, -1).some(s => s.x === cx && s.y === cy);
        const leftBlocked = isBlocked(nx + dir.y, ny - dir.x);
        const rightBlocked = isBlocked(nx - dir.y, ny + dir.x);
        const dodgeBlocked = turned && isBlocked(prevHead.x + prevDir.x, prevHead.y + prevDir.y);
        const nearNow = leftBlocked || rightBlocked || dodgeBlocked;

        if(nearNow && (!wasNear || dodgeBlocked) && (sprintActive || dodgeBlocked || combo >= 2) && (tNow - lastNearSnd > 0.52)){
            lastNearSnd = tNow;
            let pan = 0;
            if(leftBlocked && !rightBlocked) pan = dir.x !== 0 ? 0 : (dir.y > 0 ? 0.5 : -0.5);
            else if(rightBlocked && !leftBlocked) pan = dir.x !== 0 ? 0 : (dir.y > 0 ? -0.5 : 0.5);
            else pan = ((nx / (N - 1)) * 2 - 1) * 0.45;
            sndNearMiss(pan);
        }
        wasNear = nearNow;
    }
}

function eat(){
    combo = tNow - lastEat < 2.6 ? combo + 1 : 0; lastEat = tNow; maxCombo = Math.max(maxCombo, combo);
    let extraPts = 0;
    if(!food.gold){
        if(food.kind === 'saturn'){
            // Bônus orbital se devorar Saturno quando sua lua estiver alinhada com a direção da cobra
            const moonAng = tNow * 2.6;
            const mx = Math.cos(moonAng), my = Math.sin(moonAng);
            if(Math.abs(mx * dir.x + my * dir.y) > 0.65) extraPts = 5;
        } else if(food.kind === 'jupiter'){
            extraPts = 3; // Bônus gravitacional do gigante gasoso
        }
    }
    const pts = (food.gold ? 25 : 10) + Math.min(combo, 6) * 5 + extraPts;
    score += pts; best = Math.max(best, score);
    const fxX = food.x * T + 5, fxY = food.y * T + 5;
    const debCols = PLANETS[food.gold ? 'star' : food.kind].deb;

    digestions.push({ progress: 0 });

    const wasLow = sprintEnergy < 0.98;
    const energyGain = food.gold ? 1.0 : Math.min(0.55, 0.38 + Math.min(combo, 4) * 0.04);
    sprintEnergy = Math.min(1, sprintEnergy + energyGain);
    dashGainFlash = 0.25;
    if(wasLow && sprintEnergy >= 0.99 && !dashReadyNotified){
        dashReadyNotified = true;
        sndDashReady();
        const db = $('#dashBadge');
        db.classList.remove('pulse'); void db.offsetWidth; db.classList.add('pulse');
    }

    sndEat(combo, food.gold, food.kind, food.x);
    musicAccent(combo, food.gold);
    haptic(food.gold ? 28 : 16);
    if(opt.fx){
        burst(fxX, fxY, debCols, food.gold ? 42 : 28, food.gold ? 88 : 72);
        popups.push({ x: fxX - ('+' + pts).length * 2, y: food.y * T - 2, t: 0, text: '+' + pts, gold: food.gold || extraPts > 0 });
    }
    if(opt.shake) shake = Math.max(shake, food.gold ? 2.5 : 1.8);
    if(opt.hit){
        const freezeMs = food.gold ? 135 : Math.min(115, 85 + combo * 5);
        freeze = freezeMs;
        hitFlash = freezeMs;
        hitKind = food.gold ? 'gold' : 'white';
    }
    placeFood(); updateHud(true);
    if(!food) die(true);
}

function die(win){
    if(state === 'dying' || state === 'over') return;
    stopSprint();
    state = 'dying'; dyingAcc = 0; overT = 0; queue.length = 0; dyingTotal = snake.length; lenAtDeath = snake.length;
    best = Math.max(best, score); updateHud();
    if(win) sndStart();
    else {
        sndDeath();
        if(opt.shake) shake = 3.6;
        if(opt.hit){ freeze = 150; hitFlash = 140; hitKind = 'white'; }
        haptic([40, 40, 60]);
    }
    finishGame(score);
}

/* ===== Partículas & Simulação Física ===== */
function burst(cx, cy, cols, n, speed){
    for(let i = 0; i < n && parts.length < 320; i++){
        const a = rnd(0, Math.PI * 2), s = rnd(0.3, 1) * speed;
        parts.push({ x: cx + rnd(-2, 2), y: cy + rnd(-2, 2), vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: pick(cols), t: 0, life: rnd(0.9, 1.5), s: Math.random() < 0.5 ? 2 : 1 });
    }
}
function dissolve(seg, idx, len){
    if(!opt.fx) return;
    const c = gradAt(len > 1 ? idx / (len - 1) : 0), cols = [css(c), css(mixC(c, [255, 255, 255], 0.3)), css(mixC(c, [14, 15, 26], 0.35))];
    for(let k = 0; k < 14 && parts.length < 320; k++){
        const a = rnd(0, Math.PI * 2), sp = rnd(25, 75);
        parts.push({ x: seg.x * T + rnd(1, 9), y: seg.y * T + rnd(1, 9), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: pick(cols), t: 0, life: rnd(1.0, 1.6), s: Math.random() < 0.5 ? 2 : 1 });
    }
}
function simulate(dt){
    const s = dt / 1000;
    const fr = Math.exp(-2.8 * s);
    // Júpiter exerce uma leve atração gravitacional nas partículas soltas próximas
    const jupActive = food && !food.gold && food.kind === 'jupiter' && (food.spawn ?? 1) >= 1;
    const jx = jupActive ? food.x * T + 5 : 0;
    const jy = jupActive ? food.y * T + 5 : 0;

    for(let i = parts.length - 1; i >= 0; i--){
        const p = parts[i]; p.t += s; p.vx *= fr; p.vy *= fr;
        if(jupActive){
            const dx = jx - p.x, dy = jy - p.y;
            const d2 = dx * dx + dy * dy;
            if(d2 > 16 && d2 < 2400){
                const pull = (420 / d2) * s;
                p.vx += dx * pull;
                p.vy += dy * pull;
            }
        }
        p.x += p.vx * s; p.y += p.vy * s;
        if(Math.abs(p.vx) < 2 && Math.abs(p.vy) < 2){ p.vx = 0; p.vy = 0; }
        if(p.x < 0){ p.x = 0; p.vx *= -0.6; } else if(p.x > LW - p.s){ p.x = LW - p.s; p.vx *= -0.6; }
        if(p.y < 0){ p.y = 0; p.vy *= -0.6; } else if(p.y > LW - p.s){ p.y = LW - p.s; p.vy *= -0.6; }
        if(p.t > p.life) parts.splice(i, 1);
    }
    for(let i = sprintGhosts.length - 1; i >= 0; i--){
        sprintGhosts[i].t += s;
        if(sprintGhosts[i].t >= sprintGhosts[i].life) sprintGhosts.splice(i, 1);
    }
}

/* ===== Desenho da Arena ===== */
function drawSparkle(cx, cy, phase, col, big){
    if(phase === 0) rect(cx, cy, 1, 1, col);
    else if(phase === 1){
        rect(cx, cy, 1, 1, P.white);
        rect(cx - 1, cy, 1, 1, col); rect(cx + 1, cy, 1, 1, col);
        rect(cx, cy - 1, 1, 1, col); rect(cx, cy + 1, 1, 1, col);
    } else if(big && phase === 2){
        rect(cx, cy, 1, 1, P.white);
        for(const d of [-1, 1]){
            rect(cx + d, cy, 1, 1, P.white); rect(cx, cy + d, 1, 1, P.white);
            rect(cx + d * 2, cy, 1, 1, col); rect(cx, cy + d * 2, 1, 1, col);
        }
    }
}

function drawWormhole(){
    if(!wormhole) return;
    if(wormhole.closing && Math.floor(wormhole.closeT * 24) % 2 === 1) return;
    const timeLeft = wormhole.life - (tNow - (wormhole.born || tNow));
    if(timeLeft < 2.2 && Math.floor(tNow * 14) % 2 === 1) return;

    const sc = wormhole.closing ? (1 - wormhole.closeT / 0.25) : Math.min(1, wormhole.spawn);
    if(sc <= 0.05) return;

    const ax = wormhole.a.x * T + 5, ay = wormhole.a.y * T + 5;
    const bx = wormhole.b.x * T + 5, by = wormhole.b.y * T + 5;

    if(opt.fx && sc > 0.6){
        const dist = Math.hypot(bx - ax, by - ay);
        const dots = Math.max(4, Math.floor(dist / 7));
        for(let i = 1; i < dots; i++){
            const u = (i / dots + tNow * 0.45) % 1;
            const px = Math.round(ax + (bx - ax) * u);
            const py = Math.round(ay + (by - ay) * u);
            rect(px, py, 1, 1, i % 2 === 0 ? 'rgba(140, 232, 255, 0.34)' : 'rgba(196, 165, 255, 0.28)');
        }
    }

    const portals = [
        { p: wormhole.a, rim: P.cyan, mid: '#8574e0', spin: 1 },
        { p: wormhole.b, rim: '#ff7eb6', mid: '#c4a5ff', spin: -1 }
    ];
    for(const pt of portals){
        const cx = pt.p.x * T + 5, cy = pt.p.y * T + 5;
        const pulse = 0.88 + Math.sin(tNow * 4.2 + pt.spin) * 0.12;
        const rx = 4.7 * sc * pulse, ry = 3.15 * sc * pulse;
        // Abertura oval com centro escuro: silhueta de portal, não de planeta.
        for(let dy = -5; dy <= 5; dy++) for(let dx = -6; dx <= 6; dx++){
            const q = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
            if(q > 1.28 || q < 0.18) continue;
            const ang = Math.atan2(dy / ry, dx / rx) + tNow * 5.5 * pt.spin;
            const wave = Math.sin(ang * 3 + q * 8);
            const col = q > 0.82 ? pt.rim : (wave > 0.12 ? pt.mid : '#34275f');
            rect(cx + dx, cy + dy, 1, 1, col);
        }
        for(let dy = -2; dy <= 2; dy++) for(let dx = -3; dx <= 3; dx++){
            if((dx * dx) / 9 + (dy * dy) / 4 <= 1) rect(cx + dx, cy + dy, 1, 1, '#080b19');
        }
        // Jatos curtos nas extremidades e pequenas faíscas orbitais.
        const flare = Math.floor(tNow * 8 + (pt.spin > 0 ? 0 : 2)) % 4;
        rect(cx - 6, cy, 1, 1, pt.rim); rect(cx + 6, cy, 1, 1, pt.rim);
        if(flare === 0 || flare === 2){
            rect(cx - 4, cy - 4, 1, 1, P.white);
            rect(cx + 4, cy + 4, 1, 1, pt.mid);
        }
        if(sc > 0.75){
            const orbitA = tNow * 6 * pt.spin;
            rect(cx + Math.cos(orbitA) * 5.6, cy + Math.sin(orbitA) * 3.8, 1, 1, P.white);
        }
    }
}

function drawArenaShip(){
    if(!arenaShip) return;
    if(arenaShip.warningT > 0){
        if(Math.floor(tNow * 14) % 2 === 0){
            const bx = arenaShip.x * T + 5, by = arenaShip.y * T + 5;
            rect(bx - 1, by - 1, 2, 2, P.orange);
            rect(bx + arenaShip.dx * 2, by + arenaShip.dy * 2, 1, 1, P.gold);
        }
        return;
    }

    const cx = Math.round(arenaShip.px);
    const cy = Math.round(arenaShip.py);
    const bob = Math.round(Math.sin(tNow * 5.4 + arenaShip.phase) * 1.1);
    const tiltShift = Math.round(arenaShip.tilt);
    const fx = cx - 3 + (arenaShip.dy !== 0 ? tiltShift : 0);
    const fy = cy - 3 + bob + (arenaShip.dx !== 0 ? tiltShift : 0);

    // Aura de alerta discreta, acompanhando a nova escala da nave.
    if(opt.fx){
        const pulse = 0.5 + 0.5 * Math.sin(tNow * 4.8 + arenaShip.phase);
        const auraCol = arenaShip.evading
            ? `rgba(140, 232, 255, ${(0.10 + pulse * 0.13).toFixed(2)})`
            : `rgba(255, 159, 67, ${(0.07 + pulse * 0.09).toFixed(2)})`;
        rect(fx + 1, fy + 1, 5, 5, auraCol);
    }

    // Sprite 7x7: menor que os planetas, mantendo a leitura em pixel art.
    for(let j = 0; j < 7; j++){
        for(let i = 0; i < 7; i++){
            let si = i, sj = j;
            if(arenaShip.dx === -1){ si = 6 - i; }
            else if(arenaShip.dy === 1){ si = j; sj = 6 - i; }
            else if(arenaShip.dy === -1){ si = 6 - j; sj = i; }
            const ch = ARENA_SHIP_RIGHT[sj][si];
            if(ch !== '.') rect(fx + i, fy + j, 1, 1, ARENA_SHIP_PAL[ch]);
        }
    }

    // Luzes de navegação piscantes nas pontas das asas
    const navOn = Math.sin(tNow * 3.1 + arenaShip.phase) > -0.15;
    if(navOn){
        const wingCol = arenaShip.evading ? P.cyan : P.orange;
        if(arenaShip.dx !== 0){
            rect(fx + (arenaShip.dx > 0 ? 2 : 4), fy + 1, 1, 1, wingCol);
            rect(fx + (arenaShip.dx > 0 ? 2 : 4), fy + 5, 1, 1, '#ff6b8b');
        } else {
            rect(fx + 1, fy + (arenaShip.dy > 0 ? 2 : 4), 1, 1, wingCol);
            rect(fx + 5, fy + (arenaShip.dy > 0 ? 2 : 4), 1, 1, '#ff6b8b');
        }
    }

    // Chama animada do propulsor (mais longa durante evasão)
    const baseLen = arenaShip.evading ? 2 : 1;
    const flameLen = baseLen + (Math.sin(tNow * 15 + arenaShip.phase) > 0.05 ? 1 : 0);
    const tailX = fx + 3 - arenaShip.dx * 3;
    const tailY = fy + 3 - arenaShip.dy * 3;
    for(let f = 0; f < flameLen; f++){
        const px = tailX - arenaShip.dx * f;
        const py = tailY - arenaShip.dy * f;
        const col = f === 0 ? P.white : (f === 1 ? P.cyan : (arenaShip.evading ? '#c4a5ff' : P.orange));
        if(arenaShip.dx !== 0) rect(px, py - 1, 1, 2, col);
        else rect(px - 1, py, 2, 1, col);
    }
}

function drawSprintGhosts(){
    if(!opt.fx || !sprintGhosts.length) return;
    for(const g of sprintGhosts){
        const k = 1 - g.t / g.life;
        const ins = k > 0.5 ? 2 : 3;
        const w = T - ins * 2;
        if(w <= 0) continue;
        const col = k > 0.5 ? 'rgba(140, 232, 255, 0.34)' : 'rgba(196, 165, 255, 0.18)';
        for(let i = 0; i < g.segs.length; i++){
            const s = g.segs[i];
            rect(s.x * T + ins, s.y * T + ins, w, w, col);
        }
    }
}

function drawSnake(){
    const L = snake.length;
    if(!L) return;
    const hitGlow = hitFlash > 0 ? Math.min(1, hitFlash / 90) : 0;

    // A onda de distorção dos portais continua passando pelo corpo normalmente.
    const waveOffX = new Array(L).fill(0);
    const waveOffY = new Array(L).fill(0);
    const waveGlow = new Array(L).fill(0);
    for(const w of warpWaves){
        for(let i = 0; i < L; i++){
            const d = i - w.pos;
            if(Math.abs(d) < 2.2){
                const env = Math.cos((d / 2.2) * (Math.PI * 0.5));
                const ripple = Math.round(Math.sin(d * 2.6) * w.amp * env);
                waveOffX[i] += -w.dirY * ripple;
                waveOffY[i] += w.dirX * ripple;
                waveGlow[i] = Math.max(waveGlow[i], env * 0.65);
            }
        }
    }

    // A digestão avança um segmento por passo, acompanhando a cauda sem deriva de frames.
    // O relevo é mínimo e não altera a cor do corpo.
    const digestionGlow = new Array(L).fill(0);
    for(let i = 0; i < L; i++){
        for(const d of digestions){
            const dist = Math.abs(i - (d.progress + 0.5));
            const influence = Math.exp(-Math.pow(dist / 0.42, 2));
            digestionGlow[i] = Math.max(digestionGlow[i], influence);
        }
    }

    // Mantém o corpo quadrado e o gradiente original; o dash não recolore os segmentos.
    const cols = snake.map((_, i) => {
        let c = gradAt(L > 1 ? i / (L - 1) : 0);
        if(waveGlow[i] > 0) c = mixC(c, [140, 232, 255], waveGlow[i]);
        if(hitGlow > 0 && i <= 2) c = mixC(c, hitKind === 'gold' ? [255, 225, 135] : [255, 255, 255], hitGlow * (0.75 - i * 0.2));
        return c;
    });
    // Largura em pixels inteiros para manter os dois lados perfeitamente alinhados.
    // O corpo usa quadrados de 8 px; a cauda afina em dois degraus simétricos.
    const bodySizes = snake.map((_, i) => {
        const fromTail = L - 1 - i;
        if(i === 0) return T - 2;         // cabeça: 8 px, recupera a expressão original
        if(fromTail === 0) return T - 6;  // ponta da cauda: 4 px
        if(fromTail === 1) return T - 4;  // transição da cauda: 6 px
        return T - 2;                    // corpo: 8 px
    });

    if(sprintActive && opt.fx){
        const tail = snake[L - 1], prev = snake[L - 2] || tail;
        const tx = Math.sign(tail.x - prev.x) || -dir.x;
        const ty = Math.sign(tail.y - prev.y) || -dir.y;
        const cx = tail.x * T + 5 + waveOffX[L - 1], cy = tail.y * T + 5 + waveOffY[L - 1];
        const flameLen = 2 + (Math.floor(tNow * 24) % 3);
        for(let f = 3; f <= 3 + flameLen; f++){
            const c = f === 3 ? P.white : (f % 2 === 0 ? P.cyan : '#c4a5ff');
            rect(cx + tx * f - (ty !== 0 ? 1 : 0), cy + ty * f - (tx !== 0 ? 1 : 0), ty !== 0 ? 2 : 1, tx !== 0 ? 2 : 1, c);
        }
    }

    // Distorção espacial azul: refração curta e ondulada junto ao corpo.
    // O efeito acompanha a silhueta, pulsa durante o dash e se dissipa com sprintWarp.
    const warpLevel = opt.fx ? sprintWarp : 0;
    if(warpLevel > 0.008 && L > 1){
        const points = [];
        for(let i = 0; i < L; i++){
            const prev = snake[Math.max(0, i - 1)];
            const next = snake[Math.min(L - 1, i + 1)];
            let tx = next.x - prev.x, ty = next.y - prev.y;
            const len = Math.hypot(tx, ty) || 1;
            tx /= len; ty /= len;
            points.push({
                x: snake[i].x * T + 5 + waveOffX[i],
                y: snake[i].y * T + 5 + waveOffY[i],
                nx: -ty, ny: tx,
                edge: bodySizes[i] * 0.5 + 0.6
            });
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#38aaff';
        ctx.shadowColor = 'rgba(42, 155, 255, 0.38)';
        ctx.shadowBlur = 2.2;
        ctx.lineWidth = 1.15;
        ctx.globalAlpha = 0.34 * warpLevel;

        // Duas linhas refratadas, com ondulação deslocada de fase em cada lado.
        for(const side of [-1, 1]){
            ctx.beginPath();
            for(let i = 0; i < points.length; i++){
                const p = points[i];
                const ripple = Math.sin(tNow * 9.5 - i * 0.78 + side * 0.65) * 1.05;
                const pulse = Math.sin(tNow * 5.2 - i * 0.25) * 0.28;
                const offset = side * (p.edge + ripple) + pulse;
                const x = p.x + p.nx * offset;
                const y = p.y + p.ny * offset;
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Pequena segunda borda azul-clara, mais apagada, sugere refração do espaço.
            ctx.beginPath();
            for(let i = 0; i < points.length; i++){
                const p = points[i];
                const ripple = Math.sin(tNow * 8.1 - i * 0.78 + side * 0.65 + 1.1) * 0.55;
                const offset = side * (p.edge + 2.0 + ripple);
                const x = p.x + p.nx * offset;
                const y = p.y + p.ny * offset;
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = '#82d8ff';
            ctx.lineWidth = 0.7;
            ctx.globalAlpha = 0.15 * warpLevel;
            ctx.stroke();
            ctx.strokeStyle = '#38aaff';
            ctx.lineWidth = 1.15;
            ctx.globalAlpha = 0.34 * warpLevel;
        }

        // Arcos curtos azuis atravessam o contorno, em vez de formar um halo contínuo.
        ctx.shadowBlur = 1.4;
        ctx.strokeStyle = '#79d5ff';
        ctx.lineWidth = 0.9;
        ctx.globalAlpha = 0.26 * warpLevel;
        const phase = Math.floor(tNow * 8);
        for(let i = 1; i < points.length - 1; i += 4){
            const p = points[i];
            const side = ((i + phase) % 2) ? 1 : -1;
            const centerX = p.x + p.nx * side * (p.edge + 0.75);
            const centerY = p.y + p.ny * side * (p.edge + 0.75);
            const angle = Math.atan2(p.ny * side, p.nx * side);
            const radius = 1.8 + 0.35 * Math.sin(tNow * 10 - i);
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, angle - 0.72, angle + 0.72);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Corpo alinhado à grade original: sem interpolação, rotação ou quadros intermediários.
    for(let i = L - 1; i >= 0; i--){
        const seg = snake[i];
        const size = bodySizes[i];
        const inset = (T - size) * 0.5;
        rect(seg.x * T + inset + waveOffX[i], seg.y * T + inset + waveOffY[i], size, size, css(cols[i]));
    }
    // Conectores ortogonais mantêm o corpo unido nas curvas sem suavizar o movimento.
    for(let i = 0; i < L - 1; i++){
        const a = snake[i], b = snake[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        if(Math.abs(dx) + Math.abs(dy) !== 1) continue;
        const ax = a.x * T + 5 + waveOffX[i], ay = a.y * T + 5 + waveOffY[i];
        // Usa uma largura par e centralizada também nas curvas e na transição da cauda.
        const width = Math.min(bodySizes[i], bodySizes[i + 1]);
        const color = css(mixC(cols[i], cols[i + 1], 0.5));
        if(dx !== 0) rect(ax + (dx < 0 ? -T : 0), ay - width * 0.5, T, width, color);
        else rect(ax - width * 0.5, ay + (dy < 0 ? -T : 0), width, T, color);
    }
    // Brilho azul de baixa opacidade sobre o corpo inteiro durante o dash.
    // Um único path evita sobreposição excessiva de luz entre segmentos vizinhos.
    if(warpLevel > 0.001){
        ctx.save();
        ctx.beginPath();
        for(let i = 0; i < L; i++){
            const seg = snake[i];
            const size = bodySizes[i], inset = (T - size) * 0.5;
            ctx.rect(seg.x * T + inset + waveOffX[i], seg.y * T + inset + waveOffY[i], size, size);
        }
        for(let i = 0; i < L - 1; i++){
            const a = snake[i], b = snake[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            if(Math.abs(dx) + Math.abs(dy) !== 1) continue;
            const ax = a.x * T + 5 + waveOffX[i], ay = a.y * T + 5 + waveOffY[i];
            const width = Math.min(bodySizes[i], bodySizes[i + 1]);
            if(dx !== 0) ctx.rect(ax + (dx < 0 ? -T : 0), ay - width * 0.5, T, width);
            else ctx.rect(ax - width * 0.5, ay + (dy < 0 ? -T : 0), width, T);
        }
        ctx.globalAlpha = 0.38 * warpLevel;
        ctx.fillStyle = 'rgba(54, 145, 255, 0.22)';
        ctx.shadowColor = 'rgba(48, 135, 255, 0.52)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
    }

    for(let i = 0; i < L; i++){
        const seg = snake[i];
        const size = bodySizes[i], inset = (T - size) * 0.5;
        const x = seg.x * T + inset + waveOffX[i], y = seg.y * T + inset + waveOffY[i];
        rect(x, y, size, 1, css(mixC(cols[i], [255, 255, 255], 0.32)));
        rect(x, y + size - 1, size, 1, css(mixC(cols[i], [14, 15, 26], 0.35)));
    }

    const h = snake[0], lean = 0;
    const cx = h.x * T + 5 + dir.x * lean + waveOffX[0], cy = h.y * T + 5 + dir.y * lean + waveOffY[0];
    const ahead = food ? (food.x - h.x) * dir.x + (food.y - h.y) * dir.y : 0;
    const lateral = food ? (food.x - h.x) * dir.y - (food.y - h.y) * dir.x : 1;
    const nextX = h.x + dir.x, nextY = h.y + dir.y;
    const dangerAhead = state === 'running' && (nextX < 0 || nextY < 0 || nextX >= N || nextY >= N || snake.slice(1, -1).some(s => s.x === nextX && s.y === nextY));

    if(state === 'running' && lateral === 0 && ahead >= 1 && ahead <= 2){
        for(let j = -1; j <= 1; j++) for(let d = 3; d <= 5; d++) rect(cx + dir.x * d - dir.y * j, cy + dir.y * d + dir.x * j, 1, 1, P.ink);
    } else if(state === 'running' && Math.floor(tNow * 3) % 3 === 0){
        for(let k = 0; k < 3; k++) rect(cx + dir.x * (5 + k), cy + dir.y * (5 + k), 1, 1, P.tongue);
    }
    // Olhos grandes em pixel art: acompanham a comida e acompanham a direcao
    // da cabeca, com pupilas azuladas que se deslocam dentro da parte branca.
    const perpX = -dir.y, perpY = dir.x;
    let gazeSide = 0, gazeForward = 1;
    if(food){
        const gx = food.x - h.x, gy = food.y - h.y;
        const gl = Math.hypot(gx, gy) || 1;
        const nx = gx / gl, ny = gy / gl;
        const sideDot = nx * perpX + ny * perpY;
        const forwardDot = nx * dir.x + ny * dir.y;
        gazeSide = Math.abs(sideDot) < 0.22 ? 0 : Math.sign(sideDot);
        gazeForward = Math.abs(forwardDot) < 0.22 ? 0 : Math.sign(forwardDot);
    }

    // Piscada curta e ocasional para evitar que o rosto pareca estatico.
    const blinkPhase = tNow % 5.6;
    const blinking = blinkPhase > 5.34 && blinkPhase < 5.49;
    const irisCol = sprintActive ? '#7be0ff' : '#55bdf5';
    const pupilCol = dangerAhead ? '#342817' : '#10172d';

    for(const side of [-1, 1]){
        // Cada olho ocupa 3x3 pixels e fica simetricamente posicionado na frente.
        const eyePixels = [];
        for(let row = 0; row < 3; row++){
            for(let col = 0; col < 3; col++){
                const lx = cx + dir.x * (1.15 + row - 1) + perpX * (side * 1.65 + col - 1);
                const ly = cy + dir.y * (1.15 + row - 1) + perpY * (side * 1.65 + col - 1);
                eyePixels.push({x: Math.round(lx), y: Math.round(ly), row, col});
            }
        }

        if(blinking){
            const lid = css(mixC(cols[0], [8, 12, 28], 0.18));
            for(const px of eyePixels){
                if(px.row === 1) rect(px.x, px.y, 1, 1, lid);
            }
            const gl = eyePixels.find(px => px.row === 1 && px.col === 1);
            if(gl) rect(gl.x, gl.y, 1, 1, '#c5eaff');
            continue;
        }

        // Pupila de dois pixels (iris azul + centro escuro), deslocada dentro
        // da esclera para seguir a comida sem perder a leitura em pixel art.
        for(const px of eyePixels) rect(px.x, px.y, 1, 1, P.eye);
        const pupilColIndex = 1 + gazeSide;
        const pupilStartRow = gazeForward > 0 ? 0 : (gazeForward < 0 ? 1 : 0);
        const iris = eyePixels.find(px => px.row === pupilStartRow && px.col === pupilColIndex);
        const pupil = eyePixels.find(px => px.row === pupilStartRow + 1 && px.col === pupilColIndex);
        if(iris) rect(iris.x, iris.y, 1, 1, irisCol);
        if(pupil) rect(pupil.x, pupil.y, 1, 1, pupilCol);
    }
}

function drawFood(){
    if(!food) return;
    const sp = food.spawn ?? 1;
    const pl = PLANETS[food.gold ? 'star' : food.kind];

    if(sp < 1){
        const k = 1 - Math.pow(1 - sp, 2.2);
        const cx = food.x * T + 5, cy = food.y * T + 5;
        const r = k * 4.5;
        const coreCol = food.gold ? P.gold : pl.deb[0];
        const rimCol = food.gold ? P.white : pl.glint;
        for(let dy = -4; dy <= 4; dy++){
            for(let dx = -4; dx <= 4; dx++){
                const d = Math.hypot(dx + 0.5, dy + 0.5);
                if(d <= r) rect(cx + dx, cy + dy, 1, 1, d > r - 1 ? rimCol : coreCol);
            }
        }
        if(opt.fx && sp < 0.72){
            const d = Math.round((1 - sp) * 6);
            rect(cx - d, cy, 1, 1, rimCol); rect(cx + d - 1, cy, 1, 1, rimCol);
            rect(cx, cy - d, 1, 1, rimCol); rect(cx, cy + d - 1, 1, 1, rimCol);
        }
        return;
    }

    const bob = Math.floor(tNow * 3.4) % 2 ? 0 : -1;
    const fx = food.x * T, fy = food.y * T + bob;
    const cx = fx + 5, cy = fy + 5;

    // Comportamentos sutis por tipo de planeta
    if(opt.fx){
        if(food.gold){
            const glow = 0.5 + 0.5 * Math.sin(tNow * 2.6);
            ctx.save();
            const solarGlow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 10);
            solarGlow.addColorStop(0, `rgba(255, 190, 72, ${0.14 + glow * 0.045})`);
            solarGlow.addColorStop(0.62, `rgba(255, 134, 45, ${0.055 + glow * 0.02})`);
            solarGlow.addColorStop(1, 'rgba(255, 110, 30, 0)');
            ctx.fillStyle = solarGlow;
            // Recorte circular: impede que o halo forme uma placa quadrada ao redor do Sol.
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if(!food.gold && food.kind === 'earth'){
            // Terra: aura atmosférica com respiração suave + micro-satélite em órbita
            const pulse = Math.sin(tNow * 3.2) > 0;
            rect(fx + 2, fy + 1, 6, 8, pulse ? 'rgba(110, 185, 255, 0.22)' : 'rgba(110, 185, 255, 0.13)');
            rect(fx + 1, fy + 2, 8, 6, pulse ? 'rgba(110, 185, 255, 0.22)' : 'rgba(110, 185, 255, 0.13)');
        } else {
            rect(fx + 2, fy + 1, 6, 8, pl.halo);
            rect(fx + 1, fy + 2, 8, 6, pl.halo);
        }
    }

    if(!food.gold && food.kind === 'saturn' && opt.fx){
        for(let i = 0; i < 10; i++){
            if(i < 2 || i > 7){
                const yBack = fy + 3 + Math.round((i - 4.5) * 0.24);
                rect(fx + i, yBack, 1, 1, '#b88a55');
            }
        }
    }
    if(food.gold) spriteLit(pl.lit, fx - 1, fy - 1);
    else spriteLit(pl.lit, fx, fy);

    if(!food.gold && opt.fx){
        switch(food.kind){
            case 'mercury': {
                // Mercúrio: pequenos grãos minerais circulam rapidamente pela superfície.
                const dustA = tNow * 2.1;
                rect(cx + Math.cos(dustA) * 4, cy + Math.sin(dustA) * 2.5, 1, 1, '#e0e7ed');
                rect(cx + Math.cos(dustA + 2.8) * 3, cy + Math.sin(dustA + 2.8) * 3, 1, 1, 'rgba(220, 227, 233, 0.65)');
                break;
            }
            case 'venus': {
                // Vênus: duas faixas de nuvens quentes deslizam em sentidos opostos.
                const cloudA = Math.floor(tNow * 1.8) % 5;
                const cloudB = (5 - Math.floor(tNow * 1.25) % 5);
                rect(fx + 2 + cloudA, fy + 3, 2, 1, 'rgba(255, 241, 207, 0.62)');
                rect(fx + 2 + cloudB, fy + 6, 2, 1, 'rgba(255, 231, 181, 0.5)');
                if(Math.sin(tNow * 2.2) > 0.55) rect(fx + 4, fy + 2, 2, 1, 'rgba(255, 255, 235, 0.42)');
                break;
            }
            case 'earth': {
                // Terra: nuvens claras cruzam os continentes enquanto um satélite orbita.
                const cloudA = Math.floor(tNow * 1.5) % 5;
                const cloudB = (4 - Math.floor(tNow * 1.1) % 5);
                rect(fx + 2 + cloudA, fy + 3, 2, 1, 'rgba(220, 245, 255, 0.72)');
                rect(fx + 2 + cloudB, fy + 6, 2, 1, 'rgba(220, 245, 255, 0.58)');
                break;
            }
            case 'mars': {
                // Marte: partículas avermelhadas sobem em pequenos redemoinhos de poeira.
                const dustA = (tNow * 1.6) % 1;
                const dustB = (tNow * 1.15 + 0.42) % 1;
                rect(fx + 2 + Math.floor(tNow * 1.6) % 5, fy + 7 - Math.round(dustA * 5), 1, 1, '#ef7d57');
                rect(fx + 7 - Math.floor(tNow * 1.15) % 5, fy + 6 - Math.round(dustB * 4), 1, 1, 'rgba(239, 125, 87, 0.72)');
                break;
            }
            case 'jupiter': {
                // Júpiter: faixas atmosféricas cintilam e a Grande Mancha Vermelha pulsa.
                const bandY = fy + 3 + (Math.floor(tNow * 3) % 3) * 2;
                rect(fx + 3, bandY, 2, 1, '#fff7d6');
                const stormPulse = Math.sin(tNow * 3.1) > 0.1;
                rect(fx + 4, fy + 6, stormPulse ? 2 : 1, 1, stormPulse ? '#e6a0a0' : '#b13e53');
                break;
            }
            case 'saturn': {
                // Saturno: brilho discreto percorre o anel inclinado.
                for(let i = 0; i < 10; i++){
                    const ringY = fy + 6 + Math.round((i - 4.5) * 0.24);
                    rect(fx + i, ringY, 1, 1, i < 2 || i > 7 ? '#b88a55' : '#f1d39a');
                }
                const ringX = fx + (Math.floor(tNow * 2.4) % 10);
                rect(ringX, fy + 6 + Math.round(((ringX - fx) - 4.5) * 0.24), 1, 1, '#fff5d6');
                break;
            }
            case 'uranus': {
                // Urano: um anel inclinado aparece como dois arcos azulados em rotação lenta.
                const ringA = tNow * 0.9;
                const tilt = Math.sin(ringA) * 1.2;
                rect(cx - 4, cy - 1 + tilt, 2, 1, 'rgba(180, 242, 237, 0.9)');
                rect(cx + 3, cy + 1 - tilt, 2, 1, 'rgba(140, 232, 255, 0.82)');
                if(Math.sin(ringA * 1.7) > 0.72) rect(cx - 1, cy - 4, 2, 1, '#e2ffff');
                break;
            }
            case 'neptune': {
                // Netuno: correntes de vento azuladas atravessam a atmosfera em ritmos diferentes.
                const windA = Math.floor(tNow * 2.3) % 6;
                const windB = (5 - Math.floor(tNow * 1.7) % 6);
                rect(fx + 1 + windA, fy + 3, 2, 1, 'rgba(165, 219, 255, 0.88)');
                rect(fx + 1 + windB, fy + 7, 2, 1, 'rgba(140, 205, 255, 0.72)');
                break;
            }
        }
    }

    if(state === 'running' && snake.length){
        const h = snake[0];
        const ahead = (food.x - h.x) * dir.x + (food.y - h.y) * dir.y;
        const lateral = (food.x - h.x) * dir.y - (food.y - h.y) * dir.x;
        if(lateral === 0 && ahead >= 1 && ahead <= 6){
            const tc = food.gold ? 'rgba(255, 205, 117, 0.55)' : 'rgba(244, 244, 244, 0.36)';
            rect(fx, fy, 2, 1, tc); rect(fx, fy, 1, 2, tc);
            rect(fx + 8, fy, 2, 1, tc); rect(fx + 9, fy, 1, 2, tc);
            rect(fx, fy + 9, 2, 1, tc); rect(fx, fy + 8, 1, 2, tc);
            rect(fx + 8, fy + 9, 2, 1, tc); rect(fx + 9, fy + 8, 1, 2, tc);
        }
    }

    if(!opt.fx) return;

    if(food.gold){
        const pulse = Math.floor(tNow * 7) % 4;
        const flare = Math.sin(tNow * 5.2);
        // O Sol solta pequenas ondas de fogo em todas as direções, em intervalos curtos.
        const wavePeriod = 2.35;
        const wavePhase = (tNow + food.x * 0.13 + food.y * 0.17) % wavePeriod;
        if(wavePhase < 0.72){
            const progress = wavePhase / 0.72;
            const radius = 7.5 + progress * 2.6;
            const alpha = (1 - progress) * 0.34;
            for(let ray = 0; ray < 8; ray++){
                const angle = ray * Math.PI / 4 + Math.sin(tNow * 2.4 + ray) * 0.035;
                const px = Math.round(cx + Math.cos(angle) * radius);
                const py = Math.round(cy + Math.sin(angle) * radius);
                const horizontal = Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle));
                const flame = ray % 2 ? `rgba(237, 121, 45, ${alpha})` : `rgba(255, 184, 62, ${alpha})`;
                rect(px, py, horizontal ? 2 : 1, horizontal ? 1 : 2, flame);
                const innerR = radius - 1.8;
                const ix = Math.round(cx + Math.cos(angle) * innerR);
                const iy = Math.round(cy + Math.sin(angle) * innerR);
                rect(ix, iy, 1, 1, `rgba(255, 241, 189, ${alpha * 0.8})`);
            }
        }
        if(flare > 0.45) rect(cx - 8, cy, 1, 2, 'rgba(239, 125, 87, 0.62)');
        if(flare < -0.45) rect(cx + 8, cy - 1, 1, 2, 'rgba(255, 241, 189, 0.62)');
        if(pulse < 2) rect(cx - 1, cy - 1, 2, 2, P.white);
        const s1 = Math.floor(tNow * 6) % 5;
        const s2 = Math.floor(tNow * 6 + 2.5) % 5;
        drawSparkle(cx - 4, cy - 3, s1 < 3 ? s1 : -1, P.gold, true);
        drawSparkle(cx + 4, cy + 3, s2 < 3 ? s2 : -1, P.white, true);
        if(Math.floor(tNow * 4) % 2 === 0) rect(cx + 3, cy - 4, 1, 1, P.gold);
        else rect(cx - 3, cy + 4, 1, 1, P.gold);
    } else {
        const gleam = Math.floor(tNow * 2.8) % 6;
        if(gleam === 0 || gleam === 1){
            const pt = pl.spk[gleam];
            rect(fx + pt.x, fy + pt.y, 1, 1, P.white);
            if(gleam === 0) rect(fx + pt.x + 1, fy + pt.y, 1, 1, pl.glint);
        }
        const cycle = (tNow * 1.45 + (food.x * 0.37 + food.y * 0.53)) % 2.4;
        if(cycle < 0.55){
            const ph = cycle < 0.16 ? 0 : (cycle < 0.38 ? 1 : 0);
            const corner = Math.floor((tNow + food.x) * 0.6) % 2;
            const sx = corner === 0 ? fx + 8 : fx + 1;
            const sy = corner === 0 ? fy + 1 : fy + 8;
            drawSparkle(sx, sy, ph, pl.glint, false);
        }
    }
}

function render(dt){
    const s = dt / 1000;
    const arenaVX = state === 'running' ? -dir.x * (sprintActive ? 7.5 : 1.6) : -0.08;
    const arenaVY = state === 'running' ? -dir.y * (sprintActive ? 7.5 : 1.6) : -0.05;
    arenaParallaxX = Math.max(-3, Math.min(3, arenaParallaxX + arenaVX * s));
    arenaParallaxY = Math.max(-3, Math.min(3, arenaParallaxY + arenaVY * s));
    ctx.fillStyle = '#0c0f20';
    ctx.fillRect(0, 0, LW, LW);
    ctx.drawImage(bg, arenaParallaxX - 3, arenaParallaxY - 3, LW + 6, LW + 6);
    const moving = state === 'running';
    // O céu acompanha o deslocamento do jogador em velocidades distintas por profundidade.
    const starSpeed = moving ? (sprintActive ? 62 : 8.5) : 0.35;
    const vx = moving ? -dir.x * starSpeed : -0.35;
    const vy = moving ? -dir.y * starSpeed : -0.15;

    for(const st of STARS){
        st.x = ((st.x + vx * st.z * s) % LW + LW) % LW;
        st.y = ((st.y + vy * st.z * s) % LW + LW) % LW;
        if(st.tw && opt.fx && Math.sin(tNow * 2 + st.seed) < -0.4) continue;
        rect(st.x, st.y, 1, 1, st.c);
    }

    const outerMul = (scale || 2) / (outerScale || 2);
    renderOuterSpace(dt, vx * outerMul * 1.15, vy * outerMul * 1.15);

    const br = board.getBoundingClientRect();
    if(br.width > 0){
        const offX = br.left / scale, offY = br.top / scale;
        const coordScale = outerScale / scale;
        if(opt.fx && meteors.length){
            drawMeteors(ctx, meteors, coordScale, offX, offY);
        }
        if(bgShip){
            const ax = Math.round(bgShip.x * coordScale - offX);
            const ay = Math.round(bgShip.y * coordScale - offY);
            if(ax > -12 && ax < LW + 12 && ay > -8 && ay < LW + 8){
                drawBgShip(ctx, ax, ay, bgShip.dirX, bgShip.kind, bgShip.seed, true);
            }
        }
    }

    drawWormhole();
    drawFood();
    drawArenaShip();
    drawSprintGhosts();
    drawSnake();
    for(const p of parts){ if(p.t > p.life * 0.7 && Math.floor(p.t * 24) % 2) continue; rect(p.x, p.y, p.s, p.s, p.c); }
    if(opt.fx) for(const p of popups){ if(p.t > 0.5 && Math.floor(p.t * 20) % 2) continue; text(p.text, p.x, p.y - p.t * 8, p.gold ? P.gold : P.white); }

    wrap.classList.toggle('hit-white', opt.hit && hitFlash > 30 && hitKind === 'white');
    wrap.classList.toggle('hit-gold', opt.hit && hitFlash > 30 && hitKind === 'gold');
    wrap.classList.toggle('dashing', state === 'running' && sprintActive);

    const sh = opt.shake ? shake : 0;
    const hitShake = (opt.hit && freeze > 0) ? 1.5 : 0;
    const amp = Math.max(sh, hitShake);
    if(amp > 0.15){
        const ox = Math.round(rnd(-amp, amp)) * scale;
        const oy = Math.round(rnd(-amp, amp)) * scale;
        wrap.style.transform = 'translate(' + ox + 'px, ' + oy + 'px)';
    } else {
        wrap.style.transform = '';
    }
}

/* ===== HUD & Overlays ===== */
function updateHud(pop){
    $('#score').textContent = score; $('#best').textContent = best;
    $('#meterLabel').textContent = 'TAMANHO ' + snake.length;
    $('#comboMult').textContent = combo > 0 ? '×' + (combo + 1) + ' PONTOS' : '1× PONTOS';
    if(pop){ const v = $('#score'); v.classList.remove('pop'); void v.offsetWidth; v.classList.add('pop'); }
}
function showOverlay(title, textStr, btn, final){
    const ot = $('#ovTitle'), ox = $('#ovText'), sb = $('#startBtn'), of = $('#ovFinal'), ov = $('#overlay');
    if(ot) ot.textContent = title;
    if(ox) ox.textContent = textStr;
    if(sb){ sb.textContent = btn; sb.classList.toggle('hidden', !btn); }
    if(of) of.classList.toggle('hidden', !final);
    if(final){
        $('#fScore').textContent = score;
        $('#fBest').textContent = best;
        $('#fLen').textContent = lenAtDeath;
        $('#fCombo').textContent = maxCombo > 0 ? '×' + (maxCombo + 1) : '—';
    }
    if(ov) ov.classList.remove('hidden');
}
const hideOverlay = () => $('#overlay').classList.add('hidden');
function start(){
    if(!canRestart()) return;
    finished = false;
    initAudio();
    if(!matchStart || !embedded) matchStart = performance.now();
    reset();
    state = 'running';
    hideOverlay();
    sndStart();
}
function togglePause(){
    if(state === 'running'){ stopSprint(); state = 'paused'; showOverlay('PAUSADO', 'Respire um pouco.', 'CONTINUAR', false); }
    else if(state === 'paused'){ state = 'running'; hideOverlay(); }
}
function openSettings(){
    if(settingsOpen) return;
    settingsOpen = true;
    pausedBySettings = state === 'running';
    if(pausedBySettings){ stopSprint(); state = 'paused'; }
    $('#settings').classList.remove('hidden');
    $('#closeSettings').focus();
}
function closeSettings(){
    if(!settingsOpen) return;
    settingsOpen = false;
    $('#settings').classList.add('hidden');
    if(pausedBySettings){ pausedBySettings = false; showOverlay('PAUSADO', 'Respire um pouco.', 'CONTINUAR', false); }
}

let lastFrame = 0;
function loop(now){
    const rawDt = lastFrame ? Math.min(50, Math.max(0, now - lastFrame)) : 16.667;
    lastFrame = now;
    const dt = rawDt;
    const frameS = dt / 1000;
    tNow += frameS;

    // O planeta começa como um pequeno brilho e cresce até o sprite completo.
    // Antes, spawn era definido como 0 em placeFood(), mas nunca avançava para 1.
    if(food && food.spawn < 1){
        food.spawn = Math.min(1, food.spawn + dt / 360);
    }

    freeze = Math.max(0, freeze - dt);
    hitFlash = Math.max(0, hitFlash - dt);
    dashGainFlash = Math.max(0, dashGainFlash - frameS);
    sprintBurst = Math.max(0, sprintBurst - frameS);
    // A distorção entra rapidamente, mas continua se dissipando após soltar o dash.
    const warpTarget = sprintActive && opt.fx ? 1 : 0;
    const warpRate = warpTarget > sprintWarp ? 11.5 : 1.45;
    sprintWarp += (warpTarget - sprintWarp) * (1 - Math.exp(-warpRate * frameS));
    if(sprintWarp < 0.002) sprintWarp = 0;
    updateMusic(dt);

    // Cenário externo: naves distantes, minhocas de fundo e chuvas de meteoros.
    if(outerW && outerH){
        bgShipTimer -= frameS;
        if(!bgShip && bgShipTimer <= 0){
            const dirX = Math.random() < 0.5 ? 1 : -1;
            bgShip = {
                x: dirX > 0 ? -8 : outerW + 8,
                y: rnd(8, Math.max(9, outerH - 8)),
                dirX,
                kind: Math.floor(Math.random() * 2),
                seed: rnd(0, 100),
                speed: rnd(5, 10)
            };
            bgShipTimer = rnd(16, 28);
        }
        if(bgShip){
            bgShip.x += bgShip.dirX * bgShip.speed * frameS;
            if(bgShip.x < -12 || bgShip.x > outerW + 12) bgShip = null;
        }

        if(opt.fx){
            bgWormTimer -= frameS;
            if(!bgWorm && bgWormTimer <= 0) spawnBgWorm();
            if(bgWorm){
                bgWorm.x += bgWorm.vx * frameS;
                bgWorm.y += bgWorm.vy * frameS;
                if(bgWorm.x < -30 || bgWorm.y < -30 || bgWorm.x > outerW + 30 || bgWorm.y > outerH + 30){
                    bgWorm = null;
                    bgWormTimer = rnd(48, 82);
                }
            }

            meteorTimer -= frameS;
            if(meteorTimer <= 0){
                spawnMeteorShower();
                meteorTimer = rnd(15, 25);
            }
            for(let i = meteors.length - 1; i >= 0; i--){
                const m = meteors[i];
                if(m.delay > 0) m.delay = Math.max(0, m.delay - frameS);
                else {
                    m.t += frameS;
                    m.x += m.vx * frameS;
                    m.y += m.vy * frameS;
                }
                if(m.t >= m.life || m.x < -30 || m.y > outerH + 30 || m.x > outerW + 30) meteors.splice(i, 1);
            }
        }
    }

    // Ondas do buraco de minhoca avançam por frame; a digestão avança dentro de step().
    if(state === 'running' && freeze <= 0){
        const advance = dt / stepMs();
        for(let i = warpWaves.length - 1; i >= 0; i--){
            warpWaves[i].pos += advance;
            if(warpWaves[i].pos > snake.length + 2) warpWaves.splice(i, 1);
        }
    }

    // A nave calcula a proximidade de todo o corpo e também prevê a trajetória da cabeça.
    if(arenaShip && state === 'running'){
        const shipDt = frameS;
        if(arenaShip.warningT > 0){
            arenaShip.warningT = Math.max(0, arenaShip.warningT - shipDt);
            if(arenaShip.warningT <= 0 && snake[0] && arenaShip.x === snake[0].x && arenaShip.y === snake[0].y){
                eatArenaShip();
            } else if(arenaShip.warningT <= 0){
                bounceArenaShipFromBody();
            }
        } else {
            arenaShip.tilt *= Math.exp(-shipDt * 4.2);
            if(arenaShip.evadeCd > 0) arenaShip.evadeCd = Math.max(0, arenaShip.evadeCd - shipDt);

            const h = snake[0];
            const hx = h ? h.x * T + 5 : -999;
            const hy = h ? h.y * T + 5 : -999;
            const toShipX = arenaShip.px - hx;
            const toShipY = arenaShip.py - hy;
            const headForward = toShipX * dir.x + toShipY * dir.y;
            const headSide = toShipX * dir.y - toShipY * dir.x;
            const headThreat = !!h && headForward > 0 && headForward < 10 * T && Math.abs(headSide) < 2.0 * T;

            let nearestDist = Infinity;
            for(const seg of snake){
                const sx = seg.x * T + 5, sy = seg.y * T + 5;
                nearestDist = Math.min(nearestDist, Math.hypot(sx - arenaShip.px, sy - arenaShip.py));
            }
            const threatRange = 5.1 * T;
            const nearSnake = nearestDist < threatRange || headThreat;

            if(nearSnake && !arenaShip.evading){
                arenaShip.evading = true;
                sndShipWarn(arenaShip.x);
            } else if(!nearSnake && nearestDist > threatRange * 1.38){
                arenaShip.evading = false;
            }

            if(arenaShip.evading && arenaShip.evadeCd <= 0 && h){
                const dirs = [
                    { x: 1, y: 0 }, { x: -1, y: 0 },
                    { x: 0, y: 1 }, { x: 0, y: -1 }
                ];
                let bestDir = null, bestScore = -Infinity;

                for(const cand of dirs){
                    if(cand.x === -arenaShip.dx && cand.y === -arenaShip.dy) continue;
                    const testCx = Math.floor((arenaShip.px + cand.x * 16) / T);
                    const testCy = Math.floor((arenaShip.py + cand.y * 16) / T);
                    if(testCx < 1 || testCy < 1 || testCx >= N - 1 || testCy >= N - 1) continue;

                    let clearance = 100;
                    let risk = 0;
                    for(let sample = 1; sample <= 5; sample++){
                        const u = sample / 5;
                        const px = arenaShip.px + cand.x * sample * 12;
                        const py = arenaShip.py + cand.y * sample * 12;
                        const edge = Math.min(px, py, LW - px, LW - py);
                        if(edge < 16) risk += (16 - edge) * 2.8;

                        for(const seg of snake){
                            const sx = seg.x * T + 5, sy = seg.y * T + 5;
                            const d = Math.hypot(px - sx, py - sy);
                            clearance = Math.min(clearance, d);
                            if(d < 23) risk += (23 - d) * (6 - sample) * 0.62;
                        }

                        // Projeta a cabeça para a frente para não escolher uma rota que cruze com ela.
                        const headSpeed = sprintActive ? 88 : 50;
                        const futureHx = hx + dir.x * headSpeed * u;
                        const futureHy = hy + dir.y * headSpeed * u;
                        const headGap = Math.hypot(px - futureHx, py - futureHy);
                        if(headGap < 32) risk += (32 - headGap) * (6 - sample) * 0.92;
                    }

                    const continuity = (cand.x * arenaShip.vx + cand.y * arenaShip.vy) * 7;
                    const scorePath = clearance * 1.35 - risk + continuity;
                    if(scorePath > bestScore){ bestScore = scorePath; bestDir = cand; }
                }

                if(bestDir && (bestDir.x !== arenaShip.dx || bestDir.y !== arenaShip.dy)){
                    const cross = arenaShip.dx * bestDir.y - arenaShip.dy * bestDir.x;
                    arenaShip.tilt = cross !== 0 ? Math.sign(cross) * 2.3 : 0;
                    arenaShip.dx = bestDir.x;
                    arenaShip.dy = bestDir.y;
                    arenaShip.evadeCd = 0.30;
                    if(opt.fx) burst(arenaShip.px, arenaShip.py, [P.cyan, P.white, '#cdb2ff'], 8, 46);
                }
            }

            // A velocidade real acompanha a direção escolhida com aceleração e curva suaves.
            const turnEase = 1 - Math.exp(-shipDt * (arenaShip.evading ? 6.2 : 3.0));
            arenaShip.vx += (arenaShip.dx - arenaShip.vx) * turnEase;
            arenaShip.vy += (arenaShip.dy - arenaShip.vy) * turnEase;
            const vLen = Math.hypot(arenaShip.vx, arenaShip.vy) || 1;
            arenaShip.moveX = arenaShip.vx / vLen;
            arenaShip.moveY = arenaShip.vy / vLen;

            const targetSpeed = arenaShip.evading ? 55 : 34;
            arenaShip.speed += (targetSpeed - arenaShip.speed) * (1 - Math.exp(-shipDt * 3.4));
            arenaShip.px += arenaShip.moveX * arenaShip.speed * shipDt;
            arenaShip.py += arenaShip.moveY * arenaShip.speed * shipDt;
            arenaShip.x = Math.floor(arenaShip.px / T);
            arenaShip.y = Math.floor(arenaShip.py / T);

            // O propulsor deixa um rastro mais frequente e comprido durante a evasão.
            if(opt.fx){
                arenaShip.exhaustAcc += shipDt;
                const rate = arenaShip.evading ? 0.035 : 0.070;
                if(arenaShip.exhaustAcc >= rate){
                    arenaShip.exhaustAcc = 0;
                    parts.push({
                        x: arenaShip.px - arenaShip.moveX * 6 + rnd(-1, 1),
                        y: arenaShip.py - arenaShip.moveY * 6 + rnd(-1, 1),
                        vx: -arenaShip.moveX * rnd(18, 32) + rnd(-6, 6),
                        vy: -arenaShip.moveY * rnd(18, 32) + rnd(-6, 6),
                        c: arenaShip.evading ? P.cyan : P.orange,
                        t: 0, life: rnd(0.20, 0.34), s: 1
                    });
                }
            }

            if(arenaShip.px < -4 || arenaShip.py < -4 || arenaShip.px > LW + 4 || arenaShip.py > LW + 4){
                arenaShip = null;
                arenaShipTimer = rnd(20, 32);
            } else if(h && (
                (arenaShip.x === h.x && arenaShip.y === h.y) ||
                Math.hypot((h.x * T + 5) - arenaShip.px, (h.y * T + 5) - arenaShip.py) < 7.5
            )){
                eatArenaShip();
            } else {
                // Encostou no corpo (sem ser na cabeça): a nave ricocheteia e continua viva.
                bounceArenaShipFromBody();
            }
        }
    } else if(state === 'running'){
        arenaShipTimer -= frameS;
        if(arenaShipTimer <= 0) spawnArenaShip();
    }

    if(wormhole){
        if(!wormhole.born) wormhole.born = tNow;
        if(wormhole.spawn < 1) wormhole.spawn = Math.min(1, wormhole.spawn + dt / 360);
        if(!wormhole.closing){
            const expired = (tNow - wormhole.born) >= wormhole.life;
            const tailClear = wormhole.used && !snake.some(s => isPortalCell(s.x, s.y));
            if(expired || tailClear){
                wormhole.closing = true;
                wormhole.closeT = 0;
            }
        } else {
            wormhole.closeT += dt / 1000;
            if(wormhole.closeT >= 0.25){
                wormhole = null;
                wormholeTimer = rnd(26, 44);
            }
        }
    } else if(state === 'running'){
        wormholeTimer -= dt / 1000;
        if(wormholeTimer <= 0) spawnWormhole();
    }

    if(state === 'running'){
        if(sprintHeld && sprintActive){
            sprintEnergy = Math.max(0, sprintEnergy - (dt / 1000) / SPRINT_MAX);
            trailAcc += dt;
            if(trailAcc >= 45){
                trailAcc = 0;
                spawnSprintParticles(6);
                if(opt.fx){
                    sprintGhosts.push({ segs: snake.map(s => ({ x: s.x, y: s.y })), t: 0, life: 0.20 });
                    if(sprintGhosts.length > 2) sprintGhosts.shift();
                }
            }
            if(sprintEnergy <= 0) stopSprint();
        }

        const ms = stepMs();
        if(freeze > 0) acc = 0;
        else acc += dt;
        let n = 0;
        while(acc >= ms && state === 'running' && freeze <= 0 && n++ < 3){ acc -= ms; step(); }

        const left = 1 - (tNow - lastEat) / 2.6;
        $('#comboBadge').classList.toggle('on', combo > 0 && left > 0);
        $('#dashBadge').classList.toggle('dash-on', sprintActive || sprintEnergy >= 0.99);
        $('#dashBar').classList.toggle('gain', dashGainFlash > 0);
        $('#meterFill').style.width = Math.max(0, left * 100) + '%';
        $('#dashFill').style.width = Math.round(sprintEnergy * 100) + '%';
        if(left <= 0 && combo !== 0){ combo = 0; updateHud(); }
    } else if(state === 'dying'){
        dyingAcc += dt;
        while(dyingAcc >= 55 && snake.length){
            dyingAcc -= 55;
            const idx = dyingTotal - snake.length, seg = snake.shift();
            dissolve(seg, idx, dyingTotal);
        }
        if(!snake.length){
            overT += dt;
            if(overT > 1100){
                state = 'over';
                showOverlay('FIM DE JOGO', '', canRestart() ? 'DE NOVO' : '', true);
            }
        }
    }

    for(let i = popups.length - 1; i >= 0; i--){ popups[i].t += dt / 1000; if(popups[i].t > 0.8) popups.splice(i, 1); }
    shake *= Math.exp(-rawDt / 110);
    simulate(dt);
    render(dt);
    requestAnimationFrame(loop);
}

/* ===== Controles (Teclado, Gestos & Botões) ===== */
const DIRS = { arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 } };
window.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    if(settingsOpen){ if(k === 'escape'){ e.preventDefault(); closeSettings(); } return; }
    if(DIRS[k] || k === ' ') e.preventDefault();
    if(e.repeat) return;
    if(DIRS[k]){ if(state === 'idle') start(); setDir(DIRS[k]); }
    else if(k === 'p') togglePause();
    else if(k === 'o') openSettings();
    else if(k === 'm'){ muted = !muted; $('#optSound').checked = !muted; if(muted) stopSprintAudio(); else if(sprintActive) startSprintAudio(); }
    else if(k === 'f2'){ if(canRestart()) start(); }
    else if(k === ' '){
        if(!$('#overlay').classList.contains('hidden')) $('#startBtn').click();
        else if(state === 'running') startSprint();
    }
    else if(k === 'enter'){ if(!$('#overlay').classList.contains('hidden')) $('#startBtn').click(); }
});
window.addEventListener('keyup', e => {
    if((e.key || '').toLowerCase() === ' ') stopSprint();
});

let tg = null, dashPointerId = null;
document.addEventListener('pointerdown', e => {
    initAudio();
    if(opt.touch !== 'gestures' || e.pointerType !== 'touch' || tg || e.target.closest('button, select, .overlay, .top, .modal')) return;
    tg = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
document.addEventListener('pointermove', e => {
    if(!tg || e.pointerId !== tg.id) return;
    const dx = e.clientX - tg.x, dy = e.clientY - tg.y;
    if(Math.hypot(dx, dy) < 20) return;
    setDir(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
    tg.x = e.clientX; tg.y = e.clientY;
});
const endG = e => {
    if(tg && e.pointerId === tg.id) tg = null;
    if(dashPointerId !== null && e.pointerId === dashPointerId){
        dashPointerId = null;
        $('#touchDashBtn').classList.remove('on');
        stopSprint();
    }
};
document.addEventListener('pointerup', endG);
document.addEventListener('pointercancel', endG);

const touchDashBtn = $('#touchDashBtn');
touchDashBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    initAudio();
    if(state === 'idle') start();
    dashPointerId = e.pointerId;
    touchDashBtn.classList.add('on');
    startSprint();
});

const PAD = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
document.querySelectorAll('.tpb, .tpb-dash').forEach(b => {
    b.addEventListener('pointerdown', e => {
        e.preventDefault();
        initAudio();
        if(state === 'idle') start();
        if(b.dataset.act === 'dash') startSprint();
        else setDir(PAD[b.dataset.act]);
        b.classList.add('on');
    });
    const up = () => {
        b.classList.remove('on');
        if(b.dataset.act === 'dash') stopSprint();
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
});

$('#startBtn').addEventListener('click', () => { initAudio(); if(state === 'paused'){ state = 'running'; hideOverlay(); } else start(); });
$('#restartBtn').addEventListener('click', () => { initAudio(); if(canRestart()) start(); });
$('#pauseBtn').addEventListener('click', togglePause);
$('#settingsBtn').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', closeSettings);
$('#settings').addEventListener('click', e => { if(e.target === e.currentTarget) closeSettings(); });
document.querySelectorAll('.info').forEach(i => i.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); i.focus(); }));
document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => b.blur()));

const bind = (id, key, fn) => {
    const el = $(id);
    if(!el) return;
    el.checked = key === 'sound' ? !muted : (key === 'music' ? musicEnabled : opt[key]);
    el.addEventListener('change', () => {
        if(key === 'sound') muted = !el.checked;
        else if(key === 'music') musicEnabled = el.checked;
        else opt[key] = el.checked;
        if(fn) fn();
    });
};
bind('#optShake', 'shake', () => { if(!opt.shake){ shake = 0; wrap.style.transform = ''; } });
bind('#optFx', 'fx', () => { if(!opt.fx){ parts.length = 0; popups.length = 0; sprintGhosts.length = 0; meteors.length = 0; bgWorm = null; } });
bind('#optHit', 'hit', () => { if(!opt.hit){ freeze = 0; hitFlash = 0; } });
bind('#optSound', 'sound', () => { if(muted) stopSprintAudio(); else if(sprintActive) startSprintAudio(); });
bind('#optMusic', 'music');
$('#optTouch').addEventListener('change', e => {
    opt.touch = e.target.value;
    document.body.classList.toggle('tbtn', opt.touch === 'buttons');
    fitBoard();
});
window.addEventListener('blur', () => { stopSprint(); if(state === 'running') togglePause(); });
document.addEventListener('visibilitychange', () => { if(document.hidden){ stopSprint(); if(state === 'running') togglePause(); } });

/* ===== Escala inteira responsiva ===== */
function fitBoard(){
    const root = document.documentElement, st = document.querySelector('.stage'), gm = document.querySelector('.game');
    const maxS = Math.max(1, Math.min(5, Math.floor((window.innerWidth - 28) / LW)));
    for(let s = maxS; s >= 1; s--){
        root.style.setProperty('--bs', (LW * s) + 'px'); scale = s;
        const sr = st.getBoundingClientRect(); if(!sr.height) return;
        if(gm.getBoundingClientRect().bottom <= sr.bottom - (parseFloat(getComputedStyle(st).paddingBottom) || 0) + 0.5) break;
    }
    buildArenaBg();
    rebuildOuterSpace(false);
}
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', () => setTimeout(fitBoard, 200));

reset();
state = 'idle';
showOverlay('SPACE WORM', 'Devore planetas, estrelas e naves. Cresça.', 'Jogar', false);
fitBoard();
window.focus();
requestAnimationFrame(loop);
})();
