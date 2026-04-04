(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))a(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&a(r)}).observe(document,{childList:!0,subtree:!0});function l(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(t){if(t.ep)return;t.ep=!0;const o=l(t);fetch(t.href,o)}})();const Q=`#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`,ie=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

// 基本 uniform
uniform int   u_type;
uniform float u_time;
uniform bool  u_polarConversion;
uniform float u_params[16];

// UV Transform uniform
uniform float u_transform[5]; // ox, oy, sx, sy, rot
uniform vec2  u_scroll;       // scX, scY

// 後処理 uniform
uniform bool  u_invertEnable;

// カラー uniform

// グラジエント LUT uniform
uniform bool      u_gradEnable;    // グラジエントランプ有効フラグ
uniform sampler2D u_gradTex;       // 256x1 の LUT テクスチャ

// マルチレイヤー合成 uniform
uniform bool      u_isBaseLayer;
uniform sampler2D u_backTex;
uniform int       u_blendMode; // 0:Normal, 1:Add, 2:Multiply, 3:Screen, 4:Mask(Clip)
uniform float     u_opacity;
uniform bool      u_blackBackground;

uniform bool      u_solidColorEnabled;
uniform vec3      u_solidColor;

// ============================
// ユーティリティ関数
// ============================
float hash1(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash1v2(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.13);
    p3 += dot(p3, p3.yzx + 3.333);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2v2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                          dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// ============================
// ノイズ関数群
// ============================

// Value Noise
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash1v2(i + vec2(0,0)), hash1v2(i + vec2(1,0)), u.x),
               mix(hash1v2(i + vec2(0,1)), hash1v2(i + vec2(1,1)), u.x), u.y);
}

// Gradient Noise (Perlin-like)
float perlin(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash1v2(i + vec2(0,0)) * 6.2831853;
    float b = hash1v2(i + vec2(1,0)) * 6.2831853;
    float c = hash1v2(i + vec2(0,1)) * 6.2831853;
    float d = hash1v2(i + vec2(1,1)) * 6.2831853;
    float va = dot(vec2(cos(a), sin(a)), f - vec2(0,0));
    float vb = dot(vec2(cos(b), sin(b)), f - vec2(1,0));
    float vc = dot(vec2(cos(c), sin(c)), f - vec2(0,1));
    float vd = dot(vec2(cos(d), sin(d)), f - vec2(1,1));
    return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y) * 0.5 + 0.5;
}

// FBM (Fractal Brownian Motion)
float fbm(vec2 p, int octaves, float lacunarity, float gain) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 12; i++) {
        if (i >= octaves) break;
        value += amplitude * perlin(p * frequency);
        frequency *= lacunarity;
        amplitude *= gain;
    }
    return value;
}

// Simplex Noise 2D
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute3(vec3 x) { return mod289v3(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289v2(i);
    vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m * m * m;
    vec3 x2 = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x2) - 0.5;
    vec3 ox = floor(x2 + 0.5);
    vec3 a0 = x2 - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g) * 0.5 + 0.5;
}

// Voronoi Distance
float voronoiDist(vec2 p, float jitter) {
    vec2 pi = floor(p);
    vec2 pf = fract(p);
    float minDist = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 nb = vec2(float(x), float(y));
            vec2 pt = hash2v2(pi + nb) * jitter;
            vec2 diff = nb + pt - pf;
            minDist = min(minDist, dot(diff, diff));
        }
    }
    return sqrt(minDist);
}

// Voronoi Cell
float voronoiCell(vec2 p, float jitter) {
    vec2 pi = floor(p);
    vec2 pf = fract(p);
    float minDist = 8.0;
    vec2 minPt;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 nb = vec2(float(x), float(y));
            vec2 pt = hash2v2(pi + nb) * jitter;
            vec2 diff = nb + pt - pf;
            float d = dot(diff, diff);
            if (d < minDist) {
                minDist = d;
                minPt = hash2v2(pi + nb);
            }
        }
    }
    return hash1v2(minPt);
}

// ============================
// 各 Type 実装
// ============================

// 0: Circle (統合型 - subMode で 6 種類の円形エフェクトを切り替え)
// subMode: 0=Circle, 1=RadialGradient, 2=Vignette, 3=LensFlare, 4=Sun, 5=Solar
float typeCircle(vec2 uv, float mode) {
    int subMode = int(mode);
    float radius, softness, power, roundness, coronaSize, intensity;
    if (subMode == 0) {
        radius = u_params[0];
        softness = u_params[1];
        power = u_params[2];
    }
    else if (subMode == 1) {
        softness = u_params[0];
        power = u_params[1];
    }
    else if (subMode == 2) {
        radius = u_params[0];
        softness = u_params[1];
        power = u_params[2];
        roundness = u_params[3];
    }
    else if (subMode == 3) {
        radius = u_params[0];
        power = u_params[1];
        coronaSize = u_params[2];
    }
    else if (subMode == 4) {
        radius = u_params[0];
        coronaSize = u_params[1];
    }
    else if (subMode == 5) {
        power = u_params[0];
        intensity = u_params[1];
    }

    vec2  centered = uv - 0.5;
    float dist = length(centered) * 2.0;
    float val  = 0.0;

    if (subMode == 0) {
        // 〔Circle〕シンプルな円（旧 typeCircle）
        val = 1.0 - smoothstep(radius - softness * 0.3, radius + softness * 0.3, dist);
        val = pow(clamp(val, 0.0, 1.0), max(0.001, power));

    } else if (subMode == 1) {
        // 〔RadialGradient〕放射グラデーション（旧 typeRadialGradient）
        float offset = softness; // softness を offset として流用
        val = pow(clamp(1.0 - dist * 0.5 + offset * 0.5, 0.0, 1.0), max(0.001, power));

    } else if (subMode == 2) {
        // 〔Vignette〕ビネット（旧 typeVignette）
        // roundness: 1.0=真円, 0.0=画面端まで均等
        float aspect = mix(1.0, 0.0, 1.0 - roundness);
        vec2 p = centered * vec2(1.0, 1.0 + aspect * 0.5);
        float d2 = length(p) * 2.0;
        val = 1.0 - smoothstep(radius - softness * 0.5, radius + softness * 0.5, d2);
        val = pow(clamp(val, 0.0, 1.0), max(0.001, power));

    } else if (subMode == 3) {
        // 〔LensFlare〕レンズフレア（旧 typeLensFlare）
        float core = 1.0 - smoothstep(0.0, radius, dist);
        float glow = exp(-dist * coronaSize);
        val = pow(clamp(max(core, glow), 0.0, 1.0), max(0.001, power));

    } else if (subMode == 4) {
        // 〔Sun〕太陽（コア＋コロナ）（旧 typeSun）
        float core   = 1.0 - smoothstep(0.0, radius, dist);
        float corona = exp(-dist * coronaSize) * 0.8;
        val = clamp(max(core, corona), 0.0, 1.0);

    } else {
        // 〔Solar〕指数的減衰グロー（旧 typeSolar、subMode == 5）
        val = pow(max(0.0, 1.0 - dist), max(0.001, power)) * intensity;
        val = clamp(val, 0.0, 1.0);
    }
    return val;
}

// 1: Ring
float typeRing(vec2 uv) {
    float radius = u_params[0];
    float width  = u_params[1];
    float softness = u_params[2];
    float power  = u_params[3];
    float dist = length(uv - 0.5) * 2.0;
    float inner = smoothstep(radius - width - softness * 0.1, radius - width, dist);
    float outer = 1.0 - smoothstep(radius + softness * 0.1, radius + width + softness * 0.1, dist);
    return pow(clamp(inner * outer, 0.0, 1.0), max(0.001, power));
}

// 2: WaveRing (統合型 - subMode で波の形状を切り替え)
// subMode: 0=Sine波(従来), 1=ノイジー波, 2=角波(矩形), 3=二重リング
float typeWaveRing(vec2 uv, float mode) {
    int subMode = int(mode);
    float radius, width, frequency, amplitude, power, noiseScale;
    if (subMode == 0) {
        radius = u_params[0];
        width = u_params[1];
        frequency = u_params[2];
        amplitude = u_params[3];
        power = u_params[4];
    }
    else if (subMode == 1) {
        radius = u_params[0];
        width = u_params[1];
        amplitude = u_params[2];
        power = u_params[3];
        noiseScale = u_params[4];
    }
    else if (subMode == 2) {
        radius = u_params[0];
        width = u_params[1];
        frequency = u_params[2];
        amplitude = u_params[3];
        power = u_params[4];
    }
    else if (subMode == 3) {
        radius = u_params[0];
        width = u_params[1];
        frequency = u_params[2];
        amplitude = u_params[3];
        power = u_params[4];
    }
    vec2  centered   = uv - 0.5;
    float angle = atan(centered.y, centered.x);
    float dist  = length(centered) * 2.0;
    float val   = 0.0;

    if (subMode == 0) {
        // 〔Sine波〕従来のWaveRing
        // frequency を整数に丸めてシームレス化
        float freq = max(1.0, floor(frequency + 0.5));
        float waveR = radius + sin(angle * freq + u_time * 2.0) * amplitude;
        val = 1.0 - smoothstep(waveR - width * 0.5, waveR + width * 0.5, dist);

    } else if (subMode == 1) {
        // 〔ノイジー波〕シームレスノイズで変形
        // atan の -π/+π 境界不連続を避けるため sin/cos の円周座標でサンプリング
        // → 角度が一周したとき同じ座標に戻るため完全にシームレス
        vec2 circCoord = vec2(sin(angle), cos(angle)) * noiseScale;
        float n = snoise(circCoord + vec2(0.0, u_time * 0.5)) * amplitude;
        float waveR = radius + n;
        val = 1.0 - smoothstep(waveR - width * 0.5, waveR + width * 0.5, dist);

    } else if (subMode == 2) {
        // 〔角波（矩形波）〕ステップ状の波
        // frequency を整数に丸めてシームレス化
        float freq = max(1.0, floor(frequency + 0.5));
        float phase = fract(angle / (2.0 * 3.14159) * freq + u_time * 0.3);
        float stepWave = step(0.5, phase);
        float waveR = radius + (stepWave * 2.0 - 1.0) * amplitude;
        val = 1.0 - smoothstep(waveR - width * 0.5, waveR + width * 0.5, dist);

    } else {
        // 〔二重リング〕内外2本のリング
        // frequency を整数に丸めてシームレス化（-π/+π境界で連続になる）
        float freq1 = max(1.0, floor(frequency + 0.5));
        float freq2 = max(1.0, floor(frequency * 0.7 + 0.5));
        float w1 = radius + sin(angle * freq1 + u_time * 2.0) * amplitude;
        float w2 = radius * 1.4 + sin(angle * freq2 + u_time * 1.5) * amplitude;
        float v1 = 1.0 - smoothstep(w1 - width * 0.5, w1 + width * 0.5, dist);
        float v2 = 1.0 - smoothstep(w2 - width * 0.5, w2 + width * 0.5, dist);
        val = max(v1, v2);
    }
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 3: Gradation
float typeGradation(vec2 uv, float mode) {
    int subMode = int(mode);
    float angle, scale, offset, power;
    if (subMode == 0) {
        angle = u_params[0] * 3.14159265 / 180.0;
        scale = u_params[1];
        offset = u_params[2];
        power = u_params[3];
    }
    else if (subMode == 1) {
        angle = u_params[0] * 3.14159265 / 180.0;
        scale = u_params[1];
        offset = u_params[2];
        power = u_params[3];
    }
    else if (subMode == 2) {
        angle = u_params[0] * 3.14159265 / 180.0;
        scale = u_params[1];
        offset = u_params[2];
        power = u_params[3];
    }

    // 方向ベクトルの設定（angleによる回転）
    vec2 dir = vec2(cos(angle), sin(angle));

    // 内積でローカルな1D座標(v)を作る（-0.5 ～ 0.5 のuvと仮定した基準）
    // scaleを掛け、offsetを足す
    float v = dot(uv, dir) * scale + offset;

    float val = 0.0;
    if (subMode == 0) {
        // 0: Linear (clamp)
        val = clamp(v + 0.5, 0.0, 1.0);
    } else if (subMode == 1) {
        // 1: Reflect (PingPong: 0->1->0)
        // Triangle wave
        val = abs(fract(v) * 2.0 - 1.0);
    } else {
        // 2: Repeat (Sawtooth: 0->1, 0->1)
        val = fract(v);
    }
    
    return pow(val, max(0.001, power));
}

// 5: Wood
float typeWood(vec2 uv) {
    float frequency = u_params[0];
    float power     = u_params[1];
    float turbulence = u_params[2];
    float noise = fbm(uv * 3.0 + u_time * 0.05, 5, 2.0, 0.5) * turbulence;
    float dist  = length(uv - 0.5) * frequency;
    float val   = fract(dist + noise);
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 6: Checker (統合型 - subMode でスタイルを切り替え)
// subMode: 0=標準(従来), 1=グラデーションChecker, 2=丸みChecker, 3=ダイヤChecker
float typeChecker(vec2 uv, float mode) {
    int subMode = int(mode);
    float wX, wY, roundness;
    if (subMode == 0) {
        wX = u_params[0];
        wY = u_params[1];
    }
    else if (subMode == 1) {
        wX = u_params[0];
        wY = u_params[1];
    }
    else if (subMode == 2) {
        wX = u_params[0];
        wY = u_params[1];
        roundness = u_params[2];
    }
    else if (subMode == 3) {
        wX = u_params[0];
        wY = u_params[1];
        roundness = u_params[2];
    }
    vec2  grid     = floor(uv * vec2(wX, wY));
    float checker  = mod(grid.x + grid.y, 2.0); // 0.0 or 1.0

    if (subMode == 0) {
        // 〔標準〕バイナリチェッカー（従来）
        return checker;

    } else if (subMode == 1) {
        // 〔グラデーション〕セル内で距離グラデーション
        vec2 cell  = fract(uv * vec2(wX, wY));
        float dist = length(cell - 0.5) * 2.0;
        float grad = 1.0 - dist;
        return checker > 0.5 ? grad : 1.0 - grad;

    } else if (subMode == 2) {
        // 〔丸みChecker〕セル内に円を描画
        vec2  cell = fract(uv * vec2(wX, wY));
        float dist = length(cell - 0.5) * 2.0;
        float r    = mix(0.5, 1.0, roundness);
        float circle = 1.0 - smoothstep(r - 0.05, r, dist);
        return checker > 0.5 ? circle : 1.0 - circle;

    } else {
        // 〔ダイヤChecker〕45度回転したダイヤ形状
        vec2  cell = fract(uv * vec2(wX, wY)) - 0.5;
        float dist = abs(cell.x) + abs(cell.y); // L1距離
        float r    = mix(0.3, 0.5, roundness);
        float diamond = 1.0 - smoothstep(r - 0.02, r, dist);
        return checker > 0.5 ? diamond : 1.0 - diamond;
    }
}

// 7: Solar
float typeSolar(vec2 uv) {
    float intensity = u_params[0];
    float power     = u_params[1];
    float dist = length(uv - 0.5) * 2.0;
    float val  = pow(max(0.0, 1.0 - dist), max(0.001, power)) * intensity;
    return clamp(val, 0.0, 1.0);
}

// 8: Spark
float typeSpark(vec2 uv) {
    float intensity = u_params[0];
    float power     = u_params[1];
    float arms      = u_params[2];
    vec2  centered  = uv - 0.5;
    float angle = atan(centered.y, centered.x);
    float dist  = length(centered) * 2.0;
    float spark = pow(abs(cos(angle * arms)), power);
    float radial = max(0.0, 1.0 - dist);
    return clamp(spark * radial * intensity, 0.0, 1.0);
}

// 9: Flare
float typeFlare(vec2 uv) {
    float intensity = u_params[0];
    float power     = u_params[1];
    vec2  centered  = uv - 0.5;
    float dist = length(centered) * 2.0;
    float radial = max(0.0, 1.0 - dist);
    float l = length(centered) + 0.001;
    float streaksH = pow(max(0.0, 1.0 - abs(centered.y) / l * 2.0), power);
    float streaksV = pow(max(0.0, 1.0 - abs(centered.x) / l * 2.0), power);
    float val = max(streaksH, streaksV) * radial * intensity;
    return clamp(val, 0.0, 1.0);
}

// 10: Cross
float typeCross(vec2 uv) {
    float intensity = u_params[0];
    float power     = u_params[1];
    float width     = u_params[2];
    vec2  centered  = uv - 0.5;
    float crossH = exp(-abs(centered.y) / max(0.001, width * 0.1));
    float crossV = exp(-abs(centered.x) / max(0.001, width * 0.1));
    float dist = length(centered) * 2.0;
    float val  = max(crossH, crossV) * (1.0 - dist * 0.5) * intensity;
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 11: LensFlare
float typeLensFlare(vec2 uv) {
    float radius = u_params[0];
    float range  = u_params[1];
    float power  = u_params[2];
    vec2  centered = uv - 0.5;
    float dist = length(centered) * 2.0;
    float core = 1.0 - smoothstep(0.0, radius, dist);
    float glow = exp(-dist * range);
    float val  = max(core, glow);
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 12: Sun
float typeSun(vec2 uv) {
    float radius = u_params[0];
    float coronaSize = u_params[1];
    vec2  centered = uv - 0.5;
    float dist  = length(centered) * 2.0;
    float core  = 1.0 - smoothstep(0.0, radius, dist);
    float corona = exp(-dist * coronaSize) * 0.8;
    return clamp(max(core, corona), 0.0, 1.0);
}

// 13: Flower (FlowerFunのoffsetパラメータを統合)
float typeFlower(vec2 uv) {
    float petals    = u_params[0];
    float radius    = u_params[1];
    float offset    = u_params[2];
    float intensity = u_params[3];
    float power     = u_params[4];
    vec2  centered  = uv - 0.5;
    float angle = atan(centered.y, centered.x);
    float dist  = length(centered) * 2.0;
    // offsetによる捻り処理 (FlowerFun相当) を統合。offset=0なら従来のFlowerと同じ動作
    float petal = cos(angle * petals + offset * 3.14159) * 0.5 + 0.5;
    float val   = petal * (1.0 - smoothstep(0.0, radius, dist)) * intensity;
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 15: PerlinNoise
float typePerlinNoise(vec2 uv) {
    float frequency   = u_params[0];
    float octaves     = u_params[1];
    float persistence = u_params[2];
    float amplitude   = u_params[3];
    float val = fbm(uv * frequency + u_time * 0.1, int(octaves), 2.0, persistence) * amplitude;
    return clamp(val, 0.0, 1.0);
}

// 16: FbmNoise
float typeFbmNoise(vec2 uv) {
    float frequency  = u_params[0];
    float octaves    = u_params[1];
    float lacunarity = u_params[2];
    float gain       = u_params[3];
    float val = fbm(uv * frequency + u_time * 0.1, int(octaves), lacunarity, gain);
    return clamp(val, 0.0, 1.0);
}

// 17: VoronoiNoise
float typeVoronoiNoise(vec2 uv) {
    float scale  = u_params[0];
    float jitter = u_params[1];
    float power  = u_params[2];
    float val = voronoiDist(uv * scale + u_time * 0.1, jitter);
    val = clamp(val, 0.0, 1.0);
    return pow(val, max(0.001, power));
}

// 18: VoronoiCell
float typeVoronoiCell(vec2 uv) {
    float scale  = u_params[0];
    float jitter = u_params[1];
    return voronoiCell(uv * scale, jitter);
}

// 19: SimplexNoise
float typeSimplexNoise(vec2 uv) {
    float frequency = u_params[0];
    float octaves   = u_params[1];
    float val = 0.0;
    float amp  = 0.5;
    float freq = frequency;
    int oct = int(octaves);
    for (int i = 0; i < 8; i++) {
        if (i >= oct) break;
        val  += snoise(uv * freq + u_time * 0.05) * amp;
        freq *= 2.0;
        amp  *= 0.5;
    }
    return clamp(val, 0.0, 1.0);
}

// 20: MarbleNoise
float typeMarbleNoise(vec2 uv) {
    float scale      = u_params[0];
    float frequency  = u_params[1];
    float turbulence = u_params[2];
    float noise = fbm(uv * scale + u_time * 0.05, 6, 2.0, 0.5) * turbulence;
    float val   = sin((uv.x * frequency + noise) * 3.14159) * 0.5 + 0.5;
    return clamp(val, 0.0, 1.0);
}

// 21: Cell
float typeCell(vec2 uv) {
    float intensity = u_params[0];
    float size      = u_params[1];
    float power     = u_params[2];
    float v   = voronoiDist(uv * size + u_time * 0.05, 1.0);
    float val = (1.0 - clamp(v, 0.0, 1.0)) * intensity;
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 22: Lightning
float typeLightning(vec2 uv) {
    float intensity = u_params[0];
    float frequency = u_params[1];
    float width     = u_params[2];
    float xOffset = (fbm(vec2(uv.y * frequency, u_time), 5, 2.0, 0.5) - 0.5) * 0.4;
    float dist = abs(uv.x - 0.5 - xOffset);
    float bolt = 1.0 - smoothstep(0.0, width * 0.05, dist);
    return clamp(bolt * intensity, 0.0, 1.0);
}

// 23: Smoke
float typeSmoke(vec2 uv) {
    float volume = u_params[0];
    float beta   = u_params[1];
    float delta  = u_params[2];
    vec2 p = uv * volume;
    float n = fbm(p + u_time * 0.2, 6, 2.0, 0.5);
    float val = pow(n, beta) * delta * 10.0;
    return clamp(val, 0.0, 1.0);
}

// 24: Fire
float typeFire(vec2 uv) {
    float intensity = u_params[0];
    float strength  = u_params[1];
    float power     = u_params[2];
    float range     = u_params[3];
    float width     = u_params[4];
    vec2 p = (uv - vec2(0.5, 0.0)) * vec2(range / max(0.1, width), 1.0);
    float noise    = fbm(p * 3.0 + vec2(0.0, -u_time * 2.0), 6, 2.0, 0.5);
    float gradient = 1.0 - uv.y;
    float val = noise * gradient * strength * intensity;
    return clamp(pow(val, max(0.001, power)), 0.0, 1.0);
}

// 25: Flame
float typeFlame(vec2 uv) {
    float intensity = u_params[0];
    float width     = u_params[1];
    float scale     = u_params[2];
    vec2 p = (uv - 0.5) * vec2(1.0 / max(0.01, width), 1.0);
    float noise = fbm(p * scale + vec2(0.0, -u_time * 1.5), 4, 2.0, 0.5);
    float shape = max(0.0, 1.0 - length(p) * 2.0);
    return clamp(noise * shape * intensity, 0.0, 1.0);
}

// 26: Flash
float typeFlash(vec2 uv) {
    float frequency = u_params[0];
    float power     = u_params[1];
    float dist = length(uv - 0.5) * 2.0;
    float val  = sin(dist * frequency - u_time * 5.0) * 0.5 + 0.5;
    val *= (1.0 - dist);
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 27: Cloud
float typeCloud(vec2 uv) {
    float width      = u_params[0];
    float height     = u_params[1];
    float intensity  = u_params[2];
    float ambient    = u_params[3];
    float smoothness = u_params[4];
    vec2 p = (uv - 0.5) * vec2(1.0 / max(0.01, width), 1.0 / max(0.01, height));
    float n   = fbm(p * 3.0 + u_time * 0.05, 6, 2.0, 0.5);
    float val = smoothstep(1.0 - smoothness, 1.0, n) * intensity + ambient;
    return clamp(val, 0.0, 1.0);
}

// 28: Caustics
float typeCaustics(vec2 uv) {
    float scale = u_params[0];
    float speed = u_params[1];
    vec2 p = uv * scale;
    float t  = u_time * speed;
    float n1 = snoise(p + vec2(t * 0.7, t * 0.3));
    float n2 = snoise(p * 1.3 + vec2(-t * 0.4, t * 0.6));
    float n3 = snoise(p * 0.8 + vec2(t * 0.2, -t * 0.5));
    float val = (n1 * n2 * n3);
    return clamp(pow(val, 3.0), 0.0, 1.0);
}

// 29: WaterTurbulence
float typeWaterTurbulence(vec2 uv) {
    float scale     = u_params[0];
    float intensity = u_params[1];
    vec2 p  = uv * scale;
    float t = u_time * 0.3;
    float n = fbm(p + vec2(sin(t), cos(t)) * 0.5, 5, 2.0, 0.5);
    n += fbm(p * 2.1 + vec2(cos(t * 0.7), sin(t * 0.8)) * 0.3, 4, 2.0, 0.5) * 0.5;
    return clamp(n * intensity, 0.0, 1.0);
}

// 30: Electric
float typeElectric(vec2 uv) {
    float frequency = u_params[0];
    float scale     = u_params[1];
    float power     = u_params[2];
    vec2 p = uv * scale;
    float n   = fbm(p * frequency + u_time * 0.5, 4, 2.0, 0.5);
    float val = abs(n * 2.0 - 1.0);
    val = 1.0 - smoothstep(0.0, 0.1, val);
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 31: Energy
float typeEnergy(vec2 uv) {
    float power     = u_params[0];
    float density   = u_params[1];
    float thickness = u_params[2];
    float scale     = u_params[3];
    vec2 p    = (uv - 0.5) * scale;
    float dist  = length(p);
    float angle = atan(p.y, p.x);
    float wave  = sin(dist * density - u_time * 2.0 + angle * 3.0) * 0.5 + 0.5;
    float env   = 1.0 - smoothstep(0.0, 0.5, dist);
    float val   = pow(wave, max(0.001, thickness)) * env;
    return pow(clamp(val, 0.0, 1.0), max(0.001, power));
}

// 32: Squiggles
float typeSquiggles(vec2 uv) {
    float size    = u_params[0];
    float scale   = u_params[1];
    float density = u_params[2];
    vec2 p  = uv * scale;
    float n = fbm(p * size + u_time * 0.1, 4, 2.0, 0.5);
    float val = abs(sin(n * density * 6.2831853));
    val = 1.0 - smoothstep(0.4, 0.5, val);
    return clamp(val, 0.0, 1.0);
}

// 33: Speckle
float typeSpeckle(vec2 uv) {
    float radius  = u_params[0];
    float scale   = u_params[1];
    float density = u_params[2];
    vec2 p  = uv * scale;
    vec2 pi = floor(p);
    vec2 pf = fract(p);
    float val = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 nb = vec2(float(x), float(y));
            float cellHash = hash1v2(pi + nb + 999.0);
            if (cellHash > (1.0 - density)) {
                vec2 pt   = hash2v2(pi + nb);
                vec2 diff = pf - nb - pt;
                float d   = length(diff);
                val = max(val, 1.0 - smoothstep(0.0, radius * 0.3, d));
            }
        }
    }
    return clamp(val, 0.0, 1.0);
}

// 34: Grunge
float typeGrunge(vec2 uv) {
    float scale = u_params[0];
    float width = u_params[1];
    float alpha = u_params[2];
    vec2  p  = uv * scale;
    float n  = fbm(p, 8, 2.0, 0.5);
    float n2 = fbm(p * 1.7 + 5.3, 8, 2.0, 0.5);
    float val = abs(n - n2) * alpha;
    val = 1.0 - smoothstep(0.0, width * 0.1, val);
    return clamp(val, 0.0, 1.0);
}

// 35: HexGrid (統合型 - subMode: 0=通常グリッド, 1=RadialHex)
float typeHexGrid(vec2 uv, float mode) {
    int subMode = int(mode);
    float scale, lineWidth, smoothness;
    if (subMode == 0) {
        scale = u_params[0];
        lineWidth = u_params[1];
        smoothness = clamp(u_params[2], 0.0, 1.0);
    }
    else if (subMode == 1) {
        scale = u_params[0];
        lineWidth = u_params[1];
        smoothness = clamp(u_params[2], 0.0, 1.0);
    }

    if (subMode == 0) {
        // 〔通常のHexGrid〕
        vec2 p = uv * scale;
        const float sq3 = 1.7320508;
        vec2 r = vec2(1.0, sq3);
        vec2 h = r * 0.5;
        vec2 a = mod(p, r) - h;
        vec2 b = mod(p - h, r) - h;
        float dist = sqrt(min(dot(a, a), dot(b, b)));
        float val  = 1.0 - smoothstep(lineWidth * 0.3 - smoothness * 0.02,
                                        lineWidth * 0.3 + smoothness * 0.02,
                                        dist / 0.866);
        return clamp(val, 0.0, 1.0);
    } else {
        // 〔同心円状・RadialHex〕 旧RadialHex
        float rings = scale;
        vec2 p = uv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        float hexA = mod(a, 3.14159265 / 3.0) - 3.14159265 / 6.0;
        float dist = r * cos(hexA);
        float lineDist = abs(fract(dist * rings) - 0.5) * 2.0;
        float val = 1.0 - smoothstep(lineWidth - smoothness * 0.1, lineWidth + smoothness * 0.1, lineDist);
        return clamp(val, 0.0, 1.0);
    }
}

// 36: DiamondPattern
// 37: Spiral
float typeSpiral(vec2 uv) {
    float arms      = u_params[0];
    float tightness = u_params[1];
    float radius    = u_params[2];
    float width     = u_params[3];
    vec2  centered  = uv - 0.5;
    float dist  = length(centered);
    float angle = atan(centered.y, centered.x);
    float spiral = mod(angle / (2.0 * 3.14159) + dist * tightness - u_time * 0.3, 1.0 / arms);
    float val = 1.0 - smoothstep(0.0, width / arms, spiral);
    float env = 1.0 - smoothstep(0.0, radius, dist * 2.0);
    return clamp(val * env, 0.0, 1.0);
}

// 38: Ripple
float typeRipple(vec2 uv) {
    float ripRadius  = u_params[0];
    float frequency  = u_params[1];
    float amplitude  = u_params[2];
    float cx         = u_params[3];
    float cy         = u_params[4];
    vec2  center = vec2(cx, cy);
    float dist = length(uv - center);
    float val  = sin(dist * frequency - u_time * 3.0) * 0.5 + 0.5;
    float env  = 1.0 - smoothstep(0.0, ripRadius, dist);
    return clamp(val * env * amplitude, 0.0, 1.0);
}

// 39: Plasma
float typePlasma(vec2 uv) {
    float frequency  = u_params[0];
    float colorShift = u_params[1];
    float t = u_time * 0.5;
    float v = sin(uv.x * frequency + t);
    v += sin(uv.y * frequency + t);
    v += sin((uv.x + uv.y) * frequency * 0.7 + t * 1.3);
    v += sin(sqrt(dot(uv - 0.5, uv - 0.5)) * frequency + t);
    return sin(v * 3.14159 + colorShift) * 0.5 + 0.5;
}

// 40: Concentric
float typeConcentric(vec2 uv) {
    float frequency = u_params[0];
    float offset    = u_params[1];
    float softness  = u_params[2];
    float dist = length(uv - 0.5) * 2.0;
    float raw  = sin((dist + offset - u_time * 0.3) * frequency * 3.14159) * 0.5 + 0.5;
    float val  = smoothstep(0.5 - softness, 0.5 + softness, raw);
    float env  = 1.0 - dist * 0.5;
    return clamp(val * env, 0.0, 1.0);
}

// 41: StarBurst
float typeStarBurst(vec2 uv) {
    float points    = u_params[0];
    float radius    = u_params[1];
    float sharpness = u_params[2];
    vec2  centered  = uv - 0.5;
    float angle = atan(centered.y, centered.x);
    float dist  = length(centered) * 2.0;
    float star  = pow(abs(cos(angle * points * 0.5)), sharpness);
    return clamp(star * (1.0 - smoothstep(0.0, radius, dist)), 0.0, 1.0);
}

// 42: MetaBalls
float typeMetaBalls(vec2 uv) {
    float count     = u_params[0];
    float threshold = u_params[1];
    float radius    = u_params[2];
    float potential = 0.0;
    float n = min(count, 8.0);
    for (int i = 0; i < 8; i++) {
        if (float(i) >= n) break;
        float angle  = float(i) * 6.2831853 / n + u_time * 0.5;
        vec2  center = vec2(cos(angle), sin(angle)) * 0.3 + 0.5;
        float d = length(uv - center);
        potential += radius * radius / max(0.0001, d * d);
    }
    return clamp((potential - threshold) / threshold, 0.0, 1.0);
}

// 44: Wrinkle
float typeWrinkle(vec2 uv) {
    float scale    = u_params[0];
    float octaves  = u_params[1];
    float roughness= u_params[2];
    vec2  p = uv * scale;
    float n   = 0.0;
    float amp = 1.0;
    float freq= 1.0;
    int   oct = int(octaves);
    for (int i = 0; i < 10; i++) {
        if (i >= oct) break;
        float pn = perlin(p * freq);
        n   += abs(pn * 2.0 - 1.0) * amp;
        freq *= 2.0;
        amp  *= roughness;
    }
    return clamp(1.0 - n, 0.0, 1.0);
}

// 45: Fabric
float typeFabric(vec2 uv) {
    float warpFreq = u_params[0];
    float weftFreq = u_params[1];
    float mixRatio = u_params[2];
    float warp = sin(uv.y * warpFreq * 6.2831853) * 0.5 + 0.5;
    float weft = sin(uv.x * weftFreq * 6.2831853) * 0.5 + 0.5;
    return clamp(warp * (1.0 - mixRatio) + weft * mixRatio, 0.0, 1.0);
}

// 46: Crack
float typeCrack(vec2 uv) {
    float scale     = u_params[0];
    float threshold = u_params[1];
    float depth     = u_params[2];
    vec2  p = uv * scale;
    float v = voronoiDist(p, 1.0);
    float border = smoothstep(threshold - 0.05, threshold, v);
    return clamp(1.0 - border * depth, 0.0, 1.0);
}

// 48: Lava
float typeLava(vec2 uv) {
    float scale     = u_params[0];
    float threshold = u_params[1];
    float sharpness = u_params[2];
    vec2  p = uv * scale + u_time * 0.05;
    float n = fbm(p, 6, 2.0, 0.5);
    float lava = smoothstep(threshold - 0.05, threshold + 0.05, n);
    return clamp(pow(lava, max(0.001, sharpness)), 0.0, 1.0);
}

// 49: Matrix
float typeMatrix(vec2 uv) {
    float speed         = u_params[0];
    float density       = u_params[1];
    float glowIntensity = u_params[2];
    float colW  = 1.0 / max(1.0, density);
    float col   = floor(uv.x / colW);
    float phase = hash1(col) * 10.0;
    float dropY = fract(u_time * speed * 0.3 + phase);
    float headDist = abs(uv.y - dropY);
    float trail = max(0.0, 1.0 - (uv.y - dropY) * 5.0) * step(uv.y, dropY);
    float glow  = 1.0 - smoothstep(0.0, 0.04, headDist);
    return clamp(glow * glowIntensity + trail * 0.4, 0.0, 1.0);
}

// ============================
// メイン関数
// ============================
// 50: Star (SDF + Roundness + subMode)
// subMode: 0=塗りつぶし(従来), 1=減衰グロー, 2=アウトラインのみ
float typeStar(vec2 uv, float mode) {
    float points = max(3.0, floor(u_params[0]));
    float innerR = u_params[1];
    float outerR = max(u_params[2], innerR + 0.01);
    float innerRound = max(0.0, u_params[3]);
    float outerRound = max(0.0, u_params[4]);
    float angle = u_params[5] * 3.14159265 / 180.0;
    float glowPower = u_params[6];
    float outlineWidth = u_params[7];

    vec2 p = uv * 2.0 - 1.0;
    
    float armLength = outerR - innerR;
    float totalRequestedRound = innerRound + outerRound;
    float sc = 1.0;
    if (totalRequestedRound > armLength * 0.99) {
        sc = (armLength * 0.99) / totalRequestedRound;
    }
    
    float safeOuterRound = outerRound * sc;
    float safeInnerRound = innerRound * sc;
    
    float c = cos(angle), s = sin(angle);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    
    float seg = 6.2831853 / points;
    float halfSeg = seg * 0.5;
    
    float a = atan(p.x, -p.y);
    float local_a = mod(a + halfSeg, seg) - halfSeg;
    
    vec2 q = length(p) * vec2(sin(local_a), cos(local_a));
    q.x = abs(q.x);
    
    float delta = safeInnerRound - safeOuterRound;
    float baseOuterR = max(0.01, outerR + delta);
    float baseInnerR = max(0.005, innerR + delta);
    
    vec2 p1 = vec2(0.0, baseOuterR);
    vec2 p2 = vec2(sin(halfSeg) * baseInnerR, cos(halfSeg) * baseInnerR);
    
    vec2 v = p2 - p1;
    vec2 w = q - p1;
    float h = clamp(dot(w, v) / dot(v, v), 0.0, 1.0);
    float dLine = length(w - v * h);
    float signVal = sign(v.x * w.y - v.y * w.x);
    float dSharp = dLine * signVal;
    float d = dSharp - safeOuterRound + safeInnerRound;
    
    float softness = 0.005; 
    
    float fill = 0.0;
    if (outlineWidth > 0.0) {
        float edge = abs(d);
        fill = clamp(1.0 - smoothstep(0.0, outlineWidth, edge), 0.0, 1.0);
    } else {
        fill = clamp(1.0 - smoothstep(-softness, softness, d), 0.0, 1.0);
    }
    
    float glow = 0.0;
    if (glowPower > 0.0) {
        glow = exp(-max(0.0, d) * glowPower * 8.0);
    }
    
    return clamp(fill + glow * 0.7, 0.0, 1.0);
}


// 51: Polygon (統合型 - subMode で塗りスタイルを切り替え)
// subMode: 0=塗りつぶし(従来), 1=アウトラインのみ, 2=グロー
float typePolygon(vec2 uv, float mode) {
    float sides = max(3.0, floor(u_params[0]));
    float radius = u_params[1];
    float softness = u_params[2];
    float rotAngle = u_params[3] * 3.14159265 / 180.0;
    float glowPower = u_params[4];
    float outlineWidth = u_params[5];

    vec2 p = uv * 2.0 - 1.0;
    float c = cos(rotAngle), s = sin(rotAngle);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);

    float a = atan(p.x, p.y);
    float b = 6.2831853 / sides;
    float dist = cos(floor(0.5 + a / b) * b - a) * length(p);

    float fill = 0.0;
    if (outlineWidth > 0.0) {
        float edge = abs(dist - radius);
        fill = clamp(1.0 - smoothstep(0.0, outlineWidth, edge), 0.0, 1.0);
    } else {
        if (softness < 0.001) fill = dist > radius ? 0.0 : 1.0;
        else fill = clamp(1.0 - smoothstep(radius - softness, radius, dist), 0.0, 1.0);
    }

    float glow = 0.0;
    if (glowPower > 0.0) {
        glow = exp(-max(0.0, dist - radius) * glowPower * 5.0);
    }
    
    return clamp(fill + glow * 0.6, 0.0, 1.0);
}


// 52: Rectangle (統合型 - subMode で塗りスタイルを切り替え)
// subMode: 0=塗りつぶし(従来), 1=アウトラインのみ, 2=グロー, 3=ソフトグロー
float typeRectangle(vec2 uv, float mode) {
    float width = u_params[0];
    float height = u_params[1];
    float softness = u_params[2];
    float rotAngle = u_params[3] * 3.14159265 / 180.0;
    float cornerRadius = u_params[4];
    float glowPower = u_params[5];
    float outlineWidth = u_params[6];

    vec2 p = uv * 2.0 - 1.0;
    float c = cos(rotAngle), s = sin(rotAngle);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);

    vec2  halfSize = vec2(width * 0.5, height * 0.5);
    float cr  = min(cornerRadius * 0.5, min(halfSize.x, halfSize.y));
    vec2  q   = abs(p) - halfSize + cr;
    float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cr;

    float fill = 0.0;
    if (outlineWidth > 0.0) {
        float edge = abs(dist);
        fill = clamp(1.0 - smoothstep(0.0, outlineWidth, edge), 0.0, 1.0);
    } else {
        if (softness < 0.001) fill = dist > 0.0 ? 0.0 : 1.0;
        else fill = clamp(1.0 - smoothstep(-softness, 0.0, dist), 0.0, 1.0);
    }

    float glow = 0.0;
    if (glowPower > 0.0) {
        float glowDist = max(0.0, dist);
        glow = exp(-glowDist * glowPower * 5.0);
    }
    
    return clamp(fill + glow * 0.6, 0.0, 1.0);
}


// 53: Halo (後光 - リング状グロー)
float typeHalo(vec2 uv) {
    float ringRadius = u_params[0]; // リングの半径
    float ringWidth  = u_params[1]; // リングの太さ
    float glow       = u_params[2]; // 内側のコアグロー
    float power      = u_params[3]; // 山の髸さ
    float dist = length(uv - 0.5) * 2.0;
    // リング部分
    float ringVal = 1.0 - abs(dist - ringRadius) / max(0.001, ringWidth);
    ringVal = clamp(ringVal, 0.0, 1.0);
    ringVal = pow(ringVal, max(0.1, power));
    // 中心コアグロー
    float coreGlow = max(0.0, 1.0 - dist / max(0.001, ringRadius)) * glow;
    return clamp(ringVal + coreGlow, 0.0, 1.0);
}

// 54: RayBurst (放射光線)
float typeRayBurst(vec2 uv) {
    float rays     = u_params[0]; // 光線の本数
    float sharpness = u_params[1]; // 光線の锐さ
    float falloff  = u_params[2]; // 中心からの減衰
    float spin     = u_params[3]; // 回転角度
    float power    = u_params[4]; // 全体の強度
    vec2 centered = uv - 0.5;
    float dist  = length(centered);
    float angle = atan(centered.y, centered.x) + spin * 3.14159265 / 180.0;
    float rayVal = abs(sin(angle * rays * 0.5));
    rayVal = pow(rayVal, max(0.1, sharpness));
    float radial = pow(max(0.0, 1.0 - dist * 2.0 * falloff), 0.5);
    return clamp(pow(rayVal * radial, max(0.1, power)), 0.0, 1.0);
}

// 55: GodRay (ゴッドレイ - 方向性ビーム群)
float typeGodRay(vec2 uv) {
    float beams    = u_params[0]; // ビーム本数
    float angle    = u_params[1]; // 全体の角度（度）
    float spread   = u_params[2]; // 拡散幅
    float falloff  = u_params[3]; // 色褱
    float noise    = u_params[4]; // ノイズ量
    vec2 centered = uv - 0.5;
    float rad = angle * 3.14159265 / 180.0;
    vec2 dir = vec2(cos(rad), sin(rad));
    float along = dot(centered, dir);
    float perp  = abs(dot(centered, vec2(-dir.y, dir.x)));
    // ノイズでビームを分割
    float n = snoise(uv * (noise * 5.0 + 2.0) + u_time * 0.2) * 0.5 + 0.5;
    float beamWidth = spread / max(1.0, beams);
    float beamAngle = atan(perp, max(0.001, along + 0.5));
    float beamVal = 1.0 - smoothstep(0.0, beamWidth * (1.0 + n * 0.3), perp / max(0.001, along + 0.5));
    float beam = 0.0;
    for (int i = 0; i < 8; i++) {
        if (float(i) >= beams) break;
        float bAngle = float(i) * 3.14159265 * 2.0 / beams + rad;
        vec2 bDir = vec2(cos(bAngle), sin(bAngle));
        float bAlong = dot(centered, bDir);
        float bPerp  = abs(dot(centered, vec2(-bDir.y, bDir.x)));
        float w = spread * (1.0 + n * 0.2);
        float b = max(0.0, bAlong + 0.5) * clamp(1.0 - bPerp / max(0.001, w), 0.0, 1.0);
        beam = max(beam, b);
    }
    return clamp(beam * pow(max(0.0, 1.0 - length(centered) * 2.0), max(0.1, falloff)), 0.0, 1.0);
}

// 56: Bokeh (ボケ玉)
float typeBokeh(vec2 uv) {
    float count    = u_params[0]; // ボケ玉の数
    float radius   = u_params[1]; // 1つのボケ玉の半径
    float softness = u_params[2]; // ゼワさ
    float seed     = u_params[3]; // ランダムシード
    float glow     = u_params[4]; // 全体グロー
    float val = 0.0;
    for (int i = 0; i < 20; i++) {
        if (float(i) >= count) break;
        vec2 center = hash2v2(vec2(float(i), seed + 1.0)) * 0.8 + 0.1;
        float d = length(uv - center);
        float b = 1.0 - smoothstep(radius * 0.5 - softness * radius, radius * 0.5, d);
        // リング輝きのボケ玉
        float ring = 1.0 - abs(d - radius * 0.45) / (radius * 0.15 + 0.001);
        ring = clamp(ring, 0.0, 1.0) * 0.5;
        val = max(val, b + ring);
        // グロー
        float g = max(0.0, 1.0 - d / (radius * 2.0)) * glow;
        val = max(val, g);
    }
    return clamp(val, 0.0, 1.0);
}

// 57: Aurora (オーロラ)
float typeAurora(vec2 uv) {
    float bands    = u_params[0]; // 帯の数
    float height   = u_params[1]; // Y中心位置
    float width    = u_params[2]; // 帯の幅
    float speed    = u_params[3]; // アニメ速度
    float turbulence = u_params[4]; // うねり幅
    float val = 0.0;
    for (int i = 0; i < 6; i++) {
        if (float(i) >= bands) break;
        float fi = float(i);
        float yOff = height + fi * 0.12 - 0.06;
        float phase = fi * 1.7 + u_time * speed;
        float wave = snoise(vec2(uv.x * 3.0 + phase, fi * 2.0)) * turbulence * 0.3;
        float yDist = abs(uv.y - yOff - wave);
        float b = 1.0 - smoothstep(0.0, width * 0.12, yDist);
        b *= (sin(uv.x * 8.0 + fi * 2.3 + u_time * speed * 0.7) * 0.5 + 0.5);
        b *= (snoise(vec2(uv.x * 4.0, fi + u_time * 0.3)) * 0.5 + 0.5);
        val = max(val, b);
    }
    return clamp(val, 0.0, 1.0);
}

// 58: Shimmer (キラキラしたきめき)
float typeShimmer(vec2 uv) {
    float count  = u_params[0]; // 点の数
    float size   = u_params[1]; // 点の大きさ
    float speed  = u_params[2]; // 点滅の速度
    float power  = u_params[3]; // 輝腑強度
    float scale  = u_params[4]; // 全体分布
    float val = 0.0;
    for (int i = 0; i < 30; i++) {
        if (float(i) >= count) break;
        float fi = float(i);
        vec2 center = hash2v2(vec2(fi, 42.0)) * scale + (1.0 - scale) * 0.5;
        float flicker = sin(u_time * speed + fi * 3.7) * 0.5 + 0.5;
        flicker = pow(flicker, 3.0);
        float d = length(uv - center);
        float s = 1.0 - smoothstep(0.0, size * 0.04, d);
        // 十字形の輝き（Spark的）
        vec2 p = uv - center;
        float sparkH = exp(-abs(p.y) / max(0.001, size * 0.02)) * exp(-abs(p.x) / max(0.001, size * 0.1));
        float sparkV = exp(-abs(p.x) / max(0.001, size * 0.02)) * exp(-abs(p.y) / max(0.001, size * 0.1));
        float spark = max(sparkH, sparkV);
        val = max(val, (s + spark) * flicker * power);
    }
    return clamp(val, 0.0, 1.0);
}


// 59: SquareGrid (統合型 - subMode でグリッドスタイルを切り替え)
// subMode: 0=グリッド(従来), 1=ドット, 2=クロス, 3=ダッシュライン, 4=ランダムタイル, 5=水玉, 6=マトリクス
float typeSquareGrid(vec2 uv, float mode) {
    int subMode = int(mode);
    float scale, lineWidth, softness, dotRadius, intensity, power, width, scaleY, varNoise;
    if (subMode == 0) {
        scale = u_params[0];
        lineWidth = u_params[1];
        softness = clamp(u_params[2], 0.0, 1.0);
    }
    else if (subMode == 1) {
        scale = u_params[0];
        softness = clamp(u_params[1], 0.0, 1.0);
        dotRadius = u_params[2];
    }
    else if (subMode == 2) {
        scale = u_params[0];
        lineWidth = u_params[1];
        softness = clamp(u_params[2], 0.0, 1.0);
    }
    else if (subMode == 3) {
        scale = u_params[0];
        lineWidth = u_params[1];
        softness = clamp(u_params[2], 0.0, 1.0);
    }
    else if (subMode == 4) {
        scale = u_params[0];
        lineWidth = u_params[1];
        scaleY = max(1.0, u_params[2]);
        varNoise = u_params[3];
    }
    else if (subMode == 5) {
        scale = u_params[0];
        softness = clamp(u_params[1], 0.0, 1.0);
        dotRadius = u_params[2];
    }
    else if (subMode == 6) {
        scale = u_params[0];
        dotRadius = u_params[1];
        scaleY = max(1.0, u_params[2]);
        varNoise = u_params[3];
    }

    vec2  p = fract(uv * scale) - 0.5;
    vec2  d = abs(p);

    if (subMode == 0) {
        // 〔グリッド〕従来のSquareGrid（セルの辺ライン）
        float dist = max(d.x, d.y);
        return clamp(1.0 - smoothstep(0.5 - lineWidth - softness * 0.1, 0.5 - lineWidth + softness * 0.1, dist), 0.0, 1.0);

    } else if (subMode == 1) {
        // 〔ドット〕各セル中心に円を配置
        float dist = length(p);
        return clamp(1.0 - smoothstep(dotRadius - softness * 0.1, dotRadius + softness * 0.1, dist), 0.0, 1.0);

    } else if (subMode == 2) {
        // 〔クロス〕小さな十字
        float hLine = 1.0 - smoothstep(lineWidth - softness * 0.05, lineWidth + softness * 0.05, d.y);
        float vLine = 1.0 - smoothstep(lineWidth - softness * 0.05, lineWidth + softness * 0.05, d.x);
        return clamp(max(hLine, vLine), 0.0, 1.0);

    } else if (subMode == 3) {
        // 〔ダッシュライン〕断続線
        float t = fract(uv.x * scale * 2.0); // 中間点でON/OFF
        float hLine = 1.0 - smoothstep(lineWidth - softness * 0.05, lineWidth + softness * 0.05, d.y);
        hLine *= step(0.5, t); // 交互に点滅
        float vLine = 1.0 - smoothstep(lineWidth - softness * 0.05, lineWidth + softness * 0.05, d.x);
        return clamp(max(hLine, vLine), 0.0, 1.0);

    } else if (subMode == 4) {
        // 〔ランダムタイル〕旧TilePattern (scaleY, varNoise, lineWidth=borderを利用)
        vec2 tileUV = fract(uv * vec2(scale, scaleY));
        vec2 tileID = floor(uv * vec2(scale, scaleY));
        float v  = hash1v2(tileID) * varNoise;
        float edge = max(abs(tileUV.x - 0.5), abs(tileUV.y - 0.5));
        float val  = 1.0 - smoothstep(0.5 - lineWidth - v * 0.1, 0.5 - lineWidth * 0.5, edge);
        return clamp(val, 0.0, 1.0);

    } else if (subMode == 5) {
        // 〔水玉（千鳥配置）〕旧Polka
        vec2 pv = uv * scale;
        vec2 g1 = fract(pv) - 0.5;
        vec2 g2 = fract(pv - 0.5) - 0.5;
        float dist = min(length(g1), length(g2));
        float val = 1.0 - smoothstep(dotRadius - softness * 0.1, dotRadius + softness * 0.1, dist);
        return clamp(val, 0.0, 1.0);

    } else {
        // 〔ドットマトリクス〕旧DotMatrix (scale, scaleY, dotRadius, varNoiseを利用)
        vec2 pv = uv * vec2(scale, scaleY);
        vec2 pos = floor(pv);
        vec2 fractPos = fract(pv) - 0.5;
        float n = hash1v2(pos + vec2(u_time * 0.2, 0.0));
        float alpha = step(varNoise, n);
        float val = 1.0 - smoothstep(dotRadius - max(0.001, softness * 0.1), dotRadius + max(0.001, softness * 0.1), length(fractPos));
        return clamp(val * alpha, 0.0, 1.0);
    }
}

// 60: Lines (統合型 - subMode: 0=直線, 1=ジグザグ, 2=クロスハッチ)
float typeLines(vec2 uv, float mode) {
    int subMode = int(mode);
    float freq, angle1, lineWidth, softness, amp, angle2;
    if (subMode == 0) {
        freq = u_params[0];
        angle1 = u_params[1] * 3.14159265 / 180.0;
        lineWidth = u_params[2];
        softness = clamp(u_params[3], 0.0, 1.0);
    }
    else if (subMode == 1) {
        freq = u_params[0];
        angle1 = u_params[1] * 3.14159265 / 180.0;
        lineWidth = u_params[2];
        softness = clamp(u_params[3], 0.0, 1.0);
        amp = u_params[4];
    }
    else if (subMode == 2) {
        freq = u_params[0];
        angle1 = u_params[1] * 3.14159265 / 180.0;
        lineWidth = u_params[2];
        angle2 = u_params[3] * 3.14159265 / 180.0;
    }

    if (subMode == 0) {
        // 〔直線〕旧Lines
        float c = cos(angle1), s = sin(angle1);
        vec2 p = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
        float dist = abs(fract(p.x * freq) - 0.5) * 2.0;
        return clamp(1.0 - smoothstep(lineWidth - softness * 0.1, lineWidth + softness * 0.1, dist), 0.0, 1.0);
    } else if (subMode == 1) {
        // 〔ジグザグ〕旧Zigzag
        float c = cos(angle1), s = sin(angle1);
        vec2 uvRot = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
        float y = uvRot.y * freq;
        float z = abs(fract(uvRot.x * freq) - 0.5) * 2.0 * amp;
        float d = abs(fract(y) - 0.5 - z + amp*0.5) * 2.0;
        return clamp(1.0 - smoothstep(lineWidth - softness * 0.1, lineWidth + softness * 0.1, d), 0.0, 1.0);
    } else {
        // 〔クロスハッチ〕旧Crosshatch
        vec2 dir1 = vec2(cos(angle1), sin(angle1));
        vec2 dir2 = vec2(cos(angle2), sin(angle2));
        float l1 = abs(fract(dot(uv, dir1) * freq) - 0.5) * 2.0;
        float l2 = abs(fract(dot(uv, dir2) * freq) - 0.5) * 2.0;
        float v1 = 1.0 - smoothstep(lineWidth - softness * 0.1, lineWidth + softness * 0.1, l1);
        float v2 = 1.0 - smoothstep(lineWidth - softness * 0.1, lineWidth + softness * 0.1, l2);
        return clamp(max(v1, v2), 0.0, 1.0);
    }
}

// 62: TriGrid
float typeTriGrid(vec2 uv) {
    float scale = u_params[0];
    float lineWidth = u_params[1];
    vec2 p = uv * scale;
    const float sq3 = 1.7320508;
    vec2 p1 = p;
    vec2 p2 = vec2(p.x + p.y / sq3, p.y - p.x * sq3) * 0.5;
    vec2 p3 = vec2(p.x - p.y / sq3, p.y + p.x * sq3) * 0.5;
    float d1 = abs(fract(p1.y) - 0.5) * 2.0;
    float d2 = abs(fract(p2.y) - 0.5) * 2.0;
    float d3 = abs(fract(p3.y) - 0.5) * 2.0;
    float val1 = 1.0 - smoothstep(lineWidth, lineWidth + 0.05, d1);
    float val2 = 1.0 - smoothstep(lineWidth, lineWidth + 0.05, d2);
    float val3 = 1.0 - smoothstep(lineWidth, lineWidth + 0.05, d3);
    return clamp(max(max(val1, val2), val3), 0.0, 1.0);
}

// 63: RadialLines
float typeRadialLines(vec2 uv) {
    float rays = u_params[0];
    float width = u_params[1];
    float softness = u_params[2];
    float spin = u_params[3];
    vec2 centered = uv - 0.5;
    float angle = atan(centered.y, centered.x) + u_time * spin;
    float rayVal = abs(fract(angle * rays / 6.2831853) - 0.5) * 2.0;
    float val = 1.0 - smoothstep(width - softness * 0.1, width + softness * 0.1, rayVal);
    return clamp(val, 0.0, 1.0);
}

// 64: Swirl
float typeSwirl(vec2 uv) {
    float arms = u_params[0];
    float twist = u_params[1];
    float centerFocus = u_params[2];
    vec2 centered = uv - 0.5;
    float dist = length(centered);
    float angle = atan(centered.y, centered.x);
    float t = angle * arms + dist * twist * 10.0 - u_time * 2.0;
    float val = sin(t) * 0.5 + 0.5;
    float mask = pow(dist * 2.0, centerFocus);
    return clamp(val * mask, 0.0, 1.0);
}

// 65: PixelNoise
float typePixelNoise(vec2 uv) {
    float scale = u_params[0];
    float speed = u_params[1];
    vec2 p = floor(uv * scale);
    float val = hash1v2(p + floor(u_time * speed * 10.0));
    return clamp(val, 0.0, 1.0);
}

// 66: StripeNoise
float typeStripeNoise(vec2 uv) {
    float scaleX = u_params[0];
    float scaleY = u_params[1];
    float angle = u_params[2] * 3.14159265 / 180.0;
    float contrast = u_params[3];
    float c = cos(angle), s = sin(angle);
    vec2 p = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    p *= vec2(scaleX, scaleY);
    float val = fbm(p + u_time * 0.1, 4, 2.0, 0.5);
    return clamp((val - 0.5) * contrast + 0.5, 0.0, 1.0);
}

// 68: FlowLines
float typeFlowLines(vec2 uv) {
    float scale = u_params[0];
    float density = u_params[1];
    float speed = u_params[2];
    vec2 p = uv * scale;
    float n = fbm(p + u_time * speed, 4, 2.0, 0.5);
    float val = sin((uv.y * density + n) * 6.2831853) * 0.5 + 0.5;
    return clamp(pow(val, 2.0), 0.0, 1.0);
}

// 69: SymmetricNoise
float typeSymmetricNoise(vec2 uv) {
    float scale = u_params[0];
    float axes = max(1.0, u_params[1]);
    float speed = u_params[2];
    vec2 p = uv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float sector = 3.14159265 / axes;
    a = abs(fract(a / sector + 0.5) * sector - sector * 0.5);
    p = vec2(cos(a), sin(a)) * r;
    float n = fbm(p * scale + u_time * speed, 5, 2.0, 0.5);
    return clamp(n, 0.0, 1.0);
}

// 70: BevelSquare
float typeBevelSquare(vec2 uv) {
    float size = u_params[0];
    float bevel = u_params[1];
    float lightDir = u_params[2] * 3.14159265 / 180.0;
    vec2 p = uv * 2.0 - 1.0;
    vec2 d = abs(p) - vec2(size);
    float dist = max(d.x, d.y);
    float mask = 1.0 - smoothstep(0.0, 0.05, dist);
    
    vec2 normal;
    if (dist > -bevel) {
        normal = normalize(sign(p) * max(vec2(0.0), d + bevel));
    } else {
        normal = vec2(0.0, 0.0);
    }
    vec2 light = vec2(cos(lightDir), sin(lightDir));
    float lighting = dot(normal, light) * 0.5 + 0.5;
    return clamp(mix(1.0, lighting, smoothstep(-bevel, 0.0, dist)) * mask, 0.0, 1.0);
}

// 71: PyramidPattern
float typePyramidPattern(vec2 uv) {
    float scale = u_params[0];
    float depth = u_params[1];
    vec2 p = fract(uv * scale) - 0.5;
    float d = max(abs(p.x), abs(p.y));
    float val = 1.0 - d * 2.0 * depth;
    return clamp(val, 0.0, 1.0);
}

// 73: CellularEdge
float typeCellularEdge(vec2 uv) {
    float scale = u_params[0];
    float jitter = u_params[1];
    float thickness = u_params[2];
    vec2 p = uv * scale;
    vec2 pi = floor(p);
    vec2 pf = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 nb = vec2(float(x), float(y));
            vec2 pt = hash2v2(pi + nb) * jitter;
            vec2 diff = nb + pt - pf;
            float d = dot(diff, diff);
            if (d < d1) {
                d2 = d1;
                d1 = d;
            } else if (d < d2) {
                d2 = d;
            }
        }
    }
    float dist = sqrt(d2) - sqrt(d1);
    float val = 1.0 - smoothstep(thickness, thickness + 0.05, dist);
    return clamp(val, 0.0, 1.0);
}

// 74: Weave
float typeWeave(vec2 uv) {
    float scale = u_params[0];
    float width = u_params[1];
    float shadow = u_params[2];
    vec2 p = uv * scale;
    vec2 f = fract(p);
    vec2 i = floor(p);
    
    float parity = mod(i.x + i.y, 2.0);
    float v = 0.0;
    if (parity < 0.5) {
        float dx = abs(f.y - 0.5) * 2.0;
        float dy = abs(f.x - 0.5) * 2.0;
        if (dx < width) {
            v = 1.0 - dx * shadow;
        } else if (dy < width) {
            v = 0.5 - dy * shadow;
        }
    } else {
        float dx = abs(f.y - 0.5) * 2.0;
        float dy = abs(f.x - 0.5) * 2.0;
        if (dy < width) {
            v = 1.0 - dy * shadow;
        } else if (dx < width) {
            v = 0.5 - dx * shadow;
        }
    }
    return clamp(v, 0.0, 1.0);
}

// 75: SpiralV2
float typeSpiralV2(vec2 uv) {
    float arms = u_params[0];
    float power = u_params[1];
    float speed = u_params[2];
    vec2 centered = uv - 0.5;
    float r = length(centered);
    float a = atan(centered.y, centered.x);
    float v = sin(arms * a + log(r) * 10.0 * power + u_time * speed);
    return clamp(v * 0.5 + 0.5, 0.0, 1.0);
}

// 76: Scanline
float typeScanline(vec2 uv) {
    float count = u_params[0];
    float speed = u_params[1];
    float brightness = u_params[2];
    float y = uv.y * count + u_time * speed;
    float val = sin(y) * 0.5 + 0.5;
    return clamp(val * brightness, 0.0, 1.0);
}

// 78: Kaleido
float typeKaleido(vec2 uv) {
    float sides = u_params[0];
    float scale = u_params[1];
    float speed = u_params[2];
    vec2 p = uv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float pi2 = 6.2831853;
    float segment = pi2 / sides;
    a = mod(a, segment);
    a = abs(a - segment / 2.0);
    p = r * vec2(cos(a), sin(a));
    p *= scale;
    float val = snoise(p + u_time * speed) * 0.5 + 0.5;
    return clamp(val, 0.0, 1.0);
}

// 79: FractalCamo
float typeFractalCamo(vec2 uv) {
    float scale = u_params[0];
    float levels = u_params[1];
    float smoothness = u_params[2];
    vec2 p = uv * scale;
    float n = fbm(p, 6, 2.0, 0.5);
    n = n * levels;
    float level = floor(n);
    float f = smoothstep(0.0, smoothness, fract(n));
    float val = (level + f) / levels;
    return clamp(val, 0.0, 1.0);
}

// 81: SweepGradient
float typeSweepGradient(vec2 uv) {
    float turns = u_params[0];
    float offset = u_params[1] * 3.14159265 / 180.0;
    vec2 p = uv - 0.5;
    float a = atan(p.y, p.x) + offset;
    a = a / (2.0 * 3.14159265) + 0.5;
    float val = fract(a * turns);
    return clamp(val, 0.0, 1.0);
}

// 82: DiamondGrid (統合型 - subMode: 0=アウトライン, 1=塗りつぶし)
float typeDiamondGrid(vec2 uv, float mode) {
    int subMode = int(mode);
    float scale, lineWidth, softness;
    if (subMode == 0) {
        scale = u_params[0];
        lineWidth = u_params[1];
        softness = clamp(u_params[2], 0.0, 1.0);
    }
    else if (subMode == 1) {
        scale = u_params[0];
        lineWidth = u_params[1];
        softness = clamp(u_params[2], 0.0, 1.0);
    }

    if (subMode == 0) {
        // 〔アウトライン〕旧DiamondGrid
        vec2 p = uv * scale;
        vec2 p2 = vec2(p.x - p.y, p.x + p.y);
        float d1 = abs(fract(p2.x) - 0.5) * 2.0;
        float d2 = abs(fract(p2.y) - 0.5) * 2.0;
        float v1 = 1.0 - smoothstep(lineWidth - softness * 0.1, lineWidth + softness * 0.1, d1);
        float v2 = 1.0 - smoothstep(lineWidth - softness * 0.1, lineWidth + softness * 0.1, d2);
        return clamp(max(v1, v2), 0.0, 1.0);
    } else {
        // 〔塗りつぶし〕旧DiamondPattern
        vec2  p = uv * scale;
        vec2  a = abs(fract(p) - 0.5);
        float d = a.x + a.y;
        float val = 1.0 - smoothstep(lineWidth * 0.4 - softness * 0.1,
                                       lineWidth * 0.4 + softness * 0.1, d);
        return clamp(val, 0.0, 1.0);
    }
}

// 83: Bricks
float typeBricks(vec2 uv) {
    float cols = u_params[0];
    float rows = u_params[1];
    float mortar = u_params[2];
    float shift = u_params[3];
    vec2 p = uv * vec2(cols, rows);
    float yi = floor(p.y);
    float offset = mod(yi, 2.0) * shift;
    float x = p.x + offset;
    vec2 b = fract(vec2(x, p.y));
    vec2 d = min(b, 1.0 - b);
    float dist = min(d.x * rows / cols, d.y);
    float val = smoothstep(0.0, mortar, dist);
    return clamp(val, 0.0, 1.0);
}

// 84: ChainLink
float typeChainLink(vec2 uv) {
    float scale = u_params[0];
    float thickness = u_params[1];
    vec2 p = uv * scale;
    vec2 i = floor(p);
    vec2 f = fract(p) - 0.5;
    float dist = length(f) * 2.0;
    float hole = 1.0 - smoothstep(thickness, thickness + 0.1, dist);
    return clamp(hole, 0.0, 1.0);
}

// 85: PlasmaV2
float typePlasmaV2(vec2 uv) {
    float scale = u_params[0];
    float speed = u_params[1];
    float complexity = u_params[2];
    vec2 p = uv * scale;
    float t = u_time * speed;
    float v = 0.0;
    for(int i=0; i<5; i++) {
        if (float(i) >= complexity) break;
        v += sin(p.x + t);
        v += sin(p.y + t);
        t += 1.0;
        p = p * vec2(0.8, 1.2) + vec2(v);
    }
    v = sin(v * 3.14159) * 0.5 + 0.5;
    return clamp(v, 0.0, 1.0);
}

// 86: GrungeV2
float typeGrungeV2(vec2 uv) {
    float scale = u_params[0];
    float scratches = u_params[1];
    float spots = u_params[2];
    vec2 p = uv * scale;
    float np = fbm(p * 5.0, 6, 2.0, 0.5);
    float ns = snoise(p * vec2(10.0, 0.5));
    float scratchVal = smoothstep(1.0 - scratches, 1.0, abs(ns));
    float spotVal = smoothstep(1.0 - spots, 1.0, np);
    return clamp(max(scratchVal, spotVal), 0.0, 1.0);
}

// 87: Pulse
float typePulse(vec2 uv) {
    float freq = u_params[0];
    float width = u_params[1];
    float count = u_params[2];
    vec2 p = uv - 0.5;
    float t = u_time * freq;
    float r = length(p) * 2.0;
    float rings = fract(r * count - t);
    float val = 1.0 - abs(rings - 0.5) * 2.0;
    val = smoothstep(1.0 - width * 2.0, 1.0, val);
    return clamp(val, 0.0, 1.0);
}

// 88: Burst
float typeBurst(vec2 uv) {
    float rays = u_params[0];
    float noiseFreq = u_params[1];
    float power = u_params[2];
    vec2 p = uv - 0.5;
    float a = atan(p.y, p.x);
    float n = snoise(vec2(a * noiseFreq, u_time)) * 0.5 + 0.5;
    float val = abs(sin(a * rays/2.0 + n));
    val = pow(val, power);
    float r = length(p) * 2.0;
    return clamp(val * max(0.0, 1.0 - r + n*0.2), 0.0, 1.0);
}

// 89: Twirl
float typeTwirl(vec2 uv) {
    float strength = u_params[0];
    float radius = u_params[1];
    float baseScale = u_params[2];
    vec2 p = uv - 0.5;
    float dist = length(p);
    float angle = atan(p.y, p.x);
    float twirlAmount = strength * max(0.0, radius - dist) / radius;
    float newAngle = angle + twirlAmount;
    vec2 newP = vec2(cos(newAngle), sin(newAngle)) * dist;
    float val = fbm((newP + 0.5) * baseScale + u_time * 0.5, 4, 2.0, 0.5);
    return clamp(val, 0.0, 1.0);
}

// 90: Vignette
float typeVignette(vec2 uv) {
    float radius = u_params[0];
    float softness = u_params[1];
    float roundness = u_params[2];
    vec2 p = uv - 0.5;
    float lg = length(p);
    float bx = max(abs(p.x), abs(p.y));
    float dist = mix(bx, lg, roundness) * 2.0;
    float val = 1.0 - smoothstep(radius - softness, radius, dist);
    return clamp(val, 0.0, 1.0);
}

// 91: Halftone
float typeHalftone(vec2 uv) {
    float scale = u_params[0];
    float angle = u_params[1] * 3.14159265 / 180.0;
    float contrast = u_params[2];
    float c = cos(angle), s = sin(angle);
    vec2 p = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    p *= scale;
    float dotSize = (sin(p.x) * sin(p.y)) * 0.5 + 0.5;
    float img = uv.x * 0.5 + uv.y * 0.5;
    float val = smoothstep(img - contrast * 0.1, img + contrast * 0.1, dotSize);
    return clamp(val, 0.0, 1.0);
}

// 92: Mosaic
float typeMosaic(vec2 uv) {
    float blocksX = u_params[0];
    float blocksY = u_params[1];
    float scale = u_params[2];
    vec2 p = floor(uv * vec2(blocksX, blocksY)) / vec2(blocksX, blocksY);
    float val = fbm(p * scale + u_time * 0.1, 4, 2.0, 0.5);
    return clamp(val, 0.0, 1.0);
}

// 93: VoronoiFluid
float typeVoronoiFluid(vec2 uv) {
    float scale = u_params[0];
    float speed = u_params[1];
    float smoothness = u_params[2];
    vec2 p = uv * scale;
    float t = u_time * speed;
    vec2 pi = floor(p);
    vec2 pf = fract(p);
    float res = 8.0;
    for(int j=-1; j<=1; j++) {
        for(int i=-1; i<=1; i++) {
            vec2 b = vec2(float(i), float(j));
            vec2 pt = hash2v2(pi + b);
            pt = 0.5 + 0.5 * sin(t + 6.2831 * pt);
            vec2 r = vec2(b) - pf + pt;
            float d = dot(r, r);
            res = min(res, d);
        }
    }
    float val = smoothstep(0.0, smoothness, res);
    return clamp(1.0 - val, 0.0, 1.0);
}

// 94: Grain
float typeGrain(vec2 uv) {
    float strength = u_params[0];
    float speed = u_params[1];
    float n = hash1v2(uv + floor(u_time * speed * 10.0) * 0.1);
    float val = mix(0.5, n, strength);
    return clamp(val, 0.0, 1.0);
}

// 95: DistortionWave
float typeDistortionWave(vec2 uv) {
    float freq = u_params[0];
    float amp = u_params[1];
    float baseScale = u_params[2];
    vec2 p = uv;
    p.x += sin(p.y * freq + u_time * 2.0) * amp;
    p.y += cos(p.x * freq + u_time * 2.0) * amp;
    float val = fbm(p * baseScale, 5, 2.0, 0.5);
    return clamp(val, 0.0, 1.0);
}

// 96: PolarDots
float typePolarDots(vec2 uv) {
    float rings = u_params[0];
    float dots = u_params[1];
    float radius = u_params[2];
    vec2 p = uv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float ringIdx = floor(r * rings);
    float ringR = (ringIdx + 0.5) / rings;
    float dotSpacing = 3.14159265 * 2.0 / dots;
    float aIdx = floor(a / dotSpacing);
    float dotA = (aIdx + 0.5) * dotSpacing;
    vec2 center = vec2(cos(dotA), sin(dotA)) * ringR;
    float dist = length(p - center);
    float dotRad = radius / rings * 0.5;
    float val = 1.0 - smoothstep(dotRad - 0.01, dotRad, dist);
    val *= step(r, 0.5);
    return clamp(val, 0.0, 1.0);
}

// 98: Crystal
float typeCrystal(vec2 uv) {
    float scale = u_params[0];
    float jagged = u_params[1];
    float layers = u_params[2];
    vec2 p = uv * scale;
    float val = 0.0;
    float amp = 1.0;
    for(int i=0; i<5; i++) {
        if (float(i) >= layers) break;
        vec2 pi = floor(p);
        vec2 pf = fract(p);
        float d1 = 8.0;
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec2 nb = vec2(float(x), float(y));
                vec2 pt = hash2v2(pi + nb) * jagged;
                vec2 diff = nb + pt - pf;
                d1 = min(d1, max(abs(diff.x), abs(diff.y)));
            }
        }
        val += d1 * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return clamp(val, 0.0, 1.0);
}

// 99: AbsNoise
float typeAbsNoise(vec2 uv) {
    float scale = u_params[0];
    float power = u_params[1];
    float octaves = u_params[2];
    vec2 p = uv * scale + u_time * 0.5;
    float n = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    for(int i=0; i<8; i++) {
        if(float(i) >= octaves) break;
        n += abs(snoise(p * freq)) * amp;
        freq *= 2.0;
        amp *= 0.5;
    }
    return clamp(pow(n, power), 0.0, 1.0);
}

// 100: EnergyRing
float typeEnergyRing(vec2 uv) {
    float radius = u_params[0];
    float thickness = u_params[1];
    float noiseScale = u_params[2];
    float power = u_params[3];
    vec2 p = uv - 0.5;
    float angle = atan(p.y, p.x);
    // 円周上のノイズ
    float n = snoise(vec2(cos(angle), sin(angle)) * noiseScale + u_time * 2.0) * 0.5 + 0.5;
    float dist = length(p);
    // 半径をノイズで揺らす
    float r = radius + n * thickness;
    float lineDist = abs(dist - r);
    float val = thickness / (lineDist * 10.0 + thickness);
    return clamp(pow(val, power), 0.0, 1.0);
}

// 101: SparkBurst
float typeSparkBurst(vec2 uv) {
    float count = u_params[0];
    float speed = u_params[1];
    float len = u_params[2];
    float width = u_params[3];
    vec2 p = uv - 0.5;
    float angle = atan(p.y, p.x);
    float dist = length(p);
    
    // 角度を分割してパーティクルを配置
    float segment = floor(angle * count / 6.2831853);
    float segmentAngle = (segment + 0.5) * 6.2831853 / count;
    
    // 各パーティクルのランダムプロパティ
    float hash = hash1(segment);
    float timeOffset = hash * 10.0;
    float pSpeed = speed * (0.5 + hash * 0.5);
    
    // 進行度 (0.0 から 1.0 でループ)
    float progress = fract(u_time * pSpeed + timeOffset);
    // 中心から外へ移動
    float pRadius = progress * 1.5;
    
    // 角度のズレ (線の太さ)
    float angleDist = abs(angle - segmentAngle);
    // 距離のズレ (線の長さ)
    float radDist = abs(dist - pRadius);
    
    // 描画
    float val = smoothstep(width / dist, 0.0, angleDist); // 外側ほど太くならないように補正
    val *= smoothstep(len, 0.0, radDist);
    // フェードアウト
    val *= (1.0 - progress);
    
    // 中心付近の除外
    val *= smoothstep(0.0, 0.1, dist);

    return clamp(val, 0.0, 1.0);
}

// 102: Wormhole
float typeWormhole(vec2 uv) {
    float scale = u_params[0];
    float speed = u_params[1];
    float voidSize = u_params[2];
    float contrast = u_params[3];
    vec2 p = uv - 0.5;
    float dist = length(p);
    float angle = atan(p.y, p.x);

    // 吸い込まれるようなUV座標変形
    // 中心に近いほどスケールが大きくなり、角度がねじれる
    float twirl = 1.0 / (dist * 2.0 + 0.1);
    vec2 polarUv = vec2(
        1.0 / (dist + 0.01) * scale - u_time * speed * 2.0,
        angle * 2.0 + twirl - u_time * speed
    );

    float n = fbm(polarUv, 4, 2.0, 0.5);
    float val = pow(n, contrast);
    
    // 中心部分（ブラックホール）をくり抜く
    float mask = smoothstep(voidSize - 0.1, voidSize + 0.1, dist);
    
    return clamp(val * mask, 0.0, 1.0);
}

// 103: StarFlare
float typeStarFlare(vec2 uv) {
    float intensity = u_params[0];
    float spikeWidth = u_params[1];
    float spikeLen = u_params[2];
    float haloSize = u_params[3];
    
    vec2 p = uv - 0.5;
    float dist = length(p);
    
    // コアの光
    float core = clamp(0.02 / (dist * dist + 0.001), 0.0, 1.0);
    
    // 十字の光の筋 (スパイク)
    // x軸とy軸に沿った距離
    float dx = abs(p.x);
    float dy = abs(p.y);
    
    float spikeX = (spikeWidth / (dy * 50.0 + spikeWidth)) * max(0.0, 1.0 - dx / spikeLen);
    float spikeY = (spikeWidth / (dx * 50.0 + spikeWidth)) * max(0.0, 1.0 - dy / spikeLen);
    float spikes = spikeX + spikeY;

    // ハロ (周囲のぼやっとした光)
    float halo = smoothstep(haloSize, 0.0, dist) * 0.3;

    // またたき (フリッカー)
    float flicker = snoise(vec2(u_time * 5.0, 0.0)) * 0.1 + 0.9;

    float val = (core + spikes * 2.0 + halo) * intensity * flicker;
    return clamp(val, 0.0, 1.0);
}

// 104: ImpactLines
float typeImpactLines(vec2 uv) {
    float density = u_params[0];
    float len = u_params[1];
    float sharpness = u_params[2];
    float centerClear = u_params[3];

    vec2 p = uv - 0.5;
    float angle = atan(p.y, p.x);
    float dist = length(p);

    // 放射状の線 (1Dノイズっぽいもの)
    float n = hash1(floor(angle * density) / density);
    
    // ランダムなアニメーション（チカチカ入れ替わる）
    float t = floor(u_time * 15.0);
    float anim = hash1(n + t);

    // 線の太さ
    float line = smoothstep(sharpness * 0.1, 0.0, abs(fract(angle * density) - 0.5));

    // 各線の長さ (ランダム)
    float innerEdge = centerClear + anim * len;
    float mask = smoothstep(innerEdge - 0.05, innerEdge + 0.05, dist);

    float val = line * mask * (0.5 + anim * 0.5);
    return clamp(val, 0.0, 1.0);
}

// 105: AuraRing
float typeAuraRing(vec2 uv) {
    float radius = u_params[0];
    float thickness = u_params[1];
    float flameScale = u_params[2];
    float rayIntensity = u_params[3];

    vec2 p = uv - 0.5;
    float dist = length(p);
    float angle = atan(p.y, p.x);

    // リング本体の形（少し歪ませる）
    float distort = snoise(vec2(cos(angle), sin(angle)) * flameScale * 0.5 + u_time) * 0.1;
    float r = radius + distort * thickness;
    
    // ベースとなるリング
    float ring = thickness / (abs(dist - r) * 10.0 + thickness);

    // 炎状のモヤ
    vec2 noiseUv = vec2(angle * flameScale, dist * flameScale - u_time * 2.0);
    float flame = fbm(noiseUv, 3, 2.0, 0.5);
    
    // 放射状の光 (Ray)
    float rayNoise = hash1(floor(angle * 30.0) / 30.0);
    float ray = smoothstep(0.5, 1.0, flame) * (1.0 - dist) * rayIntensity * rayNoise;

    float val = ring * flame * 2.0 + ray;
    return clamp(val, 0.0, 1.0);
}

// 106: Crescent (統合型 - subMode でスタイルを切り替え)
// subMode: 0=従来, 1=内側グロー, 2=クレセント+リング
float typeCrescent(vec2 uv, float mode) {
    float radius = u_params[0];
    float innerRadius = u_params[1];
    float angle = u_params[2] * 3.14159265 / 180.0;
    float softness = u_params[3];
    float glowPower = u_params[4];
    float ringWidth = u_params[5];

    vec2 p = uv - 0.5;
    
    float dist1 = length(p);
    float val1 = 1.0 - smoothstep(radius - softness, radius, dist1);
    
    vec2 offset = vec2(cos(angle), sin(angle)) * (radius - innerRadius) * 0.5;
    float dist2 = length(p - offset);
    float val2  = smoothstep(innerRadius - softness, innerRadius, dist2);
    float fill  = val1 * val2;

    float glow = 0.0;
    if (glowPower > 0.0) {
        float innerEdgeDist = abs(dist2 - innerRadius);
        glow = exp(-innerEdgeDist * glowPower * 10.0) * val1;
    }

    float ring = 0.0;
    if (ringWidth > 0.0) {
        ring = 1.0 - smoothstep(radius - ringWidth, radius, dist1);
        ring -= 1.0 - smoothstep(radius - ringWidth * 2.0, radius - ringWidth, dist1);
    }

    return clamp(fill + glow * 0.8 + max(0.0, ring), 0.0, 1.0);
}


// 107: Glare
float typeGlare(vec2 uv) {
    float rays = u_params[0];
    float width = u_params[1];
    float len = u_params[2];
    float coreInt = u_params[3];

    vec2 p = uv - 0.5;
    float dist = length(p);
    float a = atan(p.y, p.x);
    
    // 中心点
    float core = clamp(0.1 / (dist * (20.0 - coreInt * 10.0) + 0.1), 0.0, 1.0);

    // スパイク
    float val = 0.0;
    for(float i=0.0; i<8.0; i++) {
        if(i >= rays) break;
        // 角度の設定
        float ang = a + i * 3.14159265 / rays;
        // 横にする
        float spikeDist = abs(sin(ang)) * dist;
        float spike = (width / (spikeDist * 100.0 + width)) * max(0.0, 1.0 - dist / len);
        val += spike;
    }
    
    val += core * coreInt;
    return clamp(val, 0.0, 1.0);
}

// 108: LaserBeam
float typeLaserBeam(vec2 uv) {
    float density = u_params[0];
    float speed = u_params[1];
    float heightVar = u_params[2];
    float glow = u_params[3];

    // 水平方向
    vec2 p = uv;
    
    // y軸ベースにノイズを生成し、直線を引く
    float yGrid = floor(p.y * density) / density;
    
    // その位置でのランダムジェネレータ
    float hash = hash1(yGrid);
    
    // 描画される線幅のバリエーション
    float h = mix(0.1, 1.0, hash) * heightVar;
    
    // 線の位置
    float lineDist = abs(fract(p.y * density) - 0.5);
    
    // 水平方向の動き
    float xMove = fract(p.x - u_time * speed * (hash - 0.5) * 2.0);
    // ランダムな破線にするためのX座標マスク
    float xMask = smoothstep(0.4, 0.6, hash1v2(vec2(floor(xMove * 5.0), yGrid)));

    float line = (0.01 / (lineDist * 5.0 / h + 0.01)) * xMask;
    
    // グロー
    float lGlow = smoothstep(0.5, 0.0, lineDist) * glow * xMask;

    return clamp(line + lGlow, 0.0, 1.0);
}

// 109: GlitchBlock
float typeGlitchBlock(vec2 uv) {
    float scaleX = u_params[0];
    float scaleY = u_params[1];
    float speed = u_params[2];
    float density = u_params[3];

    vec2 p = uv;
    // タイミングを離散的にする（カクカク動く）
    float t = floor(u_time * speed * 10.0) / 10.0;
    
    // ブロック単位の座標
    vec2 grid = vec2(
        floor(p.x * scaleX),
        floor(p.y * scaleY)
    );
    
    // 横方向に引き伸ばされたランダムノイズ
    float n = hash1v2(grid + vec2(t * 0.1, t));
    
    // しきい値でブロックをON/OFF
    float val = step(1.0 - density, n);
    
    // 薄いノイズも混ぜる
    val += smoothstep(1.0 - density * 1.5, 1.0, n) * 0.5;

    return clamp(val, 0.0, 1.0);
}

// -------------------------
// 110: AnalogGlitch (アナログ・VHS風横ノイズ)
// params: [0]lines, [1]speed, [2]glitchWidth, [3]sharpness
// -------------------------
float typeAnalogGlitch(vec2 uv) {
    float lines = max(1.0, u_params[0]);  // 走査線数
    float speed = u_params[1];
    float gWidth = u_params[2];
    float sharpness = max(0.1, u_params[3]);

    vec2 p = vec2(uv.x, floor(uv.y * lines) / lines);
    float t = u_time * speed + 1.0; // +1.0 でtime=0でもてきときにならない
    float r1 = hash1v2(vec2(p.y * 1.3, floor(t * 5.0) * 0.1));
    float r2 = hash1v2(vec2(p.y * 2.7, floor(t * 3.1) * 0.3));

    // 各行のランダムなXズレ
    float shift = (r1 - 0.5) * gWidth;
    // ノイズ値（snoiseは-1ひ1なのので渔標化）
    float noiseVal = snoise(vec2((uv.x + shift) * 3.0, p.y * 5.0 + t * 0.3)) * 0.5 + 0.5;
    // 毎行に別のノイズのブレンド
    float lineNoise = hash1v2(vec2(p.y * 5.0, t * 0.05)) * 0.5 + 0.3;
    
    float v = mix(lineNoise, noiseVal, 0.7);
    v = clamp(v, 0.0, 1.0);
    v = pow(v, 1.0 / sharpness);

    return clamp(v, 0.0, 1.0);
}

// -------------------------
// 111: CosmicPortal (宇宙の渦/ブラックホール)
// params: [0]zoom, [1]twist, [2]evoSpeed, [3]detail
// -------------------------
float typeCosmicPortal(vec2 uv) {
    float zoom = max(0.1, u_params[0]);
    float twist = u_params[1];
    float speed = u_params[2];
    float detail = max(0.1, u_params[3]);

    vec2 p = uv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);

    // 渦巻き表現
    float warpAngle = twist * exp(-r * 4.0);
    float ta = a + warpAngle;
    vec2 vortexUv = vec2(cos(ta), sin(ta)) * r * zoom;
    
    // FBMで星雲モヤ
    float t = u_time * speed;
    float n1 = fbm(vortexUv * 2.0 + vec2(0.3, 0.7) + t * 0.3, 4, 2.0, 0.5);
    float n2 = fbm(vortexUv * 3.5 + vec2(1.1, 2.3) - t * 0.2, 4, 2.0, 0.5);
    float n3 = fbm(vortexUv * 7.0 + vec2(3.7, 0.9) + t * 0.1, 4, 2.0, 0.5);

    float val = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;
    val = clamp(val, 0.0, 1.0);
    val = pow(val, 1.0 / detail);

    // 中心を少し陰にする
    float centerDark = 1.0 - smoothstep(0.0, 0.1, r);
    val = max(0.0, val - centerDark * 0.5);

    return clamp(val, 0.0, 1.0);
}

// -------------------------
// 112: CyberBlock (四角い集合ノイズ)
// params: [0]grid, [1]flashSpeed, [2]density, [3]blur
// -------------------------
float typeCyberBlock(vec2 uv) {
    float grid = max(1.0, u_params[0]);
    float speed = u_params[1];
    float density = u_params[2];
    float blur = u_params[3];

    vec2 p = uv * grid;
    vec2 id = floor(p);
    vec2 lp = fract(p);

    // 各セルにランダムな値
    float r = hash1v2(id);
    float t = u_time * speed;
    
    // ランダムな位相でサイン波（time=0でも各セルがバラバラな値を持つ）
    float appear = sin(t + r * 6.28318) * 0.5 + 0.5;
    
    // 出現率の閾値処理
    float v = smoothstep(1.0 - density, 1.0, appear);
    
    // エッジの処理（blur > 0 なら円滑な境界、それ以外はベタ層り）
    float blurAmt = max(blur, 0.01); // 少なくとも2pxのソフトエッジ
    float edgeD = min(min(lp.x, 1.0-lp.x), min(lp.y, 1.0-lp.y));
    v *= smoothstep(0.0, blurAmt, edgeD);
    
    return clamp(v, 0.0, 1.0);
}

// -------------------------
// 113: ToxicCloud (毒の雲・煙)
// params: [0]scale, [1]speed, [2]octaves, [3]softness
// -------------------------
float typeToxicCloud(vec2 uv) {
    float scale = max(0.1, u_params[0]);
    float speed = u_params[1];
    float octavesParam = u_params[2];
    float soft = max(0.01, u_params[3]);

    vec2 p = uv * scale;
    float t = u_time * speed;

    // octavesが0や未初期化のときも安全に動だす
    int oct = max(1, int(octavesParam));
    
    // Domain Warping
    vec2 q = vec2(
        fbm(p + vec2(1.7, 9.2), oct, 2.0, 0.5),
        fbm(p + vec2(8.3, 2.8), oct, 2.0, 0.5)
    );
    vec2 r = vec2(
        fbm(p + 4.0 * q + vec2(0.0, t * 0.5), oct, 2.0, 0.5),
        fbm(p + 4.0 * q + vec2(5.2, t * 0.3), oct, 2.0, 0.5)
    );
    float n = fbm(p + r * 3.0 + vec2(t * 0.2, 0.0), oct, 2.0, 0.5);
    n = clamp(n, 0.0, 1.0);
    
    float v = smoothstep(0.2, 0.9, n);
    v = pow(v, 1.0 / soft);
    
    return clamp(v, 0.0, 1.0);
}

// -------------------------
// 114: GeoRelief (地形・レリーフ風ノイズ)
// params: [0]scale, [1]elevation, [2]detail, [3]sharpness
// -------------------------
float typeGeoRelief(vec2 uv) {
    float scale = max(0.1, u_params[0]);
    float elev = max(0.01, u_params[1]);
    float detail = max(0.1, u_params[2]);
    float sharp = max(0.01, u_params[3]);

    vec2 p = uv * scale;
    float n = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    float maxAmp = 0.0;
    
    for (int i = 0; i < 5; i++) {
        // snoise は-1～1返すので、絕対値後に0～1になる
        float s = abs(snoise(p * freq + vec2(3.7, 1.3))); // 基準座標をオフセット
        s = 1.0 - s; // 谷を1、山をを0にリッジ化
        s = pow(s, detail);
        
        n += s * amp;
        maxAmp += amp;
        amp *= 0.5;
        freq *= 2.0;
    }
    n /= maxAmp;
    
    // 陰影（X方向のグラディエント近似）
    float eps = 0.01;
    float nR = 0.0; float amp2 = 1.0; float freq2 = 1.0; float maxA2 = 0.0;
    for (int i = 0; i < 5; i++) {
        float sx = abs(snoise((p + vec2(eps, 0.0)) * freq2 + vec2(3.7, 1.3))); sx = 1.0 - sx; sx = pow(sx, detail);
        nR += sx * amp2; maxA2 += amp2; amp2 *= 0.5; freq2 *= 2.0;
    }
    nR /= maxA2;
    float shadow = clamp((nR - n) * 8.0, -1.0, 1.0);
    
    float v = clamp(pow(n * elev, sharp) + shadow * 0.3, 0.0, 1.0);
    return v;
}

float getVal0(vec2 uv, int type) {
    float val = -1.0;
    if      (type == 0) val = typeCircle(uv, 0.0);
    else if (type == 201) val = typeCircle(uv, 2.0);
    else if (type == 202) val = typeCircle(uv, 3.0);
    else if (type == 203) val = typeCircle(uv, 4.0);
    else if (type == 204) val = typeCircle(uv, 5.0);
    else if (type == 232) val = typeRing(uv);
    else if (type == 233) val = typeWaveRing(uv, 0.0);
    else if (type == 205) val = typeWaveRing(uv, 1.0);
    else if (type == 206) val = typeWaveRing(uv, 2.0);
    else if (type == 207) val = typeWaveRing(uv, 3.0);
    else if (type == 3) val = typeGradation(uv, 0.0);
    else if (type == 208) val = typeGradation(uv, 1.0);
    else if (type == 209) val = typeGradation(uv, 2.0);
    else if (type == 234) val = typeWood(uv);
    else if (type == 235) val = typeChecker(uv, 0.0);
    else if (type == 210) val = typeChecker(uv, 1.0);
    else if (type == 211) val = typeChecker(uv, 2.0);
    else if (type == 212) val = typeChecker(uv, 3.0);
    else if (type == 236) val = typeSpark(uv);
    else if (type == 237) val = typeFlare(uv);
    else if (type == 10) val = typeCross(uv);
    else if (type == 222) val = typeSquareGrid(uv, 2.0);
    else if (type == 238) val = typeFlower(uv);
    else if (type == 15) val = typePerlinNoise(uv);
    else if (type == 239) val = typeFbmNoise(uv);
    else if (type == 240) val = typeVoronoiNoise(uv);
    else if (type == 241) val = typeVoronoiCell(uv);
    else if (type == 242) val = typeSimplexNoise(uv);
    else if (type == 243) val = typeMarbleNoise(uv);
    else if (type == 244) val = typeCell(uv);
    else if (type == 245) val = typeLightning(uv);
    else if (type == 246) val = typeSmoke(uv);
    else if (type == 247) val = typeFire(uv);
    else if (type == 248) val = typeFlame(uv);
    return val;
}

float getVal1(vec2 uv, int type) {
    float val = -1.0;
    if (type == 249) val = typeFlash(uv);
    else if (type == 27) val = typeCloud(uv);
    else if (type == 250) val = typeCaustics(uv);
    else if (type == 251) val = typeWaterTurbulence(uv);
    else if (type == 252) val = typeElectric(uv);
    else if (type == 253) val = typeEnergy(uv);
    else if (type == 254) val = typeSquiggles(uv);
    else if (type == 255) val = typeSpeckle(uv);
    else if (type == 256) val = typeGrunge(uv);
    else if (type == 213) val = typeHexGrid(uv, 1.0);
    else if (type == 258) val = typeSpiral(uv);
    else if (type == 38) val = typeRipple(uv);
    else if (type == 259) val = typePlasma(uv);
    else if (type == 260) val = typeConcentric(uv);
    else if (type == 261) val = typeStarBurst(uv);
    else if (type == 262) val = typeMetaBalls(uv);
    else if (type == 263) val = typeWrinkle(uv);
    else if (type == 264) val = typeFabric(uv);
    else if (type == 265) val = typeCrack(uv);
    else if (type == 266) val = typeLava(uv);
    else if (type == 267) val = typeMatrix(uv);
    else if (type == 50) val = typeStar(uv, 0.0);
    else if (type == 51) val = typePolygon(uv, 0.0);
    else if (type == 268) val = typeRectangle(uv, 0.0);
    else if (type == 269) val = typeHalo(uv);
    else if (type == 270) val = typeRayBurst(uv);
    return val;
}

float getVal2(vec2 uv, int type) {
    float val = -1.0;
    if (type == 271) val = typeGodRay(uv);
    else if (type == 272) val = typeBokeh(uv);
    else if (type == 273) val = typeAurora(uv);
    else if (type == 274) val = typeShimmer(uv);
    else if (type == 59) val = typeSquareGrid(uv, 0.0);
    else if (type == 221) val = typeSquareGrid(uv, 1.0);
    else if (type == 222) val = typeSquareGrid(uv, 2.0);
    else if (type == 223) val = typeSquareGrid(uv, 3.0);
    else if (type == 224) val = typeSquareGrid(uv, 4.0);
    else if (type == 225) val = typeSquareGrid(uv, 5.0);
    else if (type == 226) val = typeSquareGrid(uv, 6.0);
    else if (type == 227) val = typeLines(uv, 1.0);
    else if (type == 228) val = typeLines(uv, 2.0);
    else if (type == 276) val = typeTriGrid(uv);
    else if (type == 277) val = typeRadialLines(uv);
    else if (type == 278) val = typeSwirl(uv);
    else if (type == 279) val = typePixelNoise(uv);
    else if (type == 280) val = typeStripeNoise(uv);
    else if (type == 281) val = typeFlowLines(uv);
    else if (type == 282) val = typeSymmetricNoise(uv);
    else if (type == 283) val = typeBevelSquare(uv);
    else if (type == 284) val = typePyramidPattern(uv);
    else if (type == 285) val = typeCellularEdge(uv);
    else if (type == 286) val = typeWeave(uv);
    else if (type == 287) val = typeSpiralV2(uv);
    else if (type == 288) val = typeScanline(uv);
    else if (type == 289) val = typeKaleido(uv);
    else if (type == 290) val = typeFractalCamo(uv);
    else if (type == 291) val = typeSweepGradient(uv);
    else if (type == 293) val = typeBricks(uv);
    return val;
}

float getVal3(vec2 uv, int type) {
    float val = -1.0;
    if      (type == 295) val = typePlasmaV2(uv);
    else if (type == 296) val = typeGrungeV2(uv);
    else if (type == 297) val = typePulse(uv);
    else if (type == 298) val = typeBurst(uv);
    else if (type == 299) val = typeTwirl(uv);
    else if (type == 201) val = typeCircle(uv, 2.0);
    else if (type == 300) val = typeHalftone(uv);
    else if (type == 301) val = typeMosaic(uv);
    else if (type == 302) val = typeVoronoiFluid(uv);
    else if (type == 303) val = typeGrain(uv);
    else if (type == 304) val = typeDistortionWave(uv);
    else if (type == 305) val = typePolarDots(uv);
    else if (type == 306) val = typeCrystal(uv);
    else if (type == 307) val = typeAbsNoise(uv);
    else if (type == 308) val = typeEnergyRing(uv);
    else if (type == 309) val = typeSparkBurst(uv);
    else if (type == 310) val = typeWormhole(uv);
    else if (type == 311) val = typeStarFlare(uv);
    else if (type == 312) val = typeImpactLines(uv);
    else if (type == 313) val = typeAuraRing(uv);
    else if (type == 314) val = typeCrescent(uv, 0.0);
    else if (type == 315) val = typeGlare(uv);
    else if (type == 316) val = typeLaserBeam(uv);
    else if (type == 317) val = typeGlitchBlock(uv);
    else if (type == 110) val = typeAnalogGlitch(uv);
    else if (type == 318) val = typeCosmicPortal(uv);
    else if (type == 319) val = typeCyberBlock(uv);
    else if (type == 320) val = typeToxicCloud(uv);
    else if (type == 321) val = typeGeoRelief(uv);
    return val;
}

void main() {
    vec2 uv = v_uv;

    // 極座標変換
    if (u_polarConversion) {
        vec2 centered = uv - 0.5;
        float r     = length(centered) * 2.0;
        float theta = atan(centered.y, centered.x) / (2.0 * 3.14159) + 0.5;
        uv = vec2(r, theta);
    }

    // --- Transform & Scroll ---
    // [0] = ox, [1] = oy, [2] = sx, [3] = sy, [4] = rot
    // Scale & Offset (Center is 0.5, 0.5)
    uv -= 0.5;
    uv.x /= u_transform[2];
    uv.y /= u_transform[3];
    
    // Rotation
    float rot = u_transform[4] * 3.14159265 / 180.0;
    float c = cos(rot);
    float s = sin(rot);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    uv += 0.5;
    uv -= vec2(u_transform[0], u_transform[1]);

    // Time Scroll
    uv += u_scroll * u_time;


    float val = getVal0(uv, u_type);
    if (val < -0.5) val = getVal1(uv, u_type);
    if (val < -0.5) val = getVal2(uv, u_type);
    if (val < -0.5) val = getVal3(uv, u_type);
    if (val < -0.5) val = 0.0;


    val = clamp(val, 0.0, 1.0);

    // 反転
    if (u_invertEnable) val = 1.0 - val;

    vec3 col;
    if (u_gradEnable) {
        // グラジエント LUTサンプリング
        col = texture(u_gradTex, vec2(val, 0.5)).rgb;
    } else {
        col = vec3(val);
    }

    if (u_solidColorEnabled) {
        col *= u_solidColor;
    }

    // --- マルチレイヤー合成 ---
    // 形状の値 val 自体をレイヤーの基本アルファとして扱う
    // fg.rgb は unpremultiplied の計算結果 (col)
    float baseAlpha = clamp(val, 0.0, 1.0);
    vec4 fg = vec4(col, baseAlpha);
    
    // 現在のレイヤーのプレマルチプライド値を計算
    float a_fg = fg.a * u_opacity;
    vec4 fg_pre = vec4(fg.rgb * a_fg, a_fg);

    if (u_isBaseLayer) {
        // 一番下のレイヤー
        if (u_blackBackground) {
            // 黒背景と合成 (C_out = C_fg + 0, A_out = 1.0)
            fragColor = vec4(fg_pre.rgb, 1.0);
        } else {
            fragColor = fg_pre;
        }
    } else {
        // 背面レイヤーもプレマルチプライド状態で渡ってくる
        vec4 bg = texture(u_backTex, v_uv);
        
        if (u_blendMode == 0) {
            // 0: Normal -> C_out = C_fg + C_bg * (1 - A_fg)
            fragColor = fg_pre + bg * (1.0 - fg_pre.a);
        } else if (u_blendMode == 1) {
            // 1: Add -> C_out = C_fg + C_bg
            fragColor = min(vec4(1.0), fg_pre + bg);
        } else if (u_blendMode == 2) {
            // 2: Multiply
            // pre-multiplied multiply: C_out = C_fg * C_bg + C_fg*(1-A_bg) + C_bg*(1-A_fg)
            vec3 multRGB = fg_pre.rgb * bg.rgb + fg_pre.rgb * (1.0 - bg.a) + bg.rgb * (1.0 - fg_pre.a);
            float multA = fg_pre.a + bg.a * (1.0 - fg_pre.a);
            fragColor = vec4(multRGB, multA);
        } else if (u_blendMode == 3) {
            // 3: Screen
            vec3 screenRGB = fg_pre.rgb + bg.rgb - fg_pre.rgb * bg.rgb;
            float screenA = fg_pre.a + bg.a - fg_pre.a * bg.a;
            fragColor = vec4(screenRGB, screenA);
        } else if (u_blendMode == 4) {
            // 4: Mask (クリッピングマスク)
            // 下地のアルファとRGBを、Foregroundの形状(fg.a)に合わせて削る
            float maskRatio = mix(1.0, fg.a, u_opacity);
            fragColor = bg * maskRatio;
        } else {
            fragColor = bg;
        }
    }
}
`,O=["Circle","Vignette","LensFlare","Sun","SolarGlow","Ring","Crescent","Flash","EnergyRing","AuraRing","Halo","Ripple","Concentric","Pulse","MetaBalls","WaveRingSine","WaveRingNoisy","WaveRingSquare","WaveRingDouble","Star","Polygon","HexGridRadial","Rectangle","Checker","GradientChecker","RoundChecker","DiamondChecker","Spark","Flare","Cross","Glare","StarFlare","RayBurst","Burst","ImpactLines","RadialLines","SpiralV2","Swirl","GodRay","StarBurst","Flower","Spiral","Energy","Crack","Bokeh","Shimmer","VoronoiFluid","Speckle","CrossGrid","SquareGrid","PyramidPattern","RandomTiles","SquareGridDash","Dots","SquareGridPolka","DotMatrix","Zigzag","Crosshatch","TriGrid","Bricks","Scanline","FlowLines","Fabric","PolarDots","Weave","Halftone","SweepGradient","GradationLinear","GradationReflect","GradationRepeat","BevelSquare","Grain","PerlinNoise","FbmNoise","DistortionWave","StripeNoise","ToxicCloud","GeoRelief","Smoke","WaterTurbulence","Electric","SimplexNoise","Lava","Wrinkle","Crystal","AbsNoise","FractalCamo","PlasmaV2","Squiggles","Grunge","GrungeV2","CellularEdge","Twirl","CosmicPortal","Wormhole","Plasma","MarbleNoise","Fire","Cloud","Caustics","Aurora","Flame","PixelNoise","AnalogGlitch","CyberBlock","Mosaic","LaserBeam","GlitchBlock","VoronoiCell","Matrix","Wood","SparkBurst","VoronoiNoise","Cell","Lightning","Kaleido","SymmetricNoise"],re={Circle:0,Vignette:201,LensFlare:202,Sun:203,SolarGlow:204,Ring:232,WaveRingSine:233,WaveRingNoisy:205,WaveRingSquare:206,WaveRingDouble:207,GradationLinear:3,GradationReflect:208,GradationRepeat:209,Wood:234,Checker:235,GradientChecker:210,RoundChecker:211,DiamondChecker:212,Spark:236,Flare:237,Cross:10,CrossGrid:222,Flower:238,PerlinNoise:15,FbmNoise:239,VoronoiNoise:240,VoronoiCell:241,SimplexNoise:242,MarbleNoise:243,Cell:244,Lightning:245,Smoke:246,Fire:247,Flame:248,Flash:249,Cloud:27,Caustics:250,WaterTurbulence:251,Electric:252,Energy:253,Squiggles:254,Speckle:255,Grunge:256,HexGridRadial:213,Spiral:258,Ripple:38,Plasma:259,Concentric:260,StarBurst:261,MetaBalls:262,Wrinkle:263,Fabric:264,Crack:265,Lava:266,Matrix:267,Star:50,Polygon:51,Rectangle:268,Halo:269,RayBurst:270,GodRay:271,Bokeh:272,Aurora:273,Shimmer:274,SquareGrid:59,Dots:221,SquareGridDash:223,RandomTiles:224,SquareGridPolka:225,DotMatrix:226,Zigzag:227,Crosshatch:228,TriGrid:276,RadialLines:277,Swirl:278,PixelNoise:279,StripeNoise:280,FlowLines:281,SymmetricNoise:282,BevelSquare:283,PyramidPattern:284,CellularEdge:285,Weave:286,SpiralV2:287,Scanline:288,Kaleido:289,FractalCamo:290,SweepGradient:291,Bricks:293,PlasmaV2:295,GrungeV2:296,Pulse:297,Burst:298,Twirl:299,Halftone:300,Mosaic:301,VoronoiFluid:302,Grain:303,DistortionWave:304,PolarDots:305,Crystal:306,AbsNoise:307,EnergyRing:308,SparkBurst:309,Wormhole:310,StarFlare:311,ImpactLines:312,AuraRing:313,Crescent:314,Glare:315,LaserBeam:316,GlitchBlock:317,AnalogGlitch:110,CosmicPortal:318,CyberBlock:319,ToxicCloud:320,GeoRelief:321},de=`#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_mainTex;
uniform float u_time;
uniform vec2 u_resolution;

// Effects toggles and params
uniform bool u_blurEnabled;
uniform float u_blurStrength;
uniform bool u_bloom_en;
uniform float u_bloom_st;
uniform bool u_sharpenEnabled;
uniform float u_sharpenStrength;

uniform bool u_pixelationEnabled;
uniform float u_pixelSize;

uniform bool u_chromaticAberrationEnabled;
uniform float u_chromaticAberration;

uniform bool u_vignetteEnabled;
uniform float u_vignetteStrength;
uniform float u_vignetteSize;
uniform vec3 u_vignetteColor;

uniform bool u_scanlineEnabled;
uniform float u_scanlineDensity;
uniform float u_scanlineSpeed;
uniform float u_scanlineStrength;
uniform vec3 u_scanlineColor;

uniform bool u_kaleidoscopeEnabled;
uniform float u_kaleidoSegments;
uniform float u_kaleidoRotation;

uniform bool u_mirrorTileEnabled;
uniform bool u_mirrorTileX;
uniform bool u_mirrorTileY;

uniform bool u_swirlEnabled;
uniform float u_swirlStrength;
uniform float u_swirlRadius;

uniform bool u_edgeDetectionEnabled;
uniform float u_edgeThickness;
uniform vec3 u_edgeColor;

uniform bool u_toonEnabled;
uniform float u_toonDark;
uniform float u_toonLight;

uniform bool u_vignetteMaskEnabled;

uniform bool u_colorEnabled;
uniform vec3 u_colorShadow;
uniform vec3 u_colorMidtone;
uniform vec3 u_colorHighlight;

out vec4 fragColor;

vec2 swirl(vec2 uv, float radius, float strength) {
    vec2 pos = uv - 0.5;
    float dist = length(pos);
    if(dist < radius) {
        float percent = (radius - dist) / radius;
        float theta = percent * percent * strength;
        float s = sin(theta);
        float c = cos(theta);
        pos = vec2(dot(pos, vec2(c, -s)), dot(pos, vec2(s, c)));
    }
    return pos + 0.5;
}

vec2 kaleidoscope(vec2 uv, float segments, float rotation) {
    vec2 p = uv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float angle = 3.14159265 * 2.0 / segments;
    a = mod(a, angle);
    a = abs(a - angle/2.0);
    a += rotation;
    return vec2(cos(a), sin(a)) * r + 0.5;
}

vec2 mirrorTile(vec2 uv, bool mirrorX, bool mirrorY) {
    vec2 p = uv;
    if (mirrorX) p.x = p.x > 0.5 ? 1.0 - p.x : p.x;
    if (mirrorY) p.y = p.y > 0.5 ? 1.0 - p.y : p.y;
    return p;
}

void main() {
    vec2 uv = v_uv;
    
    // UV manipulations
    if (u_mirrorTileEnabled) {
        uv = mirrorTile(uv, u_mirrorTileX, u_mirrorTileY);
    }
    
    if (u_kaleidoscopeEnabled) {
        uv = kaleidoscope(uv, u_kaleidoSegments, u_kaleidoRotation);
    }
    
    if (u_swirlEnabled) {
        uv = swirl(uv, u_swirlRadius, u_swirlStrength);
    }
    
    if (u_pixelationEnabled) {
        float ds = max(1.0, u_pixelSize);
        uv = floor(uv * ds) / ds;
    }
    
    vec4 col = texture(u_mainTex, uv);
    
    if (u_chromaticAberrationEnabled) {
        float r = texture(u_mainTex, uv + vec2(u_chromaticAberration, 0.0)).r;
        float b = texture(u_mainTex, uv - vec2(u_chromaticAberration, 0.0)).b;
        col.r = r;
        col.b = b;
    }
    
    if (u_blurEnabled) {
        vec2 d = 1.0 / u_resolution * u_blurStrength;
        vec4 blurCol = vec4(0.0);
        for(float x = -1.0; x <= 1.0; x++) {
            for(float y = -1.0; y <= 1.0; y++) {
                blurCol += texture(u_mainTex, uv + vec2(x, y) * d);
            }
        }
        col = blurCol / 9.0;
    }
    
    if (u_bloom_en) {
        vec2 d = 2.0 / u_resolution;
        vec4 bloomCol = vec4(0.0);
        for(float x = -2.0; x <= 2.0; x++) {
            for(float y = -2.0; y <= 2.0; y++) {
                vec4 smp = texture(u_mainTex, uv + vec2(x, y) * d);
                float luma = dot(smp.rgb, vec3(0.299, 0.587, 0.114));
                bloomCol += smp * smoothstep(0.4, 0.7, luma);
            }
        }
        bloomCol /= 25.0;
        col.rgb += bloomCol.rgb * u_bloom_st;
        col.rgb = min(col.rgb, vec3(1.0));
    }
    
    if (u_sharpenEnabled) {
        vec2 d = 1.0 / u_resolution;
        vec4 sum = col * 5.0;
        sum -= texture(u_mainTex, uv + vec2(-d.x, 0.0));
        sum -= texture(u_mainTex, uv + vec2(d.x, 0.0));
        sum -= texture(u_mainTex, uv + vec2(0.0, -d.y));
        sum -= texture(u_mainTex, uv + vec2(0.0, d.y));
        col = mix(col, sum, u_sharpenStrength);
    }
    
    if (u_edgeDetectionEnabled) {
        vec2 d = 1.0 / u_resolution * u_edgeThickness;
        vec4 sum = col * 4.0;
        sum -= texture(u_mainTex, uv + vec2(-d.x, 0.0));
        sum -= texture(u_mainTex, uv + vec2(d.x, 0.0));
        sum -= texture(u_mainTex, uv + vec2(0.0, -d.y));
        sum -= texture(u_mainTex, uv + vec2(0.0, d.y));
        float edge = length(sum.rgb);
        col.rgb = mix(col.rgb, u_edgeColor, clamp(edge, 0.0, 1.0));
    }
    
    if (u_scanlineEnabled) {
        float s = sin(uv.y * u_scanlineDensity + u_time * u_scanlineSpeed * 10.0) * 0.5 + 0.5;
        vec3 scanLine = mix(col.rgb, u_scanlineColor, u_scanlineStrength * s);
        col.rgb = scanLine;
    }

    if (u_toonEnabled) {
        float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        float stepCount = (luma < 0.5) ? u_toonDark : u_toonLight;
        col.rgb = floor(col.rgb * stepCount) / stepCount;
    }
    
    if (u_colorEnabled) {
        float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        if (luma < 0.5) {
            float t = luma * 2.0;
            col.rgb = mix(u_colorShadow, u_colorMidtone, t);
        } else {
            float t = (luma - 0.5) * 2.0;
            col.rgb = mix(u_colorMidtone, u_colorHighlight, t);
        }
    }

    if (u_vignetteMaskEnabled) {
        float dist = length(uv - 0.5);
        float mask = smoothstep(0.5, 0.2, dist);
        col *= mask;
    }
    
    if (u_vignetteEnabled) {
        float d = distance(uv, vec2(0.5));
        float v = smoothstep(u_vignetteSize, u_vignetteSize + u_vignetteStrength, d);
        col.rgb = mix(col.rgb, u_vignetteColor, clamp(v, 0.0, 1.0));
    }
    
    fragColor = col;
}
`;class N{constructor(e){this.canvas=e,this.gl=null,this.program=null,this.locations={},this.gradTexture=null,this.fbos=[null,null],this.textures=[null,null],this.ready=!1,this._init()}_init(){const e=this.canvas.getContext("webgl2",{preserveDrawingBuffer:!0,alpha:!0});if(!e){console.error("WebGL2 が利用できません。ブラウザを確認してください。");return}this.gl=e;const l=this._createProgram(Q,ie),a=this._createProgram(Q,de);if(!l||!a)return;this.program=l,this.postProgram=a;const t=new Float32Array([-1,-1,1,-1,-1,1,1,1]),o=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,o),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW);const r=e.getAttribLocation(l,"a_position");e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),this._cacheUniforms(["u_type","u_time","u_polarConversion","u_params","u_invertEnable","u_gradEnable","u_gradTex","u_isBaseLayer","u_backTex","u_blendMode","u_opacity","u_blackBackground","u_solidColorEnabled","u_solidColor","u_transform","u_scroll"]),this.postLocations={},["u_mainTex","u_time","u_resolution","u_blurEnabled","u_blurStrength","u_bloom_en","u_bloom_st","u_sharpenEnabled","u_sharpenStrength","u_pixelationEnabled","u_pixelSize","u_chromaticAberrationEnabled","u_chromaticAberration","u_vignetteEnabled","u_vignetteStrength","u_vignetteSize","u_vignetteColor","u_scanlineEnabled","u_scanlineDensity","u_scanlineSpeed","u_scanlineStrength","u_scanlineColor","u_kaleidoscopeEnabled","u_kaleidoSegments","u_kaleidoRotation","u_mirrorTileEnabled","u_mirrorTileX","u_mirrorTileY","u_swirlEnabled","u_swirlStrength","u_swirlRadius","u_edgeDetectionEnabled","u_edgeThickness","u_edgeColor","u_toonEnabled","u_toonDark","u_toonLight","u_vignetteMaskEnabled","u_colorEnabled","u_colorShadow","u_colorMidtone","u_colorHighlight"].forEach(s=>{this.postLocations[s]=this.gl.getUniformLocation(this.postProgram,s)}),this._createDefaultGradTexture(),this._setupFBOs(),this.ready=!0}_setupFBOs(){const e=this.gl,l=this.canvas.width,a=this.canvas.height;for(let t=0;t<2;t++)this.textures[t]&&e.deleteTexture(this.textures[t]),this.fbos[t]&&e.deleteFramebuffer(this.fbos[t]),this.textures[t]=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.textures[t]),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,l,a,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),this.fbos[t]=e.createFramebuffer(),e.bindFramebuffer(e.FRAMEBUFFER,this.fbos[t]),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.textures[t],0);e.bindFramebuffer(e.FRAMEBUFFER,null)}resize(e,l){(this.canvas.width!==e||this.canvas.height!==l)&&(this.canvas.width=e,this.canvas.height=l,this._setupFBOs())}_cacheUniforms(e){e.forEach(l=>{this.locations[l]=this.gl.getUniformLocation(this.program,l)})}_createDefaultGradTexture(){const e=this.gl,l=256,a=new Uint8Array(l*4);for(let t=0;t<l;t++)a[t*4]=t,a[t*4+1]=t,a[t*4+2]=t,a[t*4+3]=255;this.gradTexture=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.gradTexture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,l,1,0,e.RGBA,e.UNSIGNED_BYTE,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}updateGradientLUT(e){if(!this.ready||!e)return;const l=this.gl;l.bindTexture(l.TEXTURE_2D,this.gradTexture),l.texImage2D(l.TEXTURE_2D,0,l.RGBA,256,1,0,l.RGBA,l.UNSIGNED_BYTE,e)}_createShader(e,l){const a=this.gl,t=a.createShader(e);return a.shaderSource(t,l),a.compileShader(t),a.getShaderParameter(t,a.COMPILE_STATUS)?t:(console.error("Shader compile error:",a.getShaderInfoLog(t)),a.deleteShader(t),null)}_createProgram(e,l){const a=this._createShader(this.gl.VERTEX_SHADER,e),t=this._createShader(this.gl.FRAGMENT_SHADER,l);if(!a||!t)return null;const o=this.gl.createProgram();return this.gl.attachShader(o,a),this.gl.attachShader(o,t),this.gl.linkProgram(o),this.gl.getProgramParameter(o,this.gl.LINK_STATUS)?o:(console.error("Program link error:",this.gl.getProgramInfoLog(o)),null)}render(e,l){if(!this.ready||!l||l.length===0)return;const a=this.gl,t=this.locations;this.resize(e.resolution,e.resolution),a.viewport(0,0,this.canvas.width,this.canvas.height),a.useProgram(this.program);let o=0,r=1;for(let n=0;n<l.length;n++){const c=l[n];if(c.visible===!1)continue;const p=n===0;l.length-1,a.bindFramebuffer(a.FRAMEBUFFER,this.fbos[r]);const m=re[c.type];a.uniform1i(t.u_type,m!==void 0?m:0),a.uniform1f(t.u_time,e.time),a.uniform1i(t.u_polarConversion,c.polarConversion?1:0);const g=c.typeParams instanceof Array?c.typeParams:new Array(16).fill(0);a.uniform1fv(t.u_params,g);const h=c.scaleX!==void 0?c.scaleX:1,k=c.scaleY!==void 0?c.scaleY:1,j=c.offsetX!==void 0?c.offsetX:0,E=c.offsetY!==void 0?c.offsetY:0,_=c.rotation!==void 0?c.rotation:0;a.uniform1fv(t.u_transform,[j,E,h,k,_]);const u=c.scrollX!==void 0?c.scrollX:0,b=c.scrollY!==void 0?c.scrollY:0;a.uniform2f(t.u_scroll,u,b),a.uniform1i(t.u_invertEnable,c.invertEnable?1:0);const y=c.gradEnable&&c.gradStops;if(a.uniform1i(t.u_gradEnable,y?1:0),y){const B=this._buildLUTFromStops(c.gradStops);this.updateGradientLUT(B)}a.uniform1i(t.u_isBaseLayer,p?1:0),a.uniform1i(t.u_blackBackground,e.blackBackground?1:0);const w=c.opacity!==void 0?c.opacity:1;a.uniform1f(t.u_opacity,w),a.uniform1i(t.u_solidColorEnabled,c.solidColorEnabled?1:0),a.uniform3fv(t.u_solidColor,c.solidColor?c.solidColor:[1,1,1]);let S=0;c.blendMode==="add"?S=1:c.blendMode==="multiply"?S=2:c.blendMode==="screen"?S=3:c.blendMode==="mask"&&(S=4),a.uniform1i(t.u_blendMode,S),a.activeTexture(a.TEXTURE0),p?a.bindTexture(a.TEXTURE_2D,null):a.bindTexture(a.TEXTURE_2D,this.textures[o]),a.uniform1i(t.u_backTex,0),a.activeTexture(a.TEXTURE1),a.bindTexture(a.TEXTURE_2D,this.gradTexture),a.uniform1i(t.u_gradTex,1),a.drawArrays(a.TRIANGLE_STRIP,0,4);let C=o;o=r,r=C}a.useProgram(this.postProgram),a.bindFramebuffer(a.FRAMEBUFFER,null),a.viewport(0,0,this.canvas.width,this.canvas.height);const s=this.postLocations;a.uniform1f(s.u_time,e.time),a.uniform2f(s.u_resolution,this.canvas.width,this.canvas.height);const i=e.postEffects||{};a.uniform1i(s.u_blurEnabled,i.blurEnabled?1:0),a.uniform1f(s.u_blurStrength,i.blurStrength||1),a.uniform1i(s.u_bloom_en,i.bloomEnabled?1:0),a.uniform1f(s.u_bloom_st,i.bloomStrength!==void 0?i.bloomStrength:1),a.uniform1i(s.u_sharpenEnabled,i.sharpenEnabled?1:0),a.uniform1f(s.u_sharpenStrength,i.sharpenStrength||1),a.uniform1i(s.u_pixelationEnabled,i.pixelationEnabled?1:0),a.uniform1f(s.u_pixelSize,i.pixelSize||10),a.uniform1i(s.u_chromaticAberrationEnabled,i.chromaticAberrationEnabled?1:0),a.uniform1f(s.u_chromaticAberration,i.chromaticAberration||.01),a.uniform1i(s.u_vignetteEnabled,i.vignetteEnabled?1:0),a.uniform1f(s.u_vignetteStrength,i.vignetteStrength||.5),a.uniform1f(s.u_vignetteSize,i.vignetteSize||.5),a.uniform3fv(s.u_vignetteColor,i.vignetteColor||[0,0,0]),a.uniform1i(s.u_scanlineEnabled,i.scanlineEnabled?1:0),a.uniform1f(s.u_scanlineDensity,i.scanlineDensity||100),a.uniform1f(s.u_scanlineSpeed,i.scanlineSpeed||1),a.uniform1f(s.u_scanlineStrength,i.scanlineStrength||.5),a.uniform3fv(s.u_scanlineColor,i.scanlineColor||[0,0,0]),a.uniform1i(s.u_kaleidoscopeEnabled,i.kaleidoscopeEnabled?1:0),a.uniform1f(s.u_kaleidoSegments,i.kaleidoSegments||6),a.uniform1f(s.u_kaleidoRotation,i.kaleidoRotation||0),a.uniform1i(s.u_mirrorTileEnabled,i.mirrorTileEnabled?1:0),a.uniform1i(s.u_mirrorTileX,i.mirrorTileX?1:0),a.uniform1i(s.u_mirrorTileY,i.mirrorTileY?1:0),a.uniform1i(s.u_swirlEnabled,i.swirlEnabled?1:0),a.uniform1f(s.u_swirlStrength,i.swirlStrength||3),a.uniform1f(s.u_swirlRadius,i.swirlRadius||.5),a.uniform1i(s.u_edgeDetectionEnabled,i.edgeDetectionEnabled?1:0),a.uniform1f(s.u_edgeThickness,i.edgeThickness||1),a.uniform3fv(s.u_edgeColor,i.edgeColor||[0,1,0]),a.uniform1i(s.u_toonEnabled,i.toonEnabled?1:0),a.uniform1f(s.u_toonDark,i.toonDark!==void 0?i.toonDark:4),a.uniform1f(s.u_toonLight,i.toonLight!==void 0?i.toonLight:4),a.uniform1i(s.u_vignetteMaskEnabled,i.vignetteMaskEnabled?1:0),a.uniform1i(s.u_colorEnabled,i.colorEnabled?1:0),a.uniform3fv(s.u_colorShadow,i.colorShadow||[0,0,0]),a.uniform3fv(s.u_colorMidtone,i.colorMidtone||[.5,.5,.5]),a.uniform3fv(s.u_colorHighlight,i.colorHighlight||[1,1,1]),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,this.textures[o]),a.uniform1i(s.u_mainTex,0),a.drawArrays(a.TRIANGLE_STRIP,0,4)}_buildLUTFromStops(e,l=256){const a=document.createElement("canvas");a.width=l,a.height=1;const t=a.getContext("2d"),o=t.createLinearGradient(0,0,l,0);return[...e].sort((s,i)=>s.position-i.position).forEach(s=>o.addColorStop(Math.min(1,Math.max(0,s.position)),s.color)),t.fillStyle=o,t.fillRect(0,0,l,1),t.getImageData(0,0,l,1).data}getDataURL(){return this.canvas.toDataURL("image/png")}readPixels(){const e=this.gl,l=this.canvas.width,a=this.canvas.height,t=new Uint8Array(l*a*4);e.readPixels(0,0,l,a,e.RGBA,e.UNSIGNED_BYTE,t);const o=new Uint8Array(l*a*4);for(let r=0;r<a;r++){const s=(a-1-r)*l*4,i=r*l*4;o.set(t.subarray(s,s+l*4),i)}return{data:o,width:l,height:a}}}class I{static downloadPNG(e,l){const a=document.createElement("a");a.download=l,a.href=e.toDataURL("image/png"),a.click()}static generateNormalMapFromPixels({data:e,width:l,height:a},t=2){const o=document.createElement("canvas");o.width=l,o.height=a;const r=o.getContext("2d"),s=r.createImageData(l,a),i=s.data,n=(c,p)=>{c=Math.max(0,Math.min(l-1,c)),p=Math.max(0,Math.min(a-1,p));const m=(p*l+c)*4;return e[m]/255};for(let c=0;c<a;c++)for(let p=0;p<l;p++){const m=n(p-1,c-1),g=n(p,c-1),h=n(p+1,c-1),k=n(p-1,c),j=n(p+1,c),E=n(p-1,c+1),_=n(p,c+1),u=n(p+1,c+1),b=(h+2*j+u-m-2*k-E)*t,y=(E+2*_+u-m-2*g-h)*t,w=1,S=Math.sqrt(b*b+y*y+w*w),C=b/S,B=y/S,D=w/S,M=(c*l+p)*4;i[M]=(C*.5+.5)*255,i[M+1]=(B*.5+.5)*255,i[M+2]=Math.max(0,D)*255,i[M+3]=255}return r.putImageData(s,0,0),o}static generateNormalMapPixelData(e,l=2){const{data:a,width:t,height:o}=e,r=new Uint8Array(t*o*4),s=(i,n)=>(i=Math.max(0,Math.min(t-1,i)),n=Math.max(0,Math.min(o-1,n)),a[(n*t+i)*4]/255);for(let i=0;i<o;i++)for(let n=0;n<t;n++){const c=s(n-1,i-1),p=s(n,i-1),m=s(n+1,i-1),g=s(n-1,i),h=s(n+1,i),k=s(n-1,i+1),j=s(n,i+1),E=s(n+1,i+1),_=(m+2*h+E-c-2*g-k)*l,u=(k+2*j+E-c-2*p-m)*l,b=1,y=Math.sqrt(_*_+u*u+b*b),w=(i*t+n)*4;r[w]=(_/y*.5+.5)*255,r[w+1]=(u/y*.5+.5)*255,r[w+2]=Math.max(0,b/y)*255,r[w+3]=255}return{data:r,width:t,height:o}}static packChannels(e,l=null,a=null,t=null){if(!e)return null;const o=e.width,r=e.height,s=document.createElement("canvas");s.width=o,s.height=r;const i=s.getContext("2d"),n=i.createImageData(o,r),c=n.data;for(let p=0;p<o*r*4;p+=4)c[p]=e?.data[p]??0,c[p+1]=l?.data[p]??0,c[p+2]=a?.data[p]??0,c[p+3]=t?.data[p]??255;return i.putImageData(n,0,0),s}static packChannelsAdvanced(e,l,a){if(!e)return null;const t=e.width,o=e.height,r=document.createElement("canvas");r.width=t,r.height=o;const s=r.getContext("2d"),i=s.createImageData(t,o),n=i.data,c=(p,m)=>{if(p==="baseR")return e.data[m];if(p==="baseG")return e.data[m+1];if(p==="baseB")return e.data[m+2];if(p==="baseA")return e.data[m+3];if(l){if(p==="normX")return l.data[m];if(p==="normY")return l.data[m+1];if(p==="normZ")return l.data[m+2]}return p==="white"?255:0};for(let p=0;p<t*o*4;p+=4)n[p]=c(a.r,p),n[p+1]=c(a.g,p),n[p+2]=c(a.b,p),n[p+3]=c(a.a,p);return s.putImageData(i,0,0),r}static exportGIF(e,l,a,t){if(typeof GIF>"u"){alert("gif.js が読み込まれていません。");return}const o=e.gifFps||30,r=e.gifDuration||2,s=document.getElementById("gif-progress-overlay"),i=document.getElementById("gif-progress-text"),n=document.getElementById("gif-progress-bar");s&&(s.style.display="flex"),i&&(i.textContent="GIF 保存中... 0%"),n&&(n.style.width="0%");const c=Math.floor(o*r),p=Math.floor(1e3/o),m=new GIF({workers:2,quality:10,width:e.resolution,height:e.resolution,workerScript:"/gif.worker.js"});a&&t.updateGradientLUT(a);let g=e.time;const h=(e.animSpeed||1)/o,k=e.gifSeamless!==!1,j=Math.floor(c*.2),E=c-j;for(let _=0;_<c;_++){const u={...e,time:g};t.render(u,l);const b=document.createElement("canvas");b.width=e.resolution,b.height=e.resolution;const y=b.getContext("2d");if(y.translate(0,e.resolution),y.scale(1,-1),k&&_>=E){const w=(_-E)/j,S=g,C=g-r*(e.animSpeed||1),B={...e,time:S};t.render(B,l),y.globalAlpha=1,y.globalCompositeOperation="source-over",y.drawImage(t.canvas,0,0);const D={...e,time:C};t.render(D,l),y.globalAlpha=w,y.globalCompositeOperation="source-over",y.drawImage(t.canvas,0,0)}else{const w={...e,time:g};t.render(w,l),y.globalAlpha=1,y.globalCompositeOperation="source-over",y.drawImage(t.canvas,0,0)}m.addFrame(b,{delay:p,copy:!0}),g+=h}m.on("progress",_=>{const u=Math.round(_*100);i&&(i.textContent=`GIF 保存中... ${u}%`),n&&(n.style.width=`${u}%`)}),m.on("finished",_=>{s&&(s.style.display="none");const u=URL.createObjectURL(_),b=document.createElement("a");b.href=u,b.download=`texture_anim_${e.resolution}px.gif`,b.click(),URL.revokeObjectURL(u)}),m.render()}}const ae={Circle:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.2,index:1},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:2}],Vignette:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.2,index:1},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:2},{key:"roundness",label:{en:"Roundness",ja:"丸み (Vignette)"},min:0,max:1,step:.01,default:1,index:3}],LensFlare:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:1},{key:"coronaSize",label:{en:"Glow Range",ja:"グロー範囲"},min:.5,max:20,step:.5,default:3,index:2}],Sun:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"coronaSize",label:{en:"Glow Range",ja:"グロー範囲"},min:.5,max:20,step:.5,default:3,index:1}],SolarGlow:[{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:0},{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:1}],Ring:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"width",label:{en:"Width",ja:"太さ"},min:0,max:.5,step:.01,default:.1,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.1,index:2},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:3}],WaveRingSine:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"width",label:{en:"Width",ja:"太さ"},min:0,max:.5,step:.01,default:.08,index:1},{key:"frequency",label:{en:"Frequency",ja:"波の数"},min:1,max:30,step:1,default:6,index:2},{key:"amplitude",label:{en:"Amplitude",ja:"波の振幅"},min:0,max:.5,step:.01,default:.05,index:3},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:4}],WaveRingNoisy:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"width",label:{en:"Width",ja:"太さ"},min:0,max:.5,step:.01,default:.08,index:1},{key:"amplitude",label:{en:"Amplitude",ja:"波の振幅"},min:0,max:.5,step:.01,default:.05,index:2},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:3},{key:"noiseScale",label:{en:"Noise Scale",ja:"ノイズスケール"},min:0,max:10,step:.1,default:3,index:4}],WaveRingSquare:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"width",label:{en:"Width",ja:"太さ"},min:0,max:.5,step:.01,default:.08,index:1},{key:"frequency",label:{en:"Frequency",ja:"波の数"},min:1,max:30,step:1,default:6,index:2},{key:"amplitude",label:{en:"Amplitude",ja:"波の振幅"},min:0,max:.5,step:.01,default:.05,index:3},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:4}],WaveRingDouble:[{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.5,index:0},{key:"width",label:{en:"Width",ja:"太さ"},min:0,max:.5,step:.01,default:.08,index:1},{key:"frequency",label:{en:"Frequency",ja:"波の数"},min:1,max:30,step:1,default:6,index:2},{key:"amplitude",label:{en:"Amplitude",ja:"波の振幅"},min:0,max:.5,step:.01,default:.05,index:3},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:4}],GradationLinear:[{key:"angle",label:{en:"Angle",ja:"角度"},min:-360,max:360,step:1,default:0,index:0},{key:"scale",label:{en:"Scale (Repeat)",ja:"スケール(反復)"},min:.1,max:20,step:.1,default:1,index:1},{key:"offset",label:{en:"Offset",ja:"オフセット"},min:-1,max:1,step:.01,default:0,index:2},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:3}],GradationReflect:[{key:"angle",label:{en:"Angle",ja:"角度"},min:-360,max:360,step:1,default:0,index:0},{key:"scale",label:{en:"Scale (Repeat)",ja:"スケール(反復)"},min:.1,max:20,step:.1,default:1,index:1},{key:"offset",label:{en:"Offset",ja:"オフセット"},min:-1,max:1,step:.01,default:0,index:2},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:3}],GradationRepeat:[{key:"angle",label:{en:"Angle",ja:"角度"},min:-360,max:360,step:1,default:0,index:0},{key:"scale",label:{en:"Scale (Repeat)",ja:"スケール(反復)"},min:.1,max:20,step:.1,default:1,index:1},{key:"offset",label:{en:"Offset",ja:"オフセット"},min:-1,max:1,step:.01,default:0,index:2},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:3}],Wood:[{key:"frequency",label:{en:"Frequency",ja:"密度"},min:1,max:50,step:.5,default:10,index:0},{key:"power",label:{en:"Contrast",ja:"コントラスト"},min:.1,max:5,step:.1,default:1,index:1},{key:"turbulence",label:{en:"Turbulence",ja:"歪み"},min:0,max:5,step:.1,default:1,index:2}],Checker:[{key:"widthX",label:{en:"Width X",ja:"分割数 X"},min:1,max:100,step:1,default:8,index:0},{key:"widthY",label:{en:"Width Y",ja:"分割数 Y"},min:1,max:100,step:1,default:8,index:1}],GradientChecker:[{key:"widthX",label:{en:"Width X",ja:"分割数 X"},min:1,max:100,step:1,default:8,index:0},{key:"widthY",label:{en:"Width Y",ja:"分割数 Y"},min:1,max:100,step:1,default:8,index:1}],RoundChecker:[{key:"widthX",label:{en:"Width X",ja:"分割数 X"},min:1,max:100,step:1,default:8,index:0},{key:"widthY",label:{en:"Width Y",ja:"分割数 Y"},min:1,max:100,step:1,default:8,index:1},{key:"roundness",label:{en:"Roundness",ja:"丸み"},min:0,max:1,step:.01,default:0,index:2}],DiamondChecker:[{key:"widthX",label:{en:"Width X",ja:"分割数 X"},min:1,max:100,step:1,default:8,index:0},{key:"widthY",label:{en:"Width Y",ja:"分割数 Y"},min:1,max:100,step:1,default:8,index:1},{key:"roundness",label:{en:"Roundness",ja:"丸み"},min:0,max:1,step:.01,default:0,index:2}],Spark:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"power",label:{en:"Power Exponent",ja:"鋭さ"},min:.1,max:20,step:.1,default:8,index:1},{key:"arms",label:{en:"Arms",ja:"条数"},min:2,max:64,step:1,default:6,index:2}],Flare:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"power",label:{en:"Power Exponent",ja:"鋭さ"},min:.1,max:10,step:.1,default:3,index:1}],Cross:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"power",label:{en:"Power Exponent",ja:"鋭さ"},min:.1,max:10,step:.1,default:1,index:1},{key:"width",label:{en:"Width",ja:"太さ"},min:.01,max:2,step:.01,default:.2,index:2}],Flower:[{key:"petals",label:{en:"Petals",ja:"花びらの数"},min:1,max:30,step:1,default:5,index:0},{key:"radius",label:{en:"Radius",ja:"半径"},min:0,max:2,step:.01,default:.8,index:1},{key:"offset",label:{en:"Offset / Twist",ja:"オフセット / 捻り"},min:0,max:2,step:.01,default:0,index:2},{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:3},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:4}],PerlinNoise:[{key:"frequency",label:{en:"Frequency",ja:"スケール"},min:.5,max:40,step:.5,default:4,index:0},{key:"octaves",label:{en:"Octaves",ja:"オクターブ(細部)"},min:1,max:10,step:1,default:4,index:1},{key:"persistence",label:{en:"Persistence",ja:"減衰効果"},min:.1,max:1,step:.05,default:.5,index:2},{key:"amplitude",label:{en:"Amplitude",ja:"振幅"},min:0,max:2,step:.01,default:1,index:3}],FbmNoise:[{key:"frequency",label:{en:"Frequency",ja:"スケール"},min:.5,max:40,step:.5,default:3,index:0},{key:"octaves",label:{en:"Octaves",ja:"オクターブ(細部)"},min:1,max:10,step:1,default:6,index:1},{key:"lacunarity",label:{en:"Lacunarity",ja:"粗さ"},min:1,max:4,step:.1,default:2,index:2},{key:"gain",label:{en:"Gain",ja:"ゲイン"},min:.1,max:1,step:.05,default:.5,index:3}],VoronoiNoise:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:50,step:.5,default:6,index:0},{key:"jitter",label:{en:"Jitter",ja:"ランダム性"},min:0,max:1,step:.01,default:1,index:1},{key:"power",label:{en:"Power Exponent",ja:"コントラスト"},min:.1,max:5,step:.1,default:1,index:2}],VoronoiCell:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:50,step:.5,default:6,index:0},{key:"jitter",label:{en:"Jitter",ja:"ランダム性"},min:0,max:1,step:.01,default:1,index:1}],SimplexNoise:[{key:"frequency",label:{en:"Frequency",ja:"スケール"},min:.5,max:40,step:.5,default:3,index:0},{key:"octaves",label:{en:"Octaves",ja:"オクターブ(細部)"},min:1,max:8,step:1,default:4,index:1}],MarbleNoise:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:20,step:.5,default:4,index:0},{key:"frequency",label:{en:"Frequency",ja:"線の密度"},min:.5,max:20,step:.5,default:4,index:1},{key:"turbulence",label:{en:"Turbulence",ja:"歪み"},min:0,max:5,step:.1,default:2,index:2}],Cell:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"size",label:{en:"Size",ja:"サイズ"},min:.5,max:40,step:.5,default:5,index:1},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:2}],Lightning:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"frequency",label:{en:"Frequency",ja:"波打ち"},min:.5,max:20,step:.5,default:3,index:1},{key:"width",label:{en:"Width",ja:"太さ"},min:.1,max:5,step:.1,default:1,index:2}],Smoke:[{key:"volume",label:{en:"Volume",ja:"密度"},min:1,max:10,step:.5,default:3,index:0},{key:"beta",label:{en:"Beta",ja:"広がり"},min:.1,max:5,step:.1,default:1.5,index:1},{key:"delta",label:{en:"Delta",ja:"微細さ"},min:.01,max:.5,step:.01,default:.1,index:2}],Fire:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"strength",label:{en:"Strength",ja:"燃え上がり"},min:0,max:10,step:.1,default:1.5,index:1},{key:"power",label:{en:"Power",ja:"減衰力"},min:.1,max:5,step:.1,default:.7,index:2},{key:"range",label:{en:"Range",ja:"範囲"},min:.5,max:5,step:.1,default:2,index:3},{key:"width",label:{en:"Width",ja:"太さ"},min:.1,max:5,step:.1,default:.6,index:4}],Flame:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"width",label:{en:"Width",ja:"太さ"},min:.1,max:5,step:.1,default:.5,index:1},{key:"scale",label:{en:"Scale",ja:"炎の大きさ"},min:.1,max:10,step:.1,default:2,index:2}],Flash:[{key:"frequency",label:{en:"Frequency",ja:"スパイク数"},min:1,max:64,step:.5,default:8,index:0},{key:"power",label:{en:"Power Exponent",ja:"減衰力"},min:.1,max:10,step:.1,default:1,index:1}],Cloud:[{key:"width",label:{en:"Width",ja:"雲の幅"},min:.1,max:5,step:.05,default:1,index:0},{key:"height",label:{en:"Height",ja:"雲の高さ"},min:.1,max:5,step:.05,default:1,index:1},{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:2},{key:"ambient",label:{en:"Ambient",ja:"環境光"},min:0,max:1,step:.01,default:0,index:3},{key:"smoothness",label:{en:"Smoothness",ja:"なめらかさ"},min:.1,max:1,step:.01,default:.6,index:4}],Caustics:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:30,step:.5,default:5,index:0},{key:"speed",label:{en:"Speed",ja:"揺らぎ速度"},min:0,max:10,step:.1,default:1,index:1}],WaterTurbulence:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:40,step:.5,default:4,index:0},{key:"intensity",label:{en:"Intensity",ja:"波の強さ"},min:0,max:2,step:.01,default:1,index:1}],Electric:[{key:"frequency",label:{en:"Frequency",ja:"波形数"},min:.5,max:20,step:.5,default:3,index:0},{key:"scale",label:{en:"Scale",ja:"ノイズスケール"},min:.5,max:30,step:.5,default:3,index:1},{key:"power",label:{en:"Power Exponent",ja:"発光力"},min:.1,max:10,step:.1,default:1,index:2}],Energy:[{key:"power",label:{en:"Power",ja:"発光力"},min:.1,max:10,step:.1,default:1,index:0},{key:"density",label:{en:"Density",ja:"密度"},min:1,max:50,step:1,default:8,index:1},{key:"thickness",label:{en:"Thickness",ja:"太さ"},min:.1,max:10,step:.1,default:1,index:2},{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:20,step:.1,default:2,index:3}],Squiggles:[{key:"size",label:{en:"Size",ja:"サイズ"},min:.5,max:20,step:.5,default:3,index:0},{key:"scale",label:{en:"Scale",ja:"うねり度"},min:.5,max:20,step:.5,default:3,index:1},{key:"density",label:{en:"Density",ja:"密度"},min:1,max:20,step:.5,default:3,index:2}],Speckle:[{key:"radius",label:{en:"Radius",ja:"粒半径"},min:.1,max:1,step:.05,default:.3,index:0},{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:60,step:1,default:10,index:1},{key:"density",label:{en:"Density",ja:"密度"},min:.1,max:1,step:.05,default:.5,index:2}],Grunge:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:30,step:.5,default:3,index:0},{key:"width",label:{en:"Width",ja:"幅"},min:.1,max:5,step:.1,default:1,index:1},{key:"alpha",label:{en:"Alpha",ja:"透明度"},min:0,max:2,step:.1,default:1,index:2}],HexGridRadial:[{key:"scale",label:{en:"Scale / Rings",ja:"スケール / リング数"},min:.5,max:50,step:.5,default:6,index:0},{key:"lineWidth",label:{en:"Line Width",ja:"線の太さ"},min:.01,max:2,step:.01,default:.5,index:1},{key:"smoothness",label:{en:"Smoothness",ja:"なめらかさ"},min:0,max:1,step:.05,default:.2,index:2}],Spiral:[{key:"arms",label:{en:"Arms",ja:"アーム数"},min:1,max:20,step:1,default:2,index:0},{key:"tightness",label:{en:"Tightness",ja:"巻きの強さ"},min:.1,max:20,step:.1,default:3,index:1},{key:"radius",label:{en:"Radius",ja:"半径"},min:.1,max:2,step:.05,default:.5,index:2},{key:"width",label:{en:"Width",ja:"太さ"},min:.1,max:2,step:.05,default:.4,index:3}],Ripple:[{key:"radius",label:{en:"Radius",ja:"半径"},min:.1,max:2,step:.05,default:1,index:0},{key:"frequency",label:{en:"Frequency",ja:"波の密度"},min:1,max:100,step:1,default:20,index:1},{key:"amplitude",label:{en:"Amplitude",ja:"波の振幅"},min:0,max:2,step:.1,default:1,index:2},{key:"centerX",label:{en:"Center X",ja:"中心座標 X"},min:0,max:1,step:.01,default:.5,index:3},{key:"centerY",label:{en:"Center Y",ja:"中心座標 Y"},min:0,max:1,step:.01,default:.5,index:4}],Plasma:[{key:"frequency",label:{en:"Frequency",ja:"密度"},min:1,max:50,step:.5,default:5,index:0},{key:"colorShift",label:{en:"Color Shift",ja:"色相シフト"},min:0,max:6.28,step:.1,default:0,index:1}],Concentric:[{key:"frequency",label:{en:"Frequency",ja:"円の密度"},min:1,max:50,step:.5,default:10,index:0},{key:"offset",label:{en:"Offset",ja:"オフセット"},min:0,max:1,step:.01,default:0,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.05,index:2}],StarBurst:[{key:"points",label:{en:"Points",ja:"頂点数"},min:2,max:32,step:1,default:5,index:0},{key:"radius",label:{en:"Radius",ja:"半径"},min:.1,max:2,step:.05,default:1,index:1},{key:"sharpness",label:{en:"Sharpness",ja:"鋭さ"},min:.5,max:30,step:.5,default:5,index:2}],MetaBalls:[{key:"count",label:{en:"Count",ja:"個数"},min:1,max:16,step:1,default:3,index:0},{key:"threshold",label:{en:"Threshold",ja:"融合しきい値"},min:.1,max:10,step:.1,default:1,index:1},{key:"radius",label:{en:"Ball Radius",ja:"ボール半径"},min:.05,max:1,step:.01,default:.2,index:2}],Wrinkle:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:30,step:.5,default:3,index:0},{key:"octaves",label:{en:"Octaves",ja:"細部"},min:1,max:10,step:1,default:5,index:1},{key:"roughness",label:{en:"Roughness",ja:"粗さ"},min:.1,max:1,step:.05,default:.6,index:2}],Fabric:[{key:"warpFreq",label:{en:"Warp Frequency",ja:"縦糸の密度"},min:.5,max:50,step:.5,default:5,index:0},{key:"weftFreq",label:{en:"Weft Frequency",ja:"横糸の密度"},min:.5,max:50,step:.5,default:5,index:1},{key:"mix",label:{en:"Mix",ja:"ブレンド率"},min:0,max:1,step:.05,default:.5,index:2}],Crack:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:40,step:.5,default:5,index:0},{key:"threshold",label:{en:"Threshold",ja:"しきい値"},min:.1,max:.9,step:.05,default:.3,index:1},{key:"depth",label:{en:"Depth",ja:"深さ"},min:0,max:2,step:.05,default:.8,index:2}],Lava:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:30,step:.5,default:3,index:0},{key:"threshold",label:{en:"Threshold",ja:"しきい値"},min:.1,max:.9,step:.05,default:.5,index:1},{key:"sharpness",label:{en:"Sharpness",ja:"シャープネス"},min:.1,max:10,step:.1,default:1,index:2}],Matrix:[{key:"speed",label:{en:"Speed",ja:"スピード"},min:.1,max:10,step:.1,default:1.5,index:0},{key:"density",label:{en:"Column Density",ja:"縦列の密度"},min:5,max:100,step:1,default:20,index:1},{key:"glowIntensity",label:{en:"Glow Intensity",ja:"発光力"},min:0,max:5,step:.1,default:1,index:2}],Star:[{key:"points",label:{en:"Points",ja:"頂点数"},min:3,max:20,step:1,default:5,index:0},{key:"innerRadius",label:{en:"Inner Radius",ja:"内半径"},min:.01,max:2,step:.01,default:.3,index:1},{key:"outerRadius",label:{en:"Outer Radius",ja:"外半径"},min:.01,max:2,step:.01,default:.8,index:2},{key:"innerRoundness",label:{en:"Inner Roundness",ja:"内側の丸み"},min:0,max:.5,step:.01,default:.02,index:3},{key:"outerRoundness",label:{en:"Outer Roundness",ja:"外側の丸み"},min:0,max:.5,step:.01,default:.05,index:4},{key:"angle",label:{en:"Angle",ja:"角度"},min:-360,max:360,step:1,default:0,index:5},{key:"glowPower",label:{en:"Glow Power",ja:"グロー強度"},min:0,max:10,step:.1,default:0,index:6},{key:"outlineWidth",label:{en:"Outline Width",ja:"アウトライン幅"},min:0,max:.2,step:.005,default:0,index:7}],Polygon:[{key:"sides",label:{en:"Sides",ja:"角数"},min:3,max:20,step:1,default:6,index:0},{key:"radius",label:{en:"Radius",ja:"半径"},min:.01,max:2,step:.01,default:.6,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.02,index:2},{key:"angle",label:{en:"Angle",ja:"角度"},min:-360,max:360,step:1,default:0,index:3},{key:"glowPower",label:{en:"Glow Power",ja:"グロー強度"},min:0,max:10,step:.1,default:0,index:4},{key:"outlineWidth",label:{en:"Outline Width",ja:"アウトライン幅"},min:0,max:.3,step:.005,default:0,index:5}],Rectangle:[{key:"width",label:{en:"Width",ja:"幅"},min:.01,max:2,step:.01,default:.8,index:0},{key:"height",label:{en:"Height",ja:"高さ"},min:.01,max:2,step:.01,default:.8,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.02,index:2},{key:"angle",label:{en:"Angle",ja:"角度"},min:-360,max:360,step:1,default:0,index:3},{key:"cornerRadius",label:{en:"Corner Radius",ja:"角の丸み"},min:0,max:1,step:.01,default:0,index:4},{key:"glowPower",label:{en:"Glow Power",ja:"グロー強度"},min:0,max:10,step:.1,default:0,index:5},{key:"outlineWidth",label:{en:"Outline Width",ja:"アウトライン幅"},min:0,max:.3,step:.005,default:0,index:6}],Halo:[{key:"ringRadius",label:{en:"Ring Radius",ja:"リング半径"},min:0,max:2,step:.01,default:.6,index:0},{key:"ringWidth",label:{en:"Ring Width",ja:"リングの太さ"},min:.01,max:1,step:.01,default:.25,index:1},{key:"coreGlow",label:{en:"Core Glow",ja:"コアグロー"},min:0,max:2,step:.01,default:.5,index:2},{key:"power",label:{en:"Sharpness",ja:"锐さ"},min:.1,max:10,step:.1,default:2,index:3}],RayBurst:[{key:"rays",label:{en:"Ray Count",ja:"光線本数"},min:2,max:32,step:1,default:12,index:0},{key:"sharpness",label:{en:"Sharpness",ja:"锐さ"},min:.1,max:20,step:.1,default:4,index:1},{key:"falloff",label:{en:"Falloff",ja:"減衰"},min:.1,max:5,step:.1,default:1.5,index:2},{key:"spin",label:{en:"Spin (deg)",ja:"回転角度"},min:-180,max:180,step:1,default:0,index:3},{key:"power",label:{en:"Power",ja:"強度"},min:.1,max:5,step:.1,default:1,index:4}],GodRay:[{key:"beams",label:{en:"Beam Count",ja:"ビーム本数"},min:1,max:8,step:1,default:5,index:0},{key:"angle",label:{en:"Angle (deg)",ja:"角度"},min:-180,max:180,step:1,default:90,index:1},{key:"spread",label:{en:"Spread",ja:"拡散"},min:.01,max:1,step:.01,default:.2,index:2},{key:"falloff",label:{en:"Falloff",ja:"色褱"},min:.1,max:5,step:.1,default:1.5,index:3},{key:"noise",label:{en:"Noise",ja:"ノイズ"},min:0,max:2,step:.01,default:.5,index:4}],Bokeh:[{key:"count",label:{en:"Count",ja:"個数"},min:1,max:20,step:1,default:8,index:0},{key:"radius",label:{en:"Radius",ja:"半径"},min:.02,max:.5,step:.01,default:.1,index:1},{key:"softness",label:{en:"Softness",ja:"ゼワさ"},min:0,max:1,step:.01,default:.3,index:2},{key:"seed",label:{en:"Seed",ja:"シード"},min:0,max:100,step:1,default:1,index:3},{key:"glow",label:{en:"Glow",ja:"グロー"},min:0,max:2,step:.01,default:.4,index:4}],Aurora:[{key:"bands",label:{en:"Bands",ja:"帯の数"},min:1,max:6,step:1,default:3,index:0},{key:"height",label:{en:"Y Position",ja:"Y位置"},min:.1,max:.9,step:.01,default:.5,index:1},{key:"width",label:{en:"Band Width",ja:"帯の幅"},min:.1,max:5,step:.1,default:1,index:2},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:3,step:.1,default:.5,index:3},{key:"turbulence",label:{en:"Turbulence",ja:"ねじれ"},min:0,max:3,step:.1,default:1,index:4}],Shimmer:[{key:"count",label:{en:"Count",ja:"個数"},min:1,max:30,step:1,default:15,index:0},{key:"size",label:{en:"Size",ja:"大きさ"},min:.1,max:5,step:.1,default:1,index:1},{key:"speed",label:{en:"Speed",ja:"点滅速度"},min:.1,max:10,step:.1,default:2,index:2},{key:"power",label:{en:"Brightness",ja:"輝度"},min:.1,max:3,step:.1,default:1,index:3},{key:"scale",label:{en:"Distribution",ja:"分布範囲"},min:.1,max:1,step:.01,default:.9,index:4}],SquareGrid:[{key:"scale",label:{en:"Scale X / Cols",ja:"スケールX / 列数"},min:1,max:100,step:1,default:10,index:0},{key:"lineWidth",label:{en:"Line Width / Border",ja:"線の太さ / 枠幅"},min:.01,max:.5,step:.01,default:.05,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.1,index:2}],Dots:[{key:"scale",label:{en:"Scale X / Cols",ja:"スケールX / 列数"},min:1,max:100,step:1,default:10,index:0},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.1,index:1},{key:"dotRadius",label:{en:"Dot Radius",ja:"ドット半径"},min:.05,max:.5,step:.01,default:.2,index:2}],CrossGrid:[{key:"scale",label:{en:"Scale X / Cols",ja:"スケールX / 列数"},min:1,max:100,step:1,default:10,index:0},{key:"lineWidth",label:{en:"Line Width / Border",ja:"線の太さ / 枠幅"},min:.01,max:.5,step:.01,default:.05,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.1,index:2}],SquareGridDash:[{key:"scale",label:{en:"Scale X / Cols",ja:"スケールX / 列数"},min:1,max:100,step:1,default:10,index:0},{key:"lineWidth",label:{en:"Line Width / Border",ja:"線の太さ / 枠幅"},min:.01,max:.5,step:.01,default:.05,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.1,index:2}],RandomTiles:[{key:"scale",label:{en:"Scale X / Cols",ja:"スケールX / 列数"},min:1,max:100,step:1,default:10,index:0},{key:"lineWidth",label:{en:"Line Width / Border",ja:"線の太さ / 枠幅"},min:.01,max:.5,step:.01,default:.05,index:1},{key:"scaleY",label:{en:"Scale Y / Rows",ja:"スケールY / 行数"},min:1,max:100,step:1,default:10,index:2},{key:"variation",label:{en:"Variation / Noise",ja:"ランダム・ノイズ"},min:0,max:1,step:.05,default:.3,index:3}],SquareGridPolka:[{key:"scale",label:{en:"Scale X / Cols",ja:"スケールX / 列数"},min:1,max:100,step:1,default:10,index:0},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.1,index:1},{key:"dotRadius",label:{en:"Dot Radius",ja:"ドット半径"},min:.05,max:.5,step:.01,default:.2,index:2}],DotMatrix:[{key:"scale",label:{en:"Scale X / Cols",ja:"スケールX / 列数"},min:1,max:100,step:1,default:10,index:0},{key:"dotRadius",label:{en:"Dot Radius",ja:"ドット半径"},min:.05,max:.5,step:.01,default:.2,index:1},{key:"scaleY",label:{en:"Scale Y / Rows",ja:"スケールY / 行数"},min:1,max:100,step:1,default:10,index:2},{key:"variation",label:{en:"Variation / Noise",ja:"ランダム・ノイズ"},min:0,max:1,step:.05,default:.3,index:3}],Zigzag:[{key:"frequency",label:{en:"Frequency / Scale",ja:"密度 / スケール"},min:1,max:100,step:1,default:20,index:0},{key:"angle",label:{en:"Angle (Deg)",ja:"角度"},min:-180,max:180,step:1,default:0,index:1},{key:"lineWidth",label:{en:"Line Width",ja:"線の太さ"},min:.01,max:.99,step:.01,default:.5,index:2},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:1,step:.01,default:.05,index:3},{key:"amplitude",label:{en:"Amplitude (Zigzag)",ja:"振幅 (ジグザグ)"},min:0,max:1,step:.05,default:.2,index:4}],Crosshatch:[{key:"frequency",label:{en:"Frequency / Scale",ja:"密度 / スケール"},min:1,max:100,step:1,default:20,index:0},{key:"angle",label:{en:"Angle 1 (Deg)",ja:"角度 1"},min:-90,max:90,step:1,default:0,index:1},{key:"lineWidth",label:{en:"Line Width",ja:"線の太さ"},min:.01,max:.99,step:.01,default:.5,index:2},{key:"angle2",label:{en:"Angle 2 (Cross)",ja:"角度 2 (クロス)"},min:-90,max:90,step:1,default:-45,index:3}],TriGrid:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:50,step:1,default:10,index:0},{key:"lineWidth",label:{en:"Line Width",ja:"線の太さ"},min:.01,max:.5,step:.01,default:.1,index:1}],RadialLines:[{key:"rays",label:{en:"Ray Count",ja:"線の数"},min:2,max:100,step:1,default:36,index:0},{key:"width",label:{en:"Width",ja:"太さ"},min:.01,max:.5,step:.01,default:.1,index:1},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:.01,max:1,step:.01,default:.1,index:2},{key:"spin",label:{en:"Spin",ja:"回転速度"},min:-5,max:5,step:.1,default:0,index:3}],Swirl:[{key:"arms",label:{en:"Arms",ja:"アーム数"},min:1,max:20,step:1,default:3,index:0},{key:"twist",label:{en:"Twist",ja:"ひねり"},min:-20,max:20,step:.5,default:5,index:1},{key:"center",label:{en:"Center Focus",ja:"中心の強さ"},min:.1,max:5,step:.1,default:1,index:2}],PixelNoise:[{key:"scale",label:{en:"Scale",ja:"解像度"},min:1,max:256,step:1,default:32,index:0},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:10,step:.1,default:1,index:1}],StripeNoise:[{key:"scaleX",label:{en:"Scale X",ja:"横スケール"},min:.1,max:100,step:.1,default:10,index:0},{key:"scaleY",label:{en:"Scale Y",ja:"縦スケール"},min:.1,max:100,step:.1,default:1,index:1},{key:"angle",label:{en:"Angle",ja:"角度"},min:-90,max:90,step:1,default:0,index:2},{key:"contrast",label:{en:"Contrast",ja:"コントラスト"},min:.5,max:5,step:.1,default:1,index:3}],FlowLines:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:20,step:.5,default:5,index:0},{key:"density",label:{en:"Density",ja:"線の密度"},min:1,max:50,step:1,default:10,index:1},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:5,step:.1,default:.5,index:2}],SymmetricNoise:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:20,step:.5,default:3,index:0},{key:"axes",label:{en:"Axes",ja:"対称軸の数"},min:1,max:8,step:1,default:4,index:1},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:5,step:.1,default:1,index:2}],BevelSquare:[{key:"size",label:{en:"Size",ja:"サイズ"},min:.1,max:2,step:.01,default:.7,index:0},{key:"bevel",label:{en:"Bevel Depth",ja:"ベベル深さ"},min:0,max:1,step:.01,default:.2,index:1},{key:"lightDir",label:{en:"Light Dir",ja:"光源角度"},min:0,max:360,step:1,default:135,index:2}],PyramidPattern:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:50,step:1,default:5,index:0},{key:"depth",label:{en:"Depth",ja:"深さ"},min:0,max:1,step:.01,default:1,index:1}],CellularEdge:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:50,step:1,default:10,index:0},{key:"jitter",label:{en:"Jitter",ja:"歪み"},min:0,max:1,step:.05,default:1,index:1},{key:"thickness",label:{en:"Thickness",ja:"線の太さ"},min:.01,max:.5,step:.01,default:.05,index:2}],Weave:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:50,step:1,default:8,index:0},{key:"width",label:{en:"Band Width",ja:"帯の幅"},min:.1,max:.9,step:.05,default:.6,index:1},{key:"shadow",label:{en:"Shadow",ja:"立体感"},min:0,max:1,step:.05,default:.5,index:2}],SpiralV2:[{key:"arms",label:{en:"Arms",ja:"アーム数"},min:1,max:20,step:1,default:2,index:0},{key:"power",label:{en:"Power",ja:"曲がり具合"},min:.1,max:5,step:.1,default:1,index:1},{key:"speed",label:{en:"Speed",ja:"速度"},min:-5,max:5,step:.1,default:1,index:2}],Scanline:[{key:"count",label:{en:"Count",ja:"ライン数"},min:10,max:500,step:1,default:100,index:0},{key:"speed",label:{en:"Speed",ja:"流れる速度"},min:-10,max:10,step:.1,default:1,index:1},{key:"brightness",label:{en:"Brightness",ja:"明るさ"},min:0,max:2,step:.1,default:1,index:2}],Kaleido:[{key:"sides",label:{en:"Sides",ja:"分割数"},min:3,max:20,step:1,default:6,index:0},{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:5,step:.1,default:1,index:1},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:2,step:.1,default:.5,index:2}],FractalCamo:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:20,step:.5,default:3,index:0},{key:"levels",label:{en:"Levels",ja:"階調数"},min:2,max:8,step:1,default:4,index:1},{key:"smoothness",label:{en:"Smoothness",ja:"滑らかさ"},min:0,max:.5,step:.01,default:.1,index:2}],SweepGradient:[{key:"turns",label:{en:"Turns",ja:"回転数"},min:1,max:10,step:1,default:1,index:0},{key:"offset",label:{en:"Angle Offset",ja:"角度オフセット"},min:0,max:360,step:1,default:0,index:1}],Bricks:[{key:"cols",label:{en:"Columns",ja:"列数"},min:1,max:50,step:1,default:5,index:0},{key:"rows",label:{en:"Rows",ja:"行数"},min:1,max:50,step:1,default:10,index:1},{key:"mortar",label:{en:"Mortar Size",ja:"目地の太さ"},min:0,max:.2,step:.01,default:.05,index:2},{key:"shift",label:{en:"Shift",ja:"ずれ"},min:0,max:1,step:.05,default:.5,index:3}],PlasmaV2:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:20,step:.5,default:5,index:0},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:5,step:.1,default:1,index:1},{key:"complexity",label:{en:"Complexity",ja:"複雑さ"},min:1,max:5,step:1,default:3,index:2}],GrungeV2:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:50,step:1,default:15,index:0},{key:"scratches",label:{en:"Scratches",ja:"傷の量"},min:0,max:1,step:.05,default:.5,index:1},{key:"spots",label:{en:"Spots",ja:"シミの量"},min:0,max:1,step:.05,default:.3,index:2}],Pulse:[{key:"frequency",label:{en:"Frequency",ja:"波及頻度"},min:.5,max:5,step:.1,default:1,index:0},{key:"width",label:{en:"Width",ja:"リングの太さ"},min:.01,max:.5,step:.01,default:.1,index:1},{key:"count",label:{en:"Count",ja:"同時リング数"},min:1,max:10,step:1,default:3,index:2}],Burst:[{key:"rays",label:{en:"Rays",ja:"光線数"},min:5,max:200,step:1,default:50,index:0},{key:"noiseSq",label:{en:"Noise Freq",ja:"ノイズ周波数"},min:0,max:20,step:.5,default:5,index:1},{key:"power",label:{en:"Power",ja:"鋭さ"},min:.1,max:10,step:.1,default:2,index:2}],Twirl:[{key:"strength",label:{en:"Strength",ja:"ひねりの強さ"},min:-20,max:20,step:.5,default:5,index:0},{key:"radius",label:{en:"Radius",ja:"影響半径"},min:.1,max:2,step:.05,default:.5,index:1},{key:"baseScale",label:{en:"Base Scale",ja:"背景の柄サイズ"},min:1,max:20,step:1,default:5,index:2}],Vignette:[{key:"radius",label:{en:"Radius",ja:"半径"},min:.1,max:2,step:.05,default:.8,index:0},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:2,step:.05,default:.5,index:1},{key:"roundness",label:{en:"Roundness",ja:"丸み"},min:0,max:1,step:.01,default:1,index:2}],Halftone:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:5,max:200,step:1,default:50,index:0},{key:"angle",label:{en:"Angle",ja:"角度"},min:-45,max:45,step:1,default:15,index:1},{key:"contrast",label:{en:"Contrast",ja:"コントラスト"},min:.5,max:5,step:.1,default:2,index:2}],Mosaic:[{key:"blocksX",label:{en:"Blocks X",ja:"横ブロック数"},min:2,max:100,step:1,default:16,index:0},{key:"blocksY",label:{en:"Blocks Y",ja:"縦ブロック数"},min:2,max:100,step:1,default:16,index:1},{key:"scale",label:{en:"Noise Scale",ja:"柄のサイズ"},min:.5,max:10,step:.1,default:2,index:2}],VoronoiFluid:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:20,step:.5,default:5,index:0},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:5,step:.1,default:1,index:1},{key:"smoothness",label:{en:"Smoothness",ja:"滑らかさ"},min:.01,max:.5,step:.01,default:.1,index:2}],Grain:[{key:"strength",label:{en:"Strength",ja:"強さ"},min:0,max:1,step:.01,default:.5,index:0},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:30,step:1,default:10,index:1}],DistortionWave:[{key:"frequency",label:{en:"Frequency",ja:"波の数"},min:1,max:30,step:.5,default:10,index:0},{key:"amplitude",label:{en:"Amplitude",ja:"歪みの強さ"},min:0,max:.5,step:.01,default:.05,index:1},{key:"baseScale",label:{en:"Base Scale",ja:"柄のサイズ"},min:1,max:20,step:1,default:5,index:2}],PolarDots:[{key:"rings",label:{en:"Rings",ja:"リング数"},min:1,max:30,step:1,default:5,index:0},{key:"dots",label:{en:"Dots/Ring",ja:"ドット密度"},min:2,max:60,step:1,default:12,index:1},{key:"radius",label:{en:"Radius",ja:"ドットの大きさ"},min:.1,max:1,step:.05,default:.4,index:2}],Crystal:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:20,step:.5,default:5,index:0},{key:"jagged",label:{en:"Jaggedness",ja:"鋭さ"},min:0,max:1,step:.05,default:.5,index:1},{key:"layers",label:{en:"Layers",ja:"重なり"},min:1,max:5,step:1,default:3,index:2}],AbsNoise:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:.5,max:20,step:.5,default:3,index:0},{key:"power",label:{en:"Power",ja:"コントラスト"},min:.1,max:5,step:.1,default:1,index:1},{key:"octaves",label:{en:"Octaves",ja:"細部"},min:1,max:8,step:1,default:4,index:2}],EnergyRing:[{key:"radius",label:{en:"Radius",ja:"半径"},min:.1,max:1,step:.01,default:.4,index:0},{key:"thickness",label:{en:"Thickness",ja:"リングの太さ"},min:.01,max:.5,step:.01,default:.05,index:1},{key:"noiseScale",label:{en:"Noise Scale",ja:"歪みの細かさ"},min:0,max:20,step:.5,default:5,index:2},{key:"power",label:{en:"Power",ja:"発光力"},min:.1,max:5,step:.1,default:1,index:3}],SparkBurst:[{key:"count",label:{en:"Count",ja:"火花の数"},min:5,max:100,step:1,default:30,index:0},{key:"speed",label:{en:"Speed",ja:"速度"},min:.1,max:5,step:.1,default:1,index:1},{key:"len",label:{en:"Length",ja:"火花の長さ"},min:.01,max:.5,step:.01,default:.1,index:2},{key:"width",label:{en:"Width",ja:"火花の太さ"},min:.001,max:.05,step:.001,default:.01,index:3}],Wormhole:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:20,step:.5,default:5,index:0},{key:"speed",label:{en:"Speed",ja:"吸い込み速度"},min:0,max:5,step:.1,default:1,index:1},{key:"voidSize",label:{en:"Void Size",ja:"中心の穴サイズ"},min:0,max:.8,step:.01,default:.1,index:2},{key:"contrast",label:{en:"Contrast",ja:"コントラスト"},min:.5,max:5,step:.1,default:2,index:3}],StarFlare:[{key:"intensity",label:{en:"Intensity",ja:"明るさ"},min:0,max:2,step:.01,default:1,index:0},{key:"spikeWidth",label:{en:"Spike Width",ja:"光の筋の太さ"},min:.001,max:.1,step:.001,default:.01,index:1},{key:"spikeLen",label:{en:"Spike Length",ja:"光の筋の長さ"},min:.1,max:2,step:.01,default:.5,index:2},{key:"haloSize",label:{en:"Halo Size",ja:"ハロの広がり"},min:0,max:1,step:.01,default:.2,index:3}],ImpactLines:[{key:"density",label:{en:"Density",ja:"線の密度"},min:10,max:200,step:1,default:50,index:0},{key:"len",label:{en:"Length Variation",ja:"長さのばらつき"},min:0,max:1,step:.05,default:.5,index:1},{key:"sharpness",label:{en:"Sharpness",ja:"線の細さ"},min:.1,max:5,step:.1,default:1,index:2},{key:"centerClear",label:{en:"Center Clear",ja:"中心の余白"},min:0,max:1,step:.01,default:.2,index:3}],AuraRing:[{key:"radius",label:{en:"Radius",ja:"半径"},min:.1,max:1,step:.01,default:.4,index:0},{key:"thickness",label:{en:"Thickness",ja:"リングの太さ"},min:.01,max:.5,step:.01,default:.05,index:1},{key:"flameScale",label:{en:"Flame Scale",ja:"炎のサイズ"},min:1,max:20,step:.5,default:5,index:2},{key:"rayIntensity",label:{en:"Ray Intensity",ja:"後光の強さ"},min:0,max:5,step:.1,default:1,index:3}],Crescent:[{key:"radius",label:{en:"Radius",ja:"半径"},min:.1,max:1,step:.01,default:.4,index:0},{key:"innerRadius",label:{en:"Inner Radius",ja:"内円の半径"},min:.1,max:1,step:.01,default:.35,index:1},{key:"angle",label:{en:"Angle",ja:"欠ける角度"},min:0,max:360,step:1,default:45,index:2},{key:"softness",label:{en:"Softness",ja:"ぼかし"},min:0,max:.2,step:.001,default:.01,index:3},{key:"glowPower",label:{en:"Glow Power",ja:"グロー強度"},min:0,max:10,step:.1,default:0,index:4},{key:"ringWidth",label:{en:"Ring Width",ja:"リング幅"},min:0,max:.1,step:.001,default:0,index:5}],Glare:[{key:"rays",label:{en:"Rays",ja:"光の筋の数"},min:2,max:16,step:1,default:4,index:0},{key:"width",label:{en:"Width",ja:"筋の太さ"},min:.001,max:.05,step:.001,default:.005,index:1},{key:"len",label:{en:"Length",ja:"筋の長さ"},min:.1,max:2,step:.05,default:1,index:2},{key:"coreInt",label:{en:"Core Intensity",ja:"中心の強さ"},min:.1,max:5,step:.1,default:1.5,index:3}],LaserBeam:[{key:"density",label:{en:"Density",ja:"線の密度"},min:5,max:100,step:1,default:20,index:0},{key:"speed",label:{en:"Speed",ja:"速度"},min:0,max:10,step:.1,default:2,index:1},{key:"heightVar",label:{en:"Height Var",ja:"太さのばらつき"},min:0,max:2,step:.05,default:1,index:2},{key:"glow",label:{en:"Glow",ja:"発光"},min:0,max:5,step:.1,default:1,index:3}],GlitchBlock:[{key:"scaleX",label:{en:"Scale X",ja:"横スケール"},min:1,max:50,step:1,default:10,index:0},{key:"scaleY",label:{en:"Scale Y",ja:"縦スケール"},min:1,max:50,step:1,default:25,index:1},{key:"speed",label:{en:"Speed",ja:"点滅速度"},min:0,max:5,step:.1,default:1,index:2},{key:"density",label:{en:"Density",ja:"ブロック密度"},min:0,max:1,step:.01,default:.2,index:3}],AnalogGlitch:[{key:"lines",label:{en:"Line Count",ja:"走査線数"},min:10,max:100,step:1,default:50,index:0},{key:"speed",label:{en:"Speed",ja:"スピード"},min:0,max:5,step:.1,default:1.5,index:1},{key:"gWidth",label:{en:"Glitch Width",ja:"ノイズ幅"},min:0,max:1,step:.01,default:.3,index:2},{key:"sharpness",label:{en:"Sharpness",ja:"シャープネス"},min:.1,max:5,step:.1,default:2,index:3}],CosmicPortal:[{key:"zoom",label:{en:"Zoom",ja:"ズーム"},min:1,max:10,step:.1,default:2,index:0},{key:"twist",label:{en:"Twist",ja:"渦の強さ"},min:0,max:5,step:.1,default:2.5,index:1},{key:"speed",label:{en:"Evo Speed",ja:"変化の速度"},min:0,max:3,step:.1,default:1,index:2},{key:"detail",label:{en:"Detail",ja:"ディテール"},min:.5,max:3,step:.1,default:1.5,index:3}],CyberBlock:[{key:"grid",label:{en:"Grid Size",ja:"グリッド分割"},min:5,max:100,step:1,default:30,index:0},{key:"speed",label:{en:"Flash Speed",ja:"点滅スピード"},min:0,max:5,step:.1,default:2,index:1},{key:"density",label:{en:"Block Density",ja:"ブロック出現率"},min:0,max:1,step:.01,default:.4,index:2},{key:"blur",label:{en:"Blur",ja:"ぼかし"},min:0,max:.5,step:.01,default:.05,index:3}],ToxicCloud:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:10,step:.1,default:3,index:0},{key:"speed",label:{en:"Speed",ja:"湧き上げ速度"},min:0,max:3,step:.1,default:1,index:1},{key:"octaves",label:{en:"Octaves",ja:"複雑度"},min:1,max:8,step:1,default:4,index:2},{key:"soft",label:{en:"Softness",ja:"もやの濃さ"},min:.1,max:3,step:.1,default:1,index:3}],GeoRelief:[{key:"scale",label:{en:"Scale",ja:"スケール"},min:1,max:20,step:.1,default:5,index:0},{key:"elev",label:{en:"Elevation",ja:"標高・強度"},min:.5,max:3,step:.1,default:1,index:1},{key:"detail",label:{en:"Detail",ja:"細部ディテール"},min:1,max:5,step:.1,default:2.5,index:2},{key:"sharp",label:{en:"Ridge Sharp",ja:"エッジの強調"},min:.1,max:2,step:.1,default:.8,index:3}]};function A(d){const e=new Array(16).fill(0),l=ae[d];return l&&l.forEach(a=>{e[a.index]=a.default}),e}const te={ja:{"Type & Parameters":"テクスチャ・質感 & 基本",Type:"タイプ (Type)",Resolution:"解像度",Time:"時間 (Time)",Animate:"アニメーション化","Polar Conversion":"極座標変換",Invert:"トーン反転",Params:"パラメータ","Reset Params":"パラメータリセット",Toon:"トゥーン・階調化","Toon Shading":"階調化 (Toon)","Dark Steps":"暗部ステップ数","Light Steps":"明部ステップ数",Tiling:"タイリング前処理","Radial Mask":"ビネットマスク",GradationLine:"グラデーションライン",SweepGradient:"円錐グラデーション",Mosaic:"モザイク","Black Bg":"黒背景",Animation:"アニメーション","Post Effects":"ポストエフェクト",Blur:"ぼかし",Sharpen:"シャープネス",Pixelation:"ピクセル化 (モザイク)","Chromatic Aberration":"色収差 (RGBズレ)",Vignette:"周辺減光 (ビネット)",Scanline:"走査線 (スキャンライン)",Kaleidoscope:"万華鏡 (カレイドスコープ)","Mirror Tile":"ミラータイル",Swirl:"渦巻き (スワール)","Edge Detection":"エッジ検出",Strength:"強さ",Size:"サイズ",Density:"密度",Speed:"速度",Segments:"分割数",Rotation:"回転","Mirror X":"X軸反転","Mirror Y":"Y軸反転",Radius:"半径",Thickness:"太さ",Color:"色","Color Balance":"カラー・色調補正","Color Correction":"3色グラデーション",Shadow:"シャドウ (暗部)",Midtone:"ミッドトーン (中間)",Highlight:"ハイライト (明部)","Save PNG":"PNG 保存","Save NormalMap":"ノーマルマップ保存","Save ChannelPack":"チャンネルパック保存","All Types":"テクスチャタイプ一覧","Gradient Ramp":"グラジエントランプ機能",Enable:"有効",LANG_BTN:"🌐 EN","Terms of Use":"利用規約","Save GIF":"GIF 保存","Encoding GIF...":"GIF 保存中...","Seamless Loop":"シームレスループ(β)",EnergyRing:"エナジーリング",SparkBurst:"スパークバースト",Wormhole:"ワームホール",StarFlare:"スターフレア",ImpactLines:"集中線 (インパクト)",AuraRing:"オーラリング",Crescent:"クレセント (三日月)",Glare:"グレア (強い光)",LaserBeam:"レーザービーム",GlitchBlock:"グリッチブロック",AnalogGlitch:"アナロググリッチ (VHS)",CosmicPortal:"コズミックポータル (宇宙の渦)",CyberBlock:"サイバーブロック (明滅四角)",ToxicCloud:"トキシッククラウド (毒雲)",GeoRelief:"ジオレリーフ (地形風)","Layer Settings":"レイヤー設定","Layer List":"レイヤーリスト","Add Layer":"＋ レイヤー追加","Remove Layer":"削除","Move Up":"前面へ (↑)","Move Down":"背面へ (↓)","Blend Mode":"ブレンドモード",Opacity:"不透明度",Normal:"通常 (Normal)",Add:"加算 (Add)",Multiply:"乗算 (Multiply)",Screen:"スクリーン (Screen)",Mask:"マスク (Mask)","Solid Color":"単色 (Solid Color)"},en:{"Type & Parameters":"Type & Parameters",Type:"Type",Resolution:"Resolution",Time:"Time",Animate:"Animate","Polar Conversion":"Polar Conversion",Invert:"Invert Tone",Params:"Params","Reset Params":"Reset Params",Toon:"Toon Shading","Toon Shading":"Toon Enable","Dark Steps":"Dark Steps","Light Steps":"Light Steps",Tiling:"Tiling Pre-process","Radial Mask":"Vignette Mask",GradationLine:"Gradation Line",SweepGradient:"Sweep Gradient",Mosaic:"Mosaic","Black Bg":"Black Bg",Animation:"Animation","Post Effects":"Post Effects",Blur:"Blur",Sharpen:"Sharpen",Pixelation:"Pixelation","Chromatic Aberration":"Chromatic Aberration",Vignette:"Vignette",Scanline:"Scanline",Kaleidoscope:"Kaleidoscope","Mirror Tile":"Mirror Tile",Swirl:"Swirl","Edge Detection":"Edge Detection",Strength:"Strength",Size:"Size",Density:"Density",Speed:"Speed",Segments:"Segments",Rotation:"Rotation","Mirror X":"Mirror X","Mirror Y":"Mirror Y",Radius:"Radius",Thickness:"Thickness",Color:"Color","Color Balance":"Color Balance","Color Correction":"3-Color Gradient",Shadow:"Shadow",Midtone:"Midtone",Highlight:"Highlight","Save PNG":"Save PNG","Save NormalMap":"Save NormalMap","Save ChannelPack":"Save ChannelPack","All Types":"All Texture Types","Gradient Ramp":"Gradient Ramp",Enable:"Enable",LANG_BTN:"🌐 日本語","Terms of Use":"Terms of Use","Save GIF":"Save GIF","Encoding GIF...":"Encoding GIF...","Seamless Loop":"Seamless Loop (Beta)",EnergyRing:"Energy Ring",SparkBurst:"Spark Burst",Wormhole:"Wormhole",StarFlare:"Star Flare",ImpactLines:"Impact Lines",AuraRing:"Aura Ring",Crescent:"Crescent",Glare:"Glare",LaserBeam:"Laser Beam",GlitchBlock:"Glitch Block",AnalogGlitch:"Analog Glitch",CosmicPortal:"Cosmic Portal",CyberBlock:"Cyber Block",ToxicCloud:"Toxic Cloud",GeoRelief:"Geo Relief","Layer Settings":"Layer Settings","Layer List":"Layer List","Add Layer":"+ Add Layer","Remove Layer":"Remove","Move Up":"Move Up (↑)","Move Down":"Move Down (↓)","Blend Mode":"Blend Mode",Opacity:"Opacity",Normal:"Normal",Add:"Add",Multiply:"Multiply",Screen:"Screen",Mask:"Mask","Solid Color":"Solid Color"}};let H=localStorage.getItem("tc_lang")||"ja";function ce(d){te[d]&&(H=d,localStorage.setItem("tc_lang",d))}function pe(){return H}function v(d){const e=te[H];return e[d]!==void 0?e[d]:d}function ue(d){return typeof d=="string"?d:d[H]||d.en||"Param"}const X={groups:{},sections:{}};function Y(d,e=!0,l=!1){const a=document.createElement("div");a.className="category-group";const t=document.createElement("div");t.className="category-header",l&&(t.style.display="none");const o=document.createElement("span");o.textContent=d;const r=document.createElement("span");r.className="category-arrow",r.textContent=e?"▼":"▶",t.appendChild(o),t.appendChild(r);const s=document.createElement("div");s.className="category-body";const i=X.groups[d],n=i!==void 0?i:e;return!n&&!l&&(s.style.display="none"),r.textContent=n?"▼":"▶",l||t.addEventListener("click",()=>{const p=!(s.style.display!=="none");s.style.display=p?"block":"none",r.textContent=p?"▼":"▶",X.groups[d]=p}),a.appendChild(t),a.appendChild(s),{group:a,body:s}}function V(d,{enabled:e,onToggle:l,defaultOpen:a=!1,hideToggle:t=!1}={}){const o=document.createElement("div");o.className="collapsible-section";const r=document.createElement("div");r.className="section-header",t&&(r.style.cursor="default");const s=document.createElement("div");s.className="section-title-wrap";const i=X.sections[d],n=i!==void 0?i:a,c=document.createElement("span");c.className="section-arrow"+(n||t?" open":""),c.textContent="▶",t&&(c.style.display="none");const p=document.createElement("span");p.className="section-title"+(n||t?" open":""),p.textContent=d,s.appendChild(c),s.appendChild(p),r.appendChild(s);let m=null;if(l!==void 0){const h=document.createElement("label");h.style.display="flex",h.style.alignItems="center",h.style.cursor="pointer",h.addEventListener("click",k=>k.stopPropagation()),m=document.createElement("input"),m.type="checkbox",m.className="section-checkbox",m.checked=!!e,m.addEventListener("change",()=>l(m.checked)),h.appendChild(m),r.appendChild(h)}const g=document.createElement("div");return g.className="section-body",!n&&!t&&(g.style.display="none"),t||r.addEventListener("click",()=>{const k=!(g.style.display!=="none");g.style.display=k?"block":"none",c.classList.toggle("open",k),p.classList.toggle("open",k),X.sections[d]=k}),o.appendChild(r),o.appendChild(g),{el:o,body:g,setEnabled:h=>{m&&(m.checked=h)},updateBody:()=>{m&&(g.style.opacity=m.checked?"1":"0.4",g.style.pointerEvents=m.checked?"":"none")}}}function R(d,e,{min:l,max:a,step:t,onChange:o}){const r=document.createElement("div");r.className="control-row";const s=document.createElement("div");s.className="control-label-row";const i=document.createElement("label");i.className="control-label",i.textContent=d;const n=document.createElement("input");n.type="number",n.className="control-number",n.min=l,n.max=a,n.step=t,n.value=Number(e).toFixed(3),s.appendChild(i),s.appendChild(n);const c=document.createElement("input");return c.type="range",c.className="control-slider",c.min=l,c.max=a,c.step=t,c.value=e,c.addEventListener("input",()=>{const p=parseFloat(c.value);n.value=p.toFixed(3),o(p)}),n.addEventListener("change",()=>{const p=Math.min(a,Math.max(l,parseFloat(n.value)));c.value=p,n.value=p.toFixed(3),o(p)}),r.appendChild(s),r.appendChild(c),{el:r,setValue:p=>{c.value=p,n.value=Number(p).toFixed(3)}}}function ee(d,e,l,a){const t=document.createElement("div");t.className="control-row";const o=document.createElement("label");o.className="control-label",o.textContent=d;const r=document.createElement("select");return r.className="control-select",l.forEach(({value:s,label:i})=>{const n=document.createElement("option");n.value=s,n.textContent=i,r.appendChild(n)}),r.value=e,r.addEventListener("change",()=>a(r.value)),t.appendChild(o),t.appendChild(r),{el:t,setValue:s=>{r.value=s}}}function q(d,e,l){const a=document.createElement("div");a.className="control-checkbox-row";const t=document.createElement("label");t.className="control-label",t.textContent=d;const o=document.createElement("input");return o.type="checkbox",o.className="control-checkbox",o.checked=!!e,o.addEventListener("change",()=>l(o.checked)),a.appendChild(t),a.appendChild(o),{el:a,setValue:r=>{o.checked=r}}}function fe(d,e,l){const a=document.createElement("div");a.className="control-row";const t=document.createElement("label");t.className="control-label",t.textContent=d;const o=document.createElement("input");return o.type="color",o.style.cssText="width:100%;height:22px;border:none;padding:0;border-radius:3px;cursor:pointer;margin-top:2px;",o.value=U(e),o.addEventListener("input",()=>{l(le(o.value))}),a.appendChild(t),a.appendChild(o),{el:a,setValue:r=>{o.value=U(r)}}}function me(d){return ae[d]||[]}function ve(d,e,l,a){d.innerHTML="";const t=document.createElement("div");t.id="layer-list-container",[...e.layers].reverse().forEach((r,s)=>{const i=e.layers.length-1-s,n=document.createElement("div");n.className="layer-item"+(r.id===e.activeLayerId?" selected":""),n.dataset.layerId=r.id;const c=document.createElement("div");c.className="layer-thumb-wrap";const p=document.createElement("canvas");p.width=32,p.height=32,p.className="layer-thumb",p.id=`layer-thumb-${r.id}`,c.appendChild(p);const m=document.createElement("button");m.className="layer-visible-btn"+(r.visible===!1?" off":""),m.innerHTML="",m.title=v("Toggle Visibility"),m.addEventListener("click",_=>{_.stopPropagation(),r.visible=r.visible===!1,a&&a(),l()}),c.appendChild(m),r.visible===!1&&c.classList.add("is-hidden");const g=document.createElement("span");g.className="layer-item-name",g.textContent=r.name,g.addEventListener("dblclick",_=>{_.stopPropagation();const u=document.createElement("input");u.type="text",u.className="layer-item-name-input",u.value=r.name,n.replaceChild(u,g),u.focus(),u.select();const b=()=>{r.name=u.value||`Layer ${i+1}`,n.replaceChild(g,u),a&&a()};u.addEventListener("blur",b),u.addEventListener("keydown",y=>{y.key==="Enter"&&b()})});const h=document.createElement("div");h.className="layer-controls";const k=document.createElement("button");k.className="layer-ctrl-btn",k.textContent="▲",k.title=v("Move Up"),k.addEventListener("click",_=>{if(_.stopPropagation(),i<e.layers.length-1){const u=e.layers[i];e.layers[i]=e.layers[i+1],e.layers[i+1]=u,a&&a(),l()}});const j=document.createElement("button");j.className="layer-ctrl-btn",j.textContent="▼",j.title=v("Move Down"),j.addEventListener("click",_=>{if(_.stopPropagation(),i>0){const u=e.layers[i];e.layers[i]=e.layers[i-1],e.layers[i-1]=u,a&&a(),l()}});const E=document.createElement("button");E.className="layer-ctrl-btn",E.textContent="✕",E.title=v("Remove Layer"),E.style.color="#ff4444",E.addEventListener("click",_=>{_.stopPropagation(),e.layers.length>1&&(e.layers.splice(i,1),e.activeLayerId===r.id&&(e.activeLayerId=e.layers[Math.max(0,i-1)].id),a&&a(),l())}),h.appendChild(k),h.appendChild(j),h.appendChild(E),n.appendChild(c),n.appendChild(g),n.appendChild(h),n.addEventListener("click",()=>{e.activeLayerId=r.id,a&&a(),l()}),t.appendChild(n)}),d.appendChild(t)}function ye(d,e,l,a){d.innerHTML="";const t=e.layers.find(x=>x.id===e.activeLayerId)||e.layers[0],{group:o,body:r}=Y(v("Layer Settings"),!0),s=document.createElement("div");s.className="control-row";const i=document.createElement("label");i.className="control-label",i.textContent=v("Layer Name");const n=document.createElement("input");n.type="text",n.className="control-input",n.style.width="100%",n.value=t.name,n.addEventListener("change",()=>{t.name=n.value||v("Layer"),a&&a()}),n.addEventListener("keydown",x=>{x.key==="Enter"&&(t.name=n.value||v("Layer"),n.blur())}),s.appendChild(i),s.appendChild(n),r.appendChild(s);const{el:c}=ee(v("Blend Mode"),t.blendMode,[{value:"normal",label:v("Normal")},{value:"add",label:v("Add")},{value:"multiply",label:v("Multiply")},{value:"screen",label:v("Screen")},{value:"mask",label:v("Mask")}],x=>{t.blendMode=x,l()});r.appendChild(c);const{el:p}=R(v("Opacity"),t.opacity,{min:0,max:1,step:.01,onChange:x=>{t.opacity=x,l()}});r.appendChild(p);const{el:m}=q(v("Solid Color"),t.solidColorEnabled,x=>{t.solidColorEnabled=x,a&&a(),l()});if(r.appendChild(m),t.solidColorEnabled){t.solidColor||(t.solidColor=[1,1,1]);const{el:x}=fe(v("Color"),t.solidColor,se=>{t.solidColor=se,l()});r.appendChild(x)}d.appendChild(o);const{group:g,body:h}=Y(v("Type & Parameters"),!0),k=O.map(x=>({value:x,label:x})),{el:j}=ee(v("Type"),t.type,k,x=>{t.type=x,t.typeParams=A(x),a&&a(),l()});h.appendChild(j);const{el:E}=q(v("Polar Conversion"),t.polarConversion,x=>{t.polarConversion=x,l()});h.appendChild(E);const{el:_}=q(v("Invert"),t.invertEnable,x=>{t.invertEnable=x,l()});h.appendChild(_);const u=V(v("Transform"),{defaultOpen:!1}),{el:b}=R("Offset X",t.offsetX!==void 0?t.offsetX:0,{min:-5,max:5,step:.01,onChange:x=>{t.offsetX=x,l()}});u.body.appendChild(b);const{el:y}=R("Offset Y",t.offsetY!==void 0?t.offsetY:0,{min:-5,max:5,step:.01,onChange:x=>{t.offsetY=x,l()}});u.body.appendChild(y);const{el:w}=R("Scale X",t.scaleX!==void 0?t.scaleX:1,{min:.01,max:10,step:.01,onChange:x=>{t.scaleX=x,l()}});u.body.appendChild(w);const{el:S}=R("Scale Y",t.scaleY!==void 0?t.scaleY:1,{min:.01,max:10,step:.01,onChange:x=>{t.scaleY=x,l()}});u.body.appendChild(S);const{el:C}=R("Rotation",t.rotation!==void 0?t.rotation:0,{min:-180,max:180,step:1,onChange:x=>{t.rotation=x,l()}});u.body.appendChild(C);const{el:B}=R("Scroll X",t.scrollX!==void 0?t.scrollX:0,{min:-5,max:5,step:.01,onChange:x=>{t.scrollX=x,l()}});u.body.appendChild(B);const{el:D}=R("Scroll Y",t.scrollY!==void 0?t.scrollY:0,{min:-5,max:5,step:.01,onChange:x=>{t.scrollY=x,l()}});u.body.appendChild(D);const M=document.createElement("div");M.className="control-row",M.style.marginTop="8px";const W=document.createElement("button");W.className="reset-btn",W.style.cssText="width:100%; padding:4px; cursor:pointer; background:#444; color:#fff; border:1px solid #666; border-radius:3px; font-size:12px;",W.textContent=v("Reset Transform"),W.addEventListener("click",()=>{t.offsetX=0,t.offsetY=0,t.scaleX=1,t.scaleY=1,t.rotation=0,t.scrollX=0,t.scrollY=0,a&&a(),l()}),M.appendChild(W),u.body.appendChild(M),h.appendChild(u.el),xe(h,t,l,a),d.appendChild(g)}function xe(d,e,l,a){const t=d.querySelector("#param-section");t&&t.remove();const o=document.createElement("div");o.id="param-section",o.style.marginTop="6px";const r=V(`${e.type} Params`,{defaultOpen:!0}),s=me(e.type),i=e.typeParams instanceof Array?e.typeParams:new Array(16).fill(0);s.forEach(({label:c,index:p,min:m,max:g,step:h})=>{const{el:k}=R(ue(c),i[p]||0,{min:m,max:g,step:h,onChange:j=>{e.typeParams||(e.typeParams=new Array(16).fill(0)),e.typeParams[p]=j,l()}});r.body.appendChild(k)});const n=document.createElement("button");n.textContent=v("Reset Params"),n.className="ge-btn",n.style.marginTop="4px",n.addEventListener("click",()=>{e.typeParams=A(e.type),a&&a(),l()}),r.body.appendChild(n),o.appendChild(r.el),d.appendChild(o)}function he(d,e,l,a){d.innerHTML="",e.layers.find(u=>u.id===e.activeLayerId)||e.layers[0];const{group:t,body:o}=Y(v("Global Settings"),!0,!0),r=document.createElement("div");r.className="control-row";const s=document.createElement("label");s.className="control-label",s.textContent=v("Resolution");const i=document.createElement("select");i.className="control-select",[64,128,256,512,1024,2048].forEach(u=>{const b=document.createElement("option");b.value=u,b.textContent=`${u} × ${u}`,i.appendChild(b)}),i.value=e.resolution,i.addEventListener("change",()=>{e.resolution=parseInt(i.value);const u=document.getElementById("canvas-overlay");u&&(u.textContent=`${e.resolution} × ${e.resolution} px`),l()}),r.appendChild(s),r.appendChild(i),o.appendChild(r);const n=V(v("Animation"),{defaultOpen:!1}),{el:c}=R(v("Time"),e.time,{min:0,max:100,step:.1,onChange:u=>{e.time=u,l()}});n.body.appendChild(c);const{el:p}=q(v("Animate"),e.animate,u=>{e.animate=u,l()});n.body.appendChild(p);const{el:m}=R(v("Speed"),e.animSpeed!==void 0?e.animSpeed:1,{min:0,max:5,step:.01,onChange:u=>{e.animSpeed=u,l()}});n.body.appendChild(m);const{el:g}=R("GIF FPS",e.gifFps||30,{min:1,max:60,step:1,onChange:u=>{e.gifFps=u,l()}});n.body.appendChild(g);const{el:h}=R("GIF Duration (s)",e.gifDuration||2,{min:.5,max:10,step:.1,onChange:u=>{e.gifDuration=u,l()}});n.body.appendChild(h);const{el:k}=q(v("Seamless Loop"),e.gifSeamless!==!1,u=>{e.gifSeamless=u,l()});n.body.appendChild(k),n.body.appendChild(k),o.appendChild(n.el),d.appendChild(t);const{group:j,body:E}=Y(v("Post Effects"),!1,!1);[{key:"blur",label:"Blur",params:[{id:"blurStrength",label:"Strength",min:0,max:200,step:1}]},{key:"bloom",label:"Bloom",params:[{id:"bloomStrength",label:"Strength",min:0,max:5,step:.1}]},{key:"sharpen",label:"Sharpen",params:[{id:"sharpenStrength",label:"Strength",min:0,max:10,step:.1}]},{key:"pixelation",label:"Pixelation",params:[{id:"pixelSize",label:"Size",min:1,max:200,step:1}]},{key:"chromaticAberration",label:"Chromatic Aberration",params:[{id:"chromaticAberration",label:"Strength",min:0,max:.1,step:.001}]},{key:"vignette",label:"Vignette",params:[{id:"vignetteStrength",label:"Strength",min:0,max:2,step:.01},{id:"vignetteSize",label:"Size",min:0,max:2,step:.01},{id:"vignetteColor",label:"Color",type:"color"}]},{key:"scanline",label:"Scanline",params:[{id:"scanlineDensity",label:"Density",min:10,max:500,step:1},{id:"scanlineSpeed",label:"Speed",min:0,max:10,step:.1},{id:"scanlineStrength",label:"Strength",min:0,max:1,step:.01},{id:"scanlineColor",label:"Color",type:"color"}]},{key:"kaleidoscope",label:"Kaleidoscope",params:[{id:"kaleidoSegments",label:"Segments",min:2,max:24,step:1},{id:"kaleidoRotation",label:"Rotation",min:-3.14,max:3.14,step:.01}]},{key:"mirrorTile",label:"Mirror Tile",params:[{id:"mirrorTileX",label:"Mirror X",type:"checkbox"},{id:"mirrorTileY",label:"Mirror Y",type:"checkbox"}]},{key:"swirl",label:"Swirl",params:[{id:"swirlStrength",label:"Strength",min:-10,max:10,step:.1},{id:"swirlRadius",label:"Radius",min:.1,max:2,step:.1}]},{key:"edgeDetection",label:"Edge Detection",params:[{id:"edgeThickness",label:"Thickness",min:.1,max:5,step:.1},{id:"edgeColor",label:"Color",type:"color"}]},{key:"toon",label:"Toon Shading",params:[{id:"toonDark",label:"Dark Steps",min:1,max:16,step:1},{id:"toonLight",label:"Light Steps",min:1,max:16,step:1}]},{key:"color",label:"Color Correction",params:[{id:"colorShadow",label:"Shadow",type:"color"},{id:"colorMidtone",label:"Midtone",type:"color"},{id:"colorHighlight",label:"Highlight",type:"color"}]},{key:"vignetteMask",label:"Radial Mask",params:[]}].forEach(u=>{const b=V(v(u.label),{enabled:e.postEffects[`${u.key}Enabled`],onToggle:y=>{e.postEffects[`${u.key}Enabled`]=y,b.updateBody(),l()},defaultOpen:!1,hideToggle:!1});u.params.forEach(y=>{if(y.type==="color"){const w=document.createElement("div");w.className="control-row";const S=document.createElement("label");S.className="control-label",S.textContent=v(y.label);const C=document.createElement("input");C.type="color",C.style.cssText="width:100%;height:22px;border:none;padding:0;border-radius:3px;cursor:pointer;margin-top:2px;",C.value=U(e.postEffects[y.id]),C.addEventListener("input",()=>{e.postEffects[y.id]=le(C.value),l()}),w.appendChild(S),w.appendChild(C),b.body.appendChild(w)}else if(y.type==="checkbox"){const w=document.createElement("div");w.className="control-row";const S=document.createElement("label");S.style.display="flex",S.style.alignItems="center",S.style.cursor="pointer",S.style.color="#fff",S.style.fontSize="13px";const C=document.createElement("input");C.type="checkbox",C.style.marginRight="8px",C.checked=!!e.postEffects[y.id],C.addEventListener("change",()=>{e.postEffects[y.id]=C.checked,l()}),S.appendChild(C),S.appendChild(document.createTextNode(v(y.label))),w.appendChild(S),b.body.appendChild(w)}else{const{el:w}=R(v(y.label),e.postEffects[y.id],{min:y.min,max:y.max,step:y.step,onChange:S=>{e.postEffects[y.id]=S,l()}});b.body.appendChild(w)}}),b.updateBody(),E.appendChild(b.el)}),d.appendChild(j)}function U(d){if(!d||d.length<3)return"#808080";const e=Math.round(Math.min(1,d[0])*255).toString(16).padStart(2,"0"),l=Math.round(Math.min(1,d[1])*255).toString(16).padStart(2,"0"),a=Math.round(Math.min(1,d[2])*255).toString(16).padStart(2,"0");return`#${e}${l}${a}`}function le(d){const e=parseInt(d.slice(1,3),16)/255,l=parseInt(d.slice(3,5),16)/255,a=parseInt(d.slice(5,7),16)/255;return[e,l,a]}class be{constructor({container:e,onChange:l,initialStops:a}){this.container=e,this.onChange=l,this.stops=a??[{position:0,color:"#000000"},{position:1,color:"#ffffff"}],this.selectedStop=null,this.dragging=!1,this._pendingDblClick=!1,this._build(),this._render()}setStops(e){!e||!Array.isArray(e)||(this.stops=e.map(l=>({...l})),this.selectedStop=null,this._render())}_build(){this.wrapper=document.createElement("div"),this.wrapper.className="gradient-editor",this.wrapper.innerHTML=`
            <div class="ge-label">Gradient Ramp <span class="ge-hint">クリックで追加 / 選択して削除</span></div>
            <div class="ge-canvas-wrap">
                <canvas class="ge-canvas" height="28"></canvas>
                <div class="ge-stops-row"></div>
            </div>
            <div class="ge-color-row">
                <label class="ge-color-label">Stop Color</label>
                <input type="color" class="ge-color-input" value="#ffffff" />
                <button class="ge-btn ge-btn-delete" title="選択中のストップを削除">✕ Delete</button>
                <button class="ge-btn ge-btn-reset">Reset</button>
            </div>
            <div class="ge-presets-label">Presets</div>
            <div class="ge-presets-grid"></div>
        `,this.container.appendChild(this.wrapper),this.canvas=this.wrapper.querySelector(".ge-canvas"),this.stopsRow=this.wrapper.querySelector(".ge-stops-row"),this.colorInput=this.wrapper.querySelector(".ge-color-input"),this.deleteBtn=this.wrapper.querySelector(".ge-btn-delete"),this.presetsGrid=this.wrapper.querySelector(".ge-presets-grid"),this.canvas.addEventListener("click",e=>this._onCanvasClick(e)),this.colorInput.addEventListener("input",e=>{this.selectedStop!==null&&(this.stops[this.selectedStop].color=e.target.value,this._render(),this._notify())}),this.deleteBtn.addEventListener("click",()=>{this.selectedStop!==null&&this.stops.length>2&&(this.stops.splice(this.selectedStop,1),this.selectedStop=null,this._render(),this._notify())}),this.wrapper.querySelector(".ge-btn-reset").addEventListener("click",()=>{this.stops=[{position:0,color:"#000000"},{position:1,color:"#ffffff"}],this.selectedStop=null,this._render(),this._notify()}),this._buildPresets()}_buildPresets(){const e=this._getPresets();Object.entries(e).forEach(([l,a])=>{const t=document.createElement("div");t.className="ge-preset-item",t.title=l;const o=document.createElement("canvas");o.width=60,o.height=16,o.className="ge-preset-thumb";const r=o.getContext("2d"),s=r.createLinearGradient(0,0,60,0);a.forEach(n=>s.addColorStop(Math.min(1,Math.max(0,n.position)),n.color)),r.fillStyle=s,r.fillRect(0,0,60,16);const i=document.createElement("div");i.className="ge-preset-name",i.textContent=l,t.appendChild(o),t.appendChild(i),t.addEventListener("click",()=>{this.stops=a.map(n=>({...n})),this.selectedStop=null,this._render(),this._notify()}),this.presetsGrid.appendChild(t)})}_render(){this._renderCanvasOnly(),this._renderHandles()}_renderCanvasOnly(){const e=this.canvas.offsetWidth||this.canvas.parentElement.offsetWidth||300;this.canvas.width=e;const l=this.canvas.getContext("2d"),a=l.createLinearGradient(0,0,e,0);if(this._sortedStops().forEach(o=>a.addColorStop(Math.min(1,Math.max(0,o.position)),o.color)),l.fillStyle=a,l.fillRect(0,0,e,28),this.deleteBtn){const o=this.selectedStop!==null&&this.stops.length>2;this.deleteBtn.disabled=!o,this.deleteBtn.style.opacity=o?"1":"0.4"}}_updateHandlesPosition(){this._handleElements&&this.stops.forEach((e,l)=>{const a=this._handleElements[l];a&&(a.style.left=`calc(${e.position*100}% - 6px)`,a.style.background=e.color,l===this.selectedStop?a.classList.add("selected"):a.classList.remove("selected"))})}_renderHandles(){this.stopsRow.innerHTML="",this._handleElements=[],this.stops.forEach((e,l)=>{const a=document.createElement("div");a.style.left=`calc(${e.position*100}% - 6px)`,a.style.background=e.color,a.className="ge-handle"+(this.selectedStop===l?" selected":""),a.addEventListener("mousedown",t=>{t.stopPropagation(),this.selectedStop=l,this.colorInput.value=e.color,this._renderCanvasOnly(),this._updateHandlesPosition(),this._pendingDblClick=!1;const o=setTimeout(()=>{if(this._pendingDblClick)return;this.dragging=!0;const s=n=>{if(!this.dragging)return;const c=this.canvas.getBoundingClientRect(),p=Math.min(1,Math.max(0,(n.clientX-c.left)/c.width));this.stops[this.selectedStop].position=p,this._renderCanvasOnly(),this._updateHandlesPosition(),this._notify()},i=()=>{this.dragging=!1,document.removeEventListener("mousemove",s),document.removeEventListener("mouseup",i)};document.addEventListener("mousemove",s),document.addEventListener("mouseup",i)},220),r=()=>{clearTimeout(o),document.removeEventListener("mouseup",r)};document.addEventListener("mouseup",r)}),a.addEventListener("dblclick",t=>{t.stopPropagation(),this._pendingDblClick=!0,this.stops.length>2&&(this.stops.splice(l,1),this.selectedStop=null,this._render(),this._notify())}),this._handleElements[l]=a,this.stopsRow.appendChild(a)})}_onCanvasClick(e){const l=this.canvas.getBoundingClientRect(),a=Math.min(1,Math.max(0,(e.clientX-l.left)/l.width));if(!this.stops.some(o=>Math.abs(o.position-a)<.02)){const o=this._sampleGradientColor(a);this.stops.push({position:a,color:o}),this.selectedStop=this.stops.length-1,this.colorInput.value=o,this._render(),this._notify()}}_sampleGradientColor(e){const l=document.createElement("canvas");l.width=256,l.height=1;const a=l.getContext("2d"),t=a.createLinearGradient(0,0,256,0);this._sortedStops().forEach(n=>t.addColorStop(Math.min(1,Math.max(0,n.position)),n.color)),a.fillStyle=t,a.fillRect(0,0,256,1);const o=Math.floor(e*255),[r,s,i]=a.getImageData(o,0,1,1).data;return`#${r.toString(16).padStart(2,"0")}${s.toString(16).padStart(2,"00")}${i.toString(16).padStart(2,"0")}`}_sortedStops(){return[...this.stops].sort((e,l)=>e.position-l.position)}_findOriginalIdx(e){return this.stops.findIndex(l=>l===e)}_notify(){this.onChange(this.stops)}buildLUT(e=256){const l=document.createElement("canvas");l.width=e,l.height=1;const a=l.getContext("2d"),t=a.createLinearGradient(0,0,e,0);return this._sortedStops().forEach(r=>t.addColorStop(Math.min(1,Math.max(0,r.position)),r.color)),a.fillStyle=t,a.fillRect(0,0,e,1),a.getImageData(0,0,e,1).data}_getPresets(){return{"B/W":[{position:0,color:"#000000"},{position:1,color:"#ffffff"}],Fire:[{position:0,color:"#000000"},{position:.25,color:"#8b0000"},{position:.5,color:"#ff4400"},{position:.75,color:"#ff8800"},{position:.9,color:"#ffcc00"},{position:1,color:"#ffffff"}],Water:[{position:0,color:"#000d1a"},{position:.3,color:"#003366"},{position:.6,color:"#0077cc"},{position:.85,color:"#44bbff"},{position:1,color:"#ccf0ff"}],Plasma:[{position:0,color:"#000022"},{position:.2,color:"#6600cc"},{position:.4,color:"#cc0066"},{position:.6,color:"#ff6600"},{position:.8,color:"#ffff00"},{position:1,color:"#ffffff"}],Lava:[{position:0,color:"#0a0000"},{position:.3,color:"#3d0000"},{position:.5,color:"#cc2200"},{position:.7,color:"#ff6600"},{position:.9,color:"#ffaa00"},{position:1,color:"#ffee88"}],Ice:[{position:0,color:"#000011"},{position:.3,color:"#001133"},{position:.6,color:"#88ddff"},{position:.85,color:"#ccf4ff"},{position:1,color:"#ffffff"}],Nature:[{position:0,color:"#111100"},{position:.3,color:"#224400"},{position:.55,color:"#44aa11"},{position:.8,color:"#88ee44"},{position:1,color:"#eeffcc"}],Neon:[{position:0,color:"#000000"},{position:.25,color:"#ff0066"},{position:.5,color:"#00ffcc"},{position:.75,color:"#ff00ff"},{position:1,color:"#ffffff"}],Sunset:[{position:0,color:"#0a0a2a"},{position:.3,color:"#7a0066"},{position:.55,color:"#ff5500"},{position:.75,color:"#ffaa00"},{position:1,color:"#ffe0aa"}],Gold:[{position:0,color:"#111100"},{position:.3,color:"#442200"},{position:.6,color:"#cc8800"},{position:.85,color:"#ffdd44"},{position:1,color:"#fff8cc"}],Rainbow:[{position:0,color:"#ff0000"},{position:.17,color:"#ff8800"},{position:.33,color:"#ffff00"},{position:.5,color:"#00ff00"},{position:.67,color:"#0088ff"},{position:.83,color:"#8800ff"},{position:1,color:"#ff00ff"}],Toxic:[{position:0,color:"#000000"},{position:.3,color:"#003300"},{position:.6,color:"#00cc33"},{position:.85,color:"#99ff00"},{position:1,color:"#eeffaa"}],Aurora:[{position:0,color:"#000511"},{position:.2,color:"#001133"},{position:.45,color:"#003355"},{position:.65,color:"#00aa88"},{position:.85,color:"#44ffaa"},{position:1,color:"#aaffee"}],Blood:[{position:0,color:"#000000"},{position:.3,color:"#220000"},{position:.6,color:"#880000"},{position:.85,color:"#cc2200"},{position:1,color:"#ff6644"}],Hologram:[{position:0,color:"#000000"},{position:.2,color:"#003344"},{position:.4,color:"#0088cc"},{position:.6,color:"#00eeff"},{position:.8,color:"#88ffff"},{position:1,color:"#eeffff"}],Desert:[{position:0,color:"#1a0d00"},{position:.3,color:"#8b4513"},{position:.6,color:"#daa520"},{position:.85,color:"#f5deb3"},{position:1,color:"#fff8f0"}]}}applyPreset(e){const l=this._getPresets(),a=Object.keys(l).find(t=>t.toLowerCase()===e.toLowerCase());a&&(this.stops=l[a].map(t=>({...t})),this.selectedStop=null,this._render(),this._notify())}resize(){this._render()}}const f={resolution:512,time:0,animate:!1,animSpeed:1,checkerboard:!0,blackBackground:!1,gifFps:30,gifDuration:2,postEffects:{blurEnabled:!1,blurStrength:1,sharpenEnabled:!1,sharpenStrength:1,pixelationEnabled:!1,pixelSize:10,chromaticAberrationEnabled:!1,chromaticAberration:.01,vignetteEnabled:!1,vignetteStrength:.5,vignetteSize:.5,vignetteColor:[0,0,0],scanlineEnabled:!1,scanlineDensity:100,scanlineSpeed:1,scanlineStrength:.5,scanlineColor:[0,0,0],kaleidoscopeEnabled:!1,kaleidoSegments:6,kaleidoRotation:0,mirrorTileEnabled:!1,mirrorTileX:!0,mirrorTileY:!0,swirlEnabled:!1,swirlStrength:3,swirlRadius:.5,edgeDetectionEnabled:!1,edgeThickness:1,edgeColor:[0,1,0],toonEnabled:!1,toonDark:4,toonLight:4,vignetteMaskEnabled:!1,bloomEnabled:!1,bloomStrength:1,colorEnabled:!1,colorShadow:[0,0,0],colorMidtone:[.5,.5,.5],colorHighlight:[1,1,1]},activeLayerId:1,layerCounter:1,layers:[{id:1,name:"Layer 1",type:"Circle",blendMode:"normal",opacity:1,polarConversion:!1,invertEnable:!1,visible:!0,typeParams:A("Circle"),offsetX:0,offsetY:0,scaleX:1,scaleY:1,rotation:0,scrollX:0,scrollY:0,gradEnable:!1,gradStops:[{position:0,color:"#000000"},{position:1,color:"#ffffff"}],solidColorEnabled:!1,solidColor:[1,1,1]}]},L=()=>f.layers.find(d=>d.id===f.activeLayerId)||f.layers[0];let ne,$,F,K,P;function ge(){const d=document.getElementById("preview-canvas");d.width=512,d.height=512,ne=new N(d),_e(),F=document.createElement("canvas"),F.width=32,F.height=32,$=new N(F),G(),document.getElementById("btn-save-png")?.addEventListener("click",je),document.getElementById("btn-save-gif")?.addEventListener("click",Re),document.getElementById("btn-save-normal")?.addEventListener("click",Te),document.getElementById("btn-add-layer-top")?.addEventListener("click",()=>{f.layerCounter++;const e={id:f.layerCounter,name:`Layer ${f.layers.length+1}`,type:"Circle",blendMode:"normal",opacity:1,polarConversion:!1,invertEnable:!1,typeParams:A("Circle"),offsetX:0,offsetY:0,scaleX:1,scaleY:1,rotation:0,scrollX:0,scrollY:0,toonEnable:!1,toonDark:4,toonLight:4,tilingSeamless:!1,tilingRadialMask:!1,colorEnable:!1,colorShadow:[0,0,0],colorMidtone:[.5,.5,.5],colorHighlight:[1,1,1],solidColorEnabled:!1,solidColor:[1,1,1],gradEnable:!1,gradStops:[{position:0,color:"#000000"},{position:1,color:"#ffffff"}],visible:!0};f.layers.push(e),f.activeLayerId=e.id,G(),T()}),Ce(),we(),Ee(),Le(),Me(),Z()}function _e(){const d=document.getElementById("btn-lang-toggle");if(!d)return;const e=()=>{d.textContent=v("LANG_BTN");const l=document.getElementById("btn-save-png");l&&(l.textContent=v("Save PNG"));const a=document.getElementById("btn-save-gif");a&&(a.textContent=v("Save GIF"));const t=document.getElementById("btn-save-normal");t&&(t.textContent=v("Save NormalMap"));const o=document.getElementById("btn-save-pack");o&&(o.textContent=v("Save ChannelPack"));const r=document.getElementById("grad-cat-header");if(r){r.querySelector("label");const n=r.querySelector(".grad-enable-text");n&&(n.textContent=v("Enable")),r.childNodes[0].nodeValue=v("Gradient Ramp")+" "}const s=document.getElementById("label-black-bg");s&&(s.textContent=v("Black Bg"));const i=document.getElementById("link-terms");i&&(i.textContent=v("Terms of Use"))};d.addEventListener("click",()=>{const l=pe()==="ja"?"en":"ja";ce(l),e(),G()}),e()}function G(){ve(document.getElementById("layer-list-container"),f,T,G),ye(document.getElementById("gui-left"),f,T,G),he(document.getElementById("gui-right"),f,T),oe();const d=L();if(K&&d){d.gradStops&&K.setStops(d.gradStops);const e=document.getElementById("grad-enable-toggle");e&&(e.checked=!!d.gradEnable)}}function Z(){ne.render({...f,resolution:512},f.layers),oe();const d=document.getElementById("info-type"),e=document.getElementById("info-res");d&&(d.textContent=`Layers: ${f.layers.length}`),e&&(e.textContent=`${f.resolution}×${f.resolution}`)}function ke(){P&&cancelAnimationFrame(P);let d=performance.now();const e=l=>{const a=(l-d)/1e3;d=l,f.time+=a*(f.animSpeed||1),Z(),f.animate&&(P=requestAnimationFrame(e))};P=requestAnimationFrame(e)}function Se(){P&&cancelAnimationFrame(P),P=null}setInterval(()=>{},100);function T(){f.animate&&!P?ke():!f.animate&&P?Se():f.animate||Z()}function we(){const d=document.getElementById("gradient-editor-area");if(!d)return;K=new be({container:d,initialStops:L().gradStops||[{position:0,color:"#000000"},{position:1,color:"#ffffff"}],onChange:l=>{const a=L();a&&(a.gradStops=l.map(t=>({...t})),a.gradEnable&&T())}});const e=document.getElementById("grad-enable-toggle");e?.addEventListener("change",()=>{const l=L();l&&(l.gradEnable=e.checked,T())})}const z=40;async function Ee(){const d=document.getElementById("thumbnail-grid");if(d){d.innerHTML="";for(const e of O){const l=document.createElement("div"),a=L();l.className="thumbnail-item"+(a&&e===a.type?" selected":""),l.dataset.type=e;const t=`./thumbnails/${e}.png`;l.innerHTML=`<img src="${t}" width="${z}" height="${z}" /><span>${e}</span>`,l.addEventListener("click",()=>{const o=L();o&&(o.type=e,o.typeParams=A(e)),G(),document.querySelectorAll(".thumbnail-item.selected").forEach(r=>r.classList.remove("selected")),l.classList.add("selected"),T()}),d.appendChild(l)}}}function oe(){$&&f.layers.forEach(d=>{const e=document.getElementById(`layer-thumb-${d.id}`);if(!e)return;const l=e.getContext("2d");if(!l)return;const a={...f,resolution:32,postEffects:{...Object.keys(f.postEffects).reduce((t,o)=>(t[o]=o.endsWith("Enabled")?!1:f.postEffects[o],t),{})}};$.render(a,[{...d,blendMode:"normal",opacity:1,solidColorEnabled:!1}]),l.clearRect(0,0,32,32),l.drawImage(F,0,0,32,32)})}function Ce(){const d=document.getElementById("texture-grid-modal"),e=document.getElementById("modal-close-btn"),l=document.getElementById("btn-open-grid-modal"),a=document.getElementById("modal-grid-body");if(!d||!e||!l||!a)return;const t=()=>{d.style.display="none",document.body.style.overflow=""},o=async()=>{d.style.display="flex",document.body.style.overflow="hidden",a.innerHTML="";for(const r of O){const s=document.createElement("div"),i=L();s.className="thumbnail-item"+(i&&r===i.type?" selected":""),s.dataset.type=r;const n=`./thumbnails/${r}.png`;s.innerHTML=`<img src="${n}" width="${z}" height="${z}" /><span>${r}</span>`,s.addEventListener("click",()=>{const c=L();c&&(c.type=r,c.typeParams=A(r)),G(),document.querySelectorAll(".thumbnail-item.selected").forEach(m=>m.classList.remove("selected")),s.classList.add("selected");const p=Array.from(document.querySelectorAll("#thumbnail-grid .thumbnail-item span")).find(m=>m.textContent===r)?.parentElement;p&&p.classList.add("selected"),T(),t()}),a.appendChild(s)}};l.addEventListener("click",o),e.addEventListener("click",t),d.addEventListener("click",r=>{r.target===d&&t()})}function J(){const d=document.createElement("canvas");d.width=f.resolution,d.height=f.resolution;const e=new N(d);return e.render(f,f.layers),{offCanvas:d,offRenderer:e}}function je(){const d=L(),e=d?d.type:"Mixed",{offCanvas:l}=J();I.downloadPNG(l,`texture_${e}_${f.resolution}px.png`)}function Re(){const{offRenderer:d}=J();I.exportGIF(f,f.layers,null,d)}function Te(){const d=L(),e=d?d.type:"Mixed",{offRenderer:l}=J(),a=l.readPixels(),t=I.generateNormalMapFromPixels(a);I.downloadPNG(t,`normal_${e}_${f.resolution}px.png`)}function Le(){const d=document.getElementById("btn-save-preset"),e=document.getElementById("btn-load-preset"),l=document.getElementById("input-load-preset"),a=document.getElementById("chk-black-bg");if(!d||!l||!a)return;a.checked=f.blackBackground||!1,a.addEventListener("change",o=>{f.blackBackground=o.target.checked,T()});const t=document.getElementById("chk-cb-bg");if(t){const o=document.getElementById("preview-canvas"),r=s=>{o&&(s?o.classList.add("checkerboard-bg"):o.classList.remove("checkerboard-bg"))};t.checked=f.checkerboard!==!1,r(t.checked),t.addEventListener("change",s=>{f.checkerboard=s.target.checked,r(s.target.checked),T()})}d.addEventListener("click",()=>{const o={resolution:f.resolution,time:f.time,animSpeed:f.animSpeed,animate:f.animate,checkerboard:f.checkerboard,blackBackground:f.blackBackground,postEffects:f.postEffects,activeLayerId:f.activeLayerId,layerCounter:f.layerCounter,layers:f.layers},r=JSON.stringify(o,null,2),s=new Blob([r],{type:"application/json"}),i=URL.createObjectURL(s),n=document.createElement("a");n.href=i,n.download=`texture_preset_${Date.now()}.json`,n.click(),URL.revokeObjectURL(i)}),e&&e.addEventListener("click",()=>{l.click()}),l.addEventListener("change",o=>{const r=o.target.files[0];if(!r)return;const s=new FileReader;s.onload=i=>{try{const n=JSON.parse(i.target.result);n.resolution&&(f.resolution=n.resolution),n.time!==void 0&&(f.time=n.time),n.animSpeed!==void 0&&(f.animSpeed=n.animSpeed),n.animate!==void 0&&(f.animate=n.animate),n.checkerboard!==void 0&&(f.checkerboard=n.checkerboard),n.blackBackground!==void 0?f.blackBackground=!!n.blackBackground:f.blackBackground=!1,n.postEffects!==void 0&&(f.postEffects={...f.postEffects,...n.postEffects}),n.channelPack!==void 0&&(f.channelPack=n.channelPack),n.activeLayerId!==void 0&&(f.activeLayerId=n.activeLayerId),n.layerCounter!==void 0&&(f.layerCounter=n.layerCounter),n.layers&&Array.isArray(n.layers)&&(f.layers=n.layers);const c=document.getElementById("preview-canvas");c&&(c.width=c.height=512);const p=document.getElementById("canvas-overlay");p&&(p.textContent=`${f.resolution} × ${f.resolution} px`),G(),T()}catch(n){alert("ロードに失敗しました: "+n.message)}},s.readAsText(r),l.value=""})}ge();function Me(){const d=document.getElementById("canvas-area"),e=document.getElementById("preview-canvas-container");if(!d||!e)return;let l=1,a=0,t=0,o=!1,r=0,s=0;const i=()=>{e.style.transform=`translate(${a}px, ${t}px) scale(${l})`};d.addEventListener("wheel",n=>{n.preventDefault();const c=n.deltaY>0?.9:1.1;l=Math.max(.1,Math.min(10,l*c)),i()},{passive:!1}),d.addEventListener("mousedown",n=>{r=n.clientX,s=n.clientY,(n.button===1||n.button===0&&n.altKey)&&(o=!0,d.style.cursor="grabbing",n.preventDefault())}),window.addEventListener("mousemove",n=>{if(!o)return;const c=n.clientX-r,p=n.clientY-s;r=n.clientX,s=n.clientY,o&&(a+=c,t+=p,i())}),window.addEventListener("mouseup",()=>{o=!1,d.style.cursor="crosshair"}),d.addEventListener("contextmenu",n=>{n.altKey&&n.preventDefault()})}window.WebGLRenderer=N;window.TYPE_LIST=O;window.getDefaultParams=A;
