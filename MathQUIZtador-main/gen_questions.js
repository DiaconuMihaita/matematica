// Generator de întrebări de matematică (clasa XI) cu răspunsuri CALCULATE automat.
// Rulează:  node gen_questions.js   -> rescrie questions/easy|medium|hard.json
const fs = require('fs');
const path = require('path');

function randint(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// --- LaTeX pentru monoame / polinoame ---
function mono(coef, pow) {
  if (coef === 0) return '0';
  const sign = coef < 0 ? '-' : '';
  const a = Math.abs(coef);
  if (pow === 0) return sign + a;
  const cs = (a === 1) ? '' : String(a);
  if (pow === 1) return sign + cs + 'x';
  return sign + cs + 'x^{' + pow + '}';
}
function polyLatex(terms) {
  const t = terms.filter(([c]) => c !== 0).sort((x, y) => y[1] - x[1]);
  if (!t.length) return '0';
  let out = '';
  t.forEach(([c, p]) => {
    const m = mono(Math.abs(c), p);
    if (out === '') out += (c < 0 ? '-' : '') + m;
    else out += (c < 0 ? ' - ' : ' + ') + m;
  });
  return out;
}
function derivTerms(terms) {
  return terms.filter(([, p]) => p >= 1).map(([c, p]) => [c * p, p - 1]);
}
function addConst(b) { return b === 0 ? '' : (b > 0 ? ' + ' + b : ' - ' + (-b)); }

// Construiește o întrebare cu 4 variante amestecate
function buildQ(question, correct, distractors) {
  const opts = [];
  const seen = new Set();
  const add = v => { if (v != null && v !== '' && !seen.has(v)) { seen.add(v); opts.push(v); } };
  add(correct);
  shuffle(distractors).forEach(add);
  // padding dacă nu sunt destule
  let g = 0;
  while (opts.length < 4) { add('$' + (++g) + '$'); }
  const four = opts.slice(0, 4);
  const sh = shuffle(four);
  return { question, answers: sh, correct: sh.indexOf(correct) };
}

// ===================== ȘABLOANE =====================
const T = {};

// Derivata monomului x^n
T.monomial = () => {
  const n = randint(2, 9);
  const correct = '$' + mono(n, n - 1) + '$';
  const d = ['$' + mono(1, n - 1) + '$', '$' + mono(n, n) + '$', '$' + mono(n - 1, n - 1) + '$', '$' + mono(n + 1, n) + '$'];
  return buildQ('Calculați $f\'(x)$ pentru $f(x) = x^{' + n + '}$.', correct, d);
};

// Derivata c·x^n
T.cmonomial = () => {
  const c = randint(2, 7), n = randint(2, 6);
  const correct = '$' + mono(c * n, n - 1) + '$';
  const d = ['$' + mono(c, n - 1) + '$', '$' + mono(c * n, n) + '$', '$' + mono(n, n - 1) + '$', '$' + mono(c * (n - 1), n - 1) + '$'];
  return buildQ('Calculați derivata funcției $f(x) = ' + mono(c, n) + '$.', correct, d);
};

// Derivata polinom grad 2/3
T.poly = () => {
  const deg = pick([2, 3]);
  const terms = [];
  for (let p = deg; p >= 1; p--) terms.push([randint(-5, 5) || 2, p]);
  terms.push([randint(-6, 6), 0]);
  const dv = derivTerms(terms);
  const correct = '$' + polyLatex(dv) + '$';
  const wrong1 = '$' + polyLatex(dv.map(([c, p]) => [c, p + 1])) + '$';
  const wrong2 = '$' + polyLatex(terms.filter(([, p]) => p >= 1)) + '$';
  const wrong3 = '$' + polyLatex(dv.map(([c, p], i) => i === 0 ? [c + 1, p] : [c, p])) + '$';
  return buildQ('Calculați derivata funcției $f(x) = ' + polyLatex(terms) + '$.', correct, [wrong1, wrong2, wrong3]);
};

// Determinant 2x2
T.det2 = () => {
  const a = randint(-6, 6), b = randint(-6, 6), c = randint(-6, 6), d = randint(-6, 6);
  const val = a * d - b * c;
  const correct = '$' + val + '$';
  const dd = ['$' + (a * d + b * c) + '$', '$' + (val + randint(1, 3)) + '$', '$' + (val - randint(1, 3)) + '$', '$' + (b * c - a * d) + '$'];
  const q = 'Determinantul matricei $\\begin{pmatrix} ' + a + ' & ' + b + ' \\\\ ' + c + ' & ' + d + ' \\end{pmatrix}$ este:';
  return buildQ(q, correct, dd);
};

// Limită continuă: lim x->a (m x + b)
T.limLin = () => {
  const m = randint(-4, 4) || 2, b = randint(-6, 6), a = randint(-3, 4);
  const val = m * a + b;
  const correct = '$' + val + '$';
  const dd = ['$' + (val + randint(1, 4)) + '$', '$' + (val - randint(1, 4)) + '$', '$' + (m + b) + '$', '$' + (m * a) + '$'];
  return buildQ('Cât este $\\lim_{x \\to ' + a + '} (' + mono(m, 1) + addConst(b) + ')$?', correct, dd);
};

// Limită factorabilă: lim x->a (x^2 - a^2)/(x-a) = 2a
T.limFactor = () => {
  const a = randint(1, 7);
  const val = 2 * a;
  const correct = '$' + val + '$';
  const dd = ['$' + a + '$', '$' + (a * a) + '$', '$0$', '$' + (val + 2) + '$'];
  return buildQ('Calculați $\\lim_{x \\to ' + a + '} \\dfrac{x^2 - ' + (a * a) + '}{x - ' + a + '}$.', correct, dd);
};

// Limită la infinit (raport coef. dominanți), grad egal
T.limInf = () => {
  const q = randint(1, 5); const k = randint(1, 5); const p = q * k; // p/q = k întreg
  const b1 = randint(-5, 5), b2 = randint(-5, 5);
  const correct = '$' + k + '$';
  const dd = ['$' + q + '$', '$0$', '$\\infty$', '$' + (k + 1) + '$'];
  const num = mono(p, 2) + addConst(b1);
  const den = mono(q, 2) + addConst(b2);
  return buildQ('Calculați $\\lim_{x \\to \\infty} \\dfrac{' + num + '}{' + den + '}$.', correct, dd);
};

// Derivate elementare cu lanț: sin(kx), cos(kx), e^{kx}, ln, sqrt
T.chain = () => {
  const k = randint(2, 5);
  const variants = [
    { q: 'Derivata funcției $f(x) = \\sin(' + k + 'x)$ este:', c: '$' + k + '\\cos(' + k + 'x)$', d: ['$\\cos(' + k + 'x)$', '$' + k + '\\sin(' + k + 'x)$', '$-' + k + '\\cos(' + k + 'x)$'] },
    { q: 'Derivata funcției $f(x) = \\cos(' + k + 'x)$ este:', c: '$-' + k + '\\sin(' + k + 'x)$', d: ['$' + k + '\\sin(' + k + 'x)$', '$-\\sin(' + k + 'x)$', '$' + k + '\\cos(' + k + 'x)$'] },
    { q: 'Derivata funcției $f(x) = e^{' + k + 'x}$ este:', c: '$' + k + 'e^{' + k + 'x}$', d: ['$e^{' + k + 'x}$', '$' + k + 'x e^{' + k + 'x}$', '$e^{' + k + 'x - 1}$'] },
    { q: 'Derivata funcției $f(x) = \\ln(' + k + 'x)$ este:', c: '$\\dfrac{1}{x}$', d: ['$\\dfrac{1}{' + k + 'x}$', '$\\dfrac{' + k + '}{x}$', '$\\ln(' + k + 'x)$'] },
    { q: 'Derivata funcției $f(x) = (' + k + 'x + 1)^2$ este:', c: '$' + (2 * k) + '(' + k + 'x + 1)$', d: ['$2(' + k + 'x + 1)$', '$' + k + '(' + k + 'x+1)$', '$(' + k + 'x+1)^2$'] }
  ];
  const v = pick(variants);
  return buildQ(v.q, v.c, v.d);
};

// Pantă tangentă / f'(p)
T.slope = () => {
  const k = randint(2, 5), p = randint(1, 5);
  const val = k * Math.pow(p, k - 1);
  const correct = '$' + val + '$';
  const dd = ['$' + (Math.pow(p, k)) + '$', '$' + (k * p) + '$', '$' + (val + p) + '$', '$' + (k * Math.pow(p, k)) + '$'];
  return buildQ('Dacă $f(x) = x^{' + k + '}$, cât este $f\'(' + p + ')$?', correct, dd);
};

// Derivata a doua a x^n
T.second = () => {
  const n = randint(2, 7);
  const correct = '$' + mono(n * (n - 1), n - 2) + '$';
  const d = ['$' + mono(n, n - 1) + '$', '$' + mono(n * (n - 1), n - 1) + '$', '$' + mono((n - 1), n - 2) + '$'];
  return buildQ('Derivata a doua a funcției $f(x) = x^{' + n + '}$ este:', correct, d);
};

// Determinant 3x3 (dezvoltare directă)
T.det3 = () => {
  const m = [[randint(-4, 4), randint(-4, 4), randint(-4, 4)], [randint(-4, 4), randint(-4, 4), randint(-4, 4)], [randint(-4, 4), randint(-4, 4), randint(-4, 4)]];
  const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const correct = '$' + det + '$';
  const dd = ['$' + (det + randint(1, 4)) + '$', '$' + (det - randint(1, 4)) + '$', '$' + (-det) + '$', '$0$'];
  const rows = m.map(r => r.join(' & ')).join(' \\\\ ');
  return buildQ('Calculați $\\begin{vmatrix} ' + rows + ' \\end{vmatrix}$.', correct, dd);
};

// Vârf parabolă (minim/maxim) x = -b/2a
T.vertex = () => {
  const a = pick([1, 1, 2]); const x0 = randint(-4, 5); const b = -2 * a * x0; const c = randint(-5, 5);
  const correct = '$x = ' + x0 + '$';
  const dd = ['$x = ' + (-x0) + '$', '$x = ' + (x0 + 1) + '$', '$x = ' + (2 * x0) + '$', '$x = ' + b + '$'];
  const q = 'Pentru ce $x$ funcția $f(x) = ' + polyLatex([[a, 2], [b, 1], [c, 0]]) + '$ are derivata nulă?';
  return buildQ(q, correct, dd);
};

// ---- utilitare suplimentare ----
function fact(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function comb(n, k) { return Math.round(fact(n) / (fact(k) * fact(n - k))); }
function aranj(n, k) { return Math.round(fact(n) / fact(n - k)); }
function mat2(a, b, c, d) { return '\\begin{pmatrix} ' + a + ' & ' + b + ' \\\\ ' + c + ' & ' + d + ' \\end{pmatrix}'; }
function numDistract(v) { return ['$' + (v + 1) + '$', '$' + (v - 1) + '$', '$' + (v + 2) + '$', '$' + (-v) + '$', '$' + (v + randint(2, 5)) + '$']; }

// Limită polinom (continuă) într-un punct
T.limPoly = () => {
  const a = randint(-3, 3), p = randint(1, 4), q = randint(-5, 5), r = randint(-6, 6);
  const val = p * a * a + q * a + r;
  return buildQ('Calculați $\\lim_{x \\to ' + a + '} (' + polyLatex([[p, 2], [q, 1], [r, 0]]) + ')$.', '$' + val + '$', numDistract(val));
};

// Determinant 2x2 (deja există T.det2) — adăugăm transpusa, urma, scalar, sumă, produs
T.transpose = () => {
  const a = randint(-4, 5), b = randint(-4, 5), c = randint(-4, 5), d = randint(-4, 5);
  const correct = '$' + mat2(a, c, b, d) + '$';
  const dd = ['$' + mat2(d, b, c, a) + '$', '$' + mat2(b, a, d, c) + '$', '$' + mat2(a, b, c, d) + '$', '$' + mat2(c, d, a, b) + '$'];
  return buildQ('Transpusa matricei $' + mat2(a, b, c, d) + '$ este:', correct, dd);
};
T.trace = () => {
  const a = randint(-5, 6), b = randint(-5, 6), c = randint(-5, 6), d = randint(-5, 6);
  const val = a + d;
  return buildQ('Urma (suma de pe diagonala principală) a matricei $' + mat2(a, b, c, d) + '$ este:', '$' + val + '$', numDistract(val).concat('$' + (a + b + c + d) + '$'));
};
T.matScalar = () => {
  const k = randint(2, 4), a = randint(-3, 4), b = randint(-3, 4), c = randint(-3, 4), d = randint(-3, 4);
  const correct = '$' + mat2(k * a, k * b, k * c, k * d) + '$';
  const dd = ['$' + mat2(k * a, b, k * c, d) + '$', '$' + mat2(a + k, b + k, c + k, d + k) + '$', '$' + mat2(k * a, k * b, k * c, k * d + 1) + '$'];
  return buildQ('Calculați $' + k + ' \\cdot ' + mat2(a, b, c, d) + '$.', correct, dd);
};
T.matSum = () => {
  const A = [randint(-4, 4), randint(-4, 4), randint(-4, 4), randint(-4, 4)];
  const B = [randint(-4, 4), randint(-4, 4), randint(-4, 4), randint(-4, 4)];
  const S = A.map((v, i) => v + B[i]);
  const correct = '$' + mat2(S[0], S[1], S[2], S[3]) + '$';
  const dd = ['$' + mat2(A[0] - B[0], A[1] - B[1], A[2] - B[2], A[3] - B[3]) + '$', '$' + mat2(S[0] + 1, S[1], S[2], S[3]) + '$', '$' + mat2(S[0], S[1], S[2] + 1, S[3] - 1) + '$'];
  return buildQ('Calculați $' + mat2(A[0], A[1], A[2], A[3]) + ' + ' + mat2(B[0], B[1], B[2], B[3]) + '$.', correct, dd);
};
T.matMul = () => {
  const a = randint(-3, 3), b = randint(-3, 3), c = randint(-3, 3), d = randint(-3, 3);
  const e = randint(-3, 3), f = randint(-3, 3), g = randint(-3, 3), h = randint(-3, 3);
  const p1 = a * e + b * g, p2 = a * f + b * h, p3 = c * e + d * g, p4 = c * f + d * h;
  const correct = '$' + mat2(p1, p2, p3, p4) + '$';
  const dd = ['$' + mat2(a * e, b * f, c * g, d * h) + '$', '$' + mat2(p1 + 1, p2, p3, p4) + '$', '$' + mat2(p4, p3, p2, p1) + '$'];
  return buildQ('Calculați produsul $' + mat2(a, b, c, d) + mat2(e, f, g, h) + '$.', correct, dd);
};

// Logaritmi / puteri
T.logPow = () => {
  const base = pick([2, 3, 5, 10]), k = randint(1, 4);
  const val = Math.pow(base, k);
  return buildQ('Cât este $\\log_{' + base + '} ' + val + '$?', '$' + k + '$', ['$' + val + '$', '$' + base + '$', '$' + (k + 1) + '$', '$' + (k - 1) + '$']);
};
T.powEval = () => {
  const base = pick([2, 3, 5]), exp = base === 2 ? randint(3, 7) : randint(2, 4);
  const val = Math.pow(base, exp);
  return buildQ('Cât este $' + base + '^{' + exp + '}$?', '$' + val + '$', numDistract(val).concat('$' + (base * exp) + '$'));
};
T.factorialQ = () => {
  const n = randint(3, 6); const val = fact(n);
  return buildQ('Cât este $' + n + '!$?', '$' + val + '$', numDistract(val).concat('$' + (n * n) + '$', '$' + fact(n - 1) + '$'));
};

// Combinatorică
T.combC = () => {
  const n = randint(4, 8), k = randint(2, n - 2); const val = comb(n, k);
  return buildQ('Cât este $C_{' + n + '}^{' + k + '}$ (combinări)?', '$' + val + '$', numDistract(val).concat('$' + aranj(n, k) + '$'));
};
T.combA = () => {
  const n = randint(4, 7), k = randint(2, 3); const val = aranj(n, k);
  return buildQ('Cât este $A_{' + n + '}^{' + k + '}$ (aranjamente)?', '$' + val + '$', numDistract(val).concat('$' + comb(n, k) + '$'));
};

// Viète (relațiile lui Viète)
T.viete = () => {
  const b = randint(-7, 7), c = randint(-6, 6);
  const askSum = Math.random() < 0.5;
  const val = askSum ? -b : c;
  const eq = 'x^2 ' + (b >= 0 ? '+ ' + b : '- ' + (-b)) + 'x ' + (c >= 0 ? '+ ' + c : '- ' + (-c)) + ' = 0';
  const txt = askSum ? 'Suma rădăcinilor ecuației $' + eq + '$ este:' : 'Produsul rădăcinilor ecuației $' + eq + '$ este:';
  return buildQ(txt, '$' + val + '$', numDistract(val).concat('$' + b + '$', '$' + (-c) + '$'));
};

// Discriminant
T.discr = () => {
  const a = randint(1, 3), b = randint(-5, 5), c = randint(-4, 4);
  const val = b * b - 4 * a * c;
  return buildQ('Discriminantul ecuației $' + polyLatex([[a, 2], [b, 1], [c, 0]]) + ' = 0$ este:', '$' + val + '$', numDistract(val));
};

// Progresie aritmetică (termen n)
T.arith = () => {
  const a1 = randint(-3, 5), r = randint(2, 5), n = randint(3, 8);
  const val = a1 + (n - 1) * r;
  return buildQ('Într-o progresie aritmetică cu $a_1 = ' + a1 + '$ și rația $r = ' + r + '$, termenul $a_{' + n + '}$ este:', '$' + val + '$', numDistract(val).concat('$' + (a1 + n * r) + '$'));
};
// Progresie geometrică (termen n)
T.geom = () => {
  const a1 = randint(1, 3), q = randint(2, 3), n = randint(2, 4);
  const val = a1 * Math.pow(q, n - 1);
  return buildQ('Într-o progresie geometrică cu $b_1 = ' + a1 + '$ și rația $q = ' + q + '$, termenul $b_{' + n + '}$ este:', '$' + val + '$', numDistract(val).concat('$' + (a1 * Math.pow(q, n)) + '$'));
};

// Valori trigonometrice uzuale
T.trig = () => {
  const data = { 0: { s: '$0$', c: '$1$' }, 30: { s: '$\\dfrac{1}{2}$', c: '$\\dfrac{\\sqrt{3}}{2}$' }, 45: { s: '$\\dfrac{\\sqrt{2}}{2}$', c: '$\\dfrac{\\sqrt{2}}{2}$' }, 60: { s: '$\\dfrac{\\sqrt{3}}{2}$', c: '$\\dfrac{1}{2}$' }, 90: { s: '$1$', c: '$0$' } };
  const ang = pick([0, 30, 45, 60, 90]);
  const fn = pick(['s', 'c']);
  const correct = data[ang][fn];
  const pool = ['$0$', '$\\dfrac{1}{2}$', '$\\dfrac{\\sqrt{2}}{2}$', '$\\dfrac{\\sqrt{3}}{2}$', '$1$'];
  const dd = pool.filter(v => v !== correct);
  return buildQ('Cât este $\\' + (fn === 's' ? 'sin' : 'cos') + ' ' + ang + '^\\circ$?', correct, dd);
};

// ====== Întrebări fixe (concepte) ======
const FIXED_EASY = [
  ['Valoarea $\\ln 1$ este:', '$0$', ['$1$', '$e$', '$-1$']],
  ['Valoarea lui $e^0$ este:', '$1$', ['$0$', '$e$', '$-1$']],
  ['Derivata funcției $f(x) = \\sin x$ este:', '$\\cos x$', ['$-\\cos x$', '$-\\sin x$', '$\\sin x$']],
  ['Derivata funcției $f(x) = \\cos x$ este:', '$-\\sin x$', ['$\\sin x$', '$\\cos x$', '$-\\cos x$']],
  ['Derivata funcției $f(x) = e^x$ este:', '$e^x$', ['$x e^{x-1}$', '$e^{x-1}$', '$1$']],
  ['Derivata funcției $f(x) = \\ln x$ este:', '$\\dfrac{1}{x}$', ['$\\ln x$', '$x$', '$-\\dfrac{1}{x^2}$']],
  ['Derivata funcției $f(x) = \\sqrt{x}$ este:', '$\\dfrac{1}{2\\sqrt{x}}$', ['$\\sqrt{x}$', '$\\dfrac{1}{\\sqrt{x}}$', '$2\\sqrt{x}$']],
  ['Valoarea $\\log_{10} 100$ este:', '$2$', ['$10$', '$100$', '$1$']],
  ['Derivata funcției $f(x) = \\dfrac{1}{x}$ este:', '$-\\dfrac{1}{x^2}$', ['$\\dfrac{1}{x^2}$', '$\\ln x$', '$-\\dfrac{1}{x}$']]
];
const FIXED_MED = [
  ['Calculați $\\lim_{x \\to 0} \\dfrac{\\sin x}{x}$.', '$1$', ['$0$', '$\\infty$', '$\\dfrac{1}{2}$']],
  ['Calculați $\\lim_{x \\to 0} \\dfrac{e^x - 1}{x}$.', '$1$', ['$0$', '$e$', '$\\infty$']],
  ['Derivata funcției $f(x) = \\tan x$ este:', '$\\dfrac{1}{\\cos^2 x}$', ['$\\dfrac{1}{\\sin^2 x}$', '$-\\dfrac{1}{\\cos^2 x}$', '$\\cos^2 x$']],
  ['Derivata funcției $f(x) = x \\ln x$ este:', '$\\ln x + 1$', ['$\\ln x$', '$\\dfrac{1}{x}$', '$1$']],
  ['Derivata funcției $f(x) = \\ln(x^2 + 1)$ este:', '$\\dfrac{2x}{x^2 + 1}$', ['$\\dfrac{1}{x^2 + 1}$', '$\\dfrac{2x}{x^2}$', '$\\dfrac{1}{2x}$']],
  ['Derivata funcției $f(x) = x^2 e^x$ este:', '$(x^2 + 2x)e^x$', ['$2x e^x$', '$x^2 e^x$', '$2x e^{x}$']]
];
const FIXED_HARD = [
  ['Calculați $\\lim_{x \\to 0} \\dfrac{1 - \\cos x}{x^2}$.', '$\\dfrac{1}{2}$', ['$1$', '$0$', '$2$']],
  ['Calculați $\\lim_{x \\to \\infty} \\left(1 + \\dfrac{1}{x}\\right)^x$.', '$e$', ['$1$', '$0$', '$\\infty$']],
  ['Calculați $\\lim_{x \\to 0} \\dfrac{\\ln(1 + x)}{x}$.', '$1$', ['$0$', '$e$', '$\\infty$']],
  ['Derivata funcției $f(x) = e^{x^2}$ este:', '$2x\\,e^{x^2}$', ['$e^{x^2}$', '$2x\\,e^{2x}$', '$x^2 e^{x^2 - 1}$']],
  ['Derivata funcției $f(x) = \\arctan x$ este:', '$\\dfrac{1}{1 + x^2}$', ['$\\dfrac{1}{1 - x^2}$', '$\\dfrac{1}{\\sqrt{1 - x^2}}$', '$\\dfrac{-1}{1 + x^2}$']],
  ['Calculați $\\lim_{x \\to \\infty} \\dfrac{\\ln x}{x}$.', '$0$', ['$1$', '$\\infty$', '$e$']],
  ['Derivata funcției $f(x) = x^x$ (cu $x>0$) este:', '$x^x(\\ln x + 1)$', ['$x \\cdot x^{x-1}$', '$x^x \\ln x$', '$x^x$']],
  ['Calculați $\\lim_{x \\to \\infty} \\left(\\sqrt{x^2 + x} - x\\right)$.', '$\\dfrac{1}{2}$', ['$0$', '$1$', '$\\infty$']]
];

function gen(templates, fixedArr, target) {
  const out = [];
  const seen = new Set();
  fixedArr.forEach(([q, c, d]) => { const item = buildQ(q, c, d); seen.add(q); out.push(item); });
  let attempts = 0;
  while (out.length < target && attempts < target * 60) {
    attempts++;
    const tpl = pick(templates);
    const item = tpl();
    if (seen.has(item.question)) continue;
    if (new Set(item.answers).size !== 4) continue; // toate variantele distincte
    seen.add(item.question);
    out.push(item);
  }
  return out.slice(0, target).map((it, i) => ({ id: i + 1, question: it.question, answers: it.answers, correct: it.correct }));
}

// Pool-uri variate (derivatele sunt doar o mică parte)
const easy = gen([
  T.limLin, T.limPoly, T.det2, T.trace, T.transpose, T.matScalar,
  T.powEval, T.logPow, T.factorialQ, T.combC, T.viete, T.trig,
  T.arith, T.monomial, T.cmonomial
], FIXED_EASY, 120);

const medium = gen([
  T.limFactor, T.limInf, T.limPoly, T.matMul, T.matSum, T.det2,
  T.combA, T.combC, T.arith, T.geom, T.viete, T.discr, T.transpose,
  T.chain, T.slope, T.poly
], FIXED_MED, 110);

const hard = gen([
  T.det3, T.matMul, T.limInf, T.discr, T.geom, T.combC, T.viete,
  T.vertex, T.second, T.chain
], FIXED_HARD, 70);

const dir = path.join(__dirname, 'questions');
fs.writeFileSync(path.join(dir, 'easy.json'), JSON.stringify(easy, null, 1));
fs.writeFileSync(path.join(dir, 'medium.json'), JSON.stringify(medium, null, 1));
fs.writeFileSync(path.join(dir, 'hard.json'), JSON.stringify(hard, null, 1));
console.log('Generat: easy=' + easy.length + ' medium=' + medium.length + ' hard=' + hard.length + ' TOTAL=' + (easy.length + medium.length + hard.length));
