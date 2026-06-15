# Cum rulez jocul (Railway)

Jocul folosește **Socket.io** (WebSocket permanent) și ține partidele în memorie,
deci are nevoie de un **server persistent**. Railway este perfect pentru asta
(rulează un container care nu moare între cereri).

⚠️ NU folosi Vercel serverless pentru server.js — de aceea am șters `vercel.json`.

---

## Deploy pe Railway (ce ai deja)

Pe Railway, ACELAȘI serviciu servește și frontend-ul, și backend-ul, pe domeniul
`https://<proiect>.up.railway.app`. Frontend-ul vorbește cu același server
(`BACKEND_URL = ''`), deci nu mai trebuie nicio adresă separată.

### Ca să intre modificările noi (IMPORTANT)
Pe Railway rulează încă versiunea VECHE. Trebuie să faci **redeploy** cu codul nou:

**Dacă Railway e conectat la GitHub:**
1. Urcă fișierele actualizate în repo (commit + push).
2. Railway pornește automat un deploy nou.

**Dacă folosești Railway CLI:**
```
railway up
```

### Setări Railway (verifică)
- Start command: `node server.js` (sau lasă gol — îl ia din `package.json` → `npm start`).
- Variabilă de mediu: `NODE_ENV=production` (pentru cookie-uri pe HTTPS).
- Portul: NU îl seta manual — serverul folosește deja `process.env.PORT` dat de Railway.

După deploy, deschide URL-ul Railway. Pentru 2 jucători: al doilea într-o
**fereastră Incognito** și cu **alt cont**.

---

## Alternativ — local (pentru test rapid)
1. Instalează Node.js: https://nodejs.org
2. În folderul proiectului: `npm install` apoi `npm start`
3. Deschide `http://localhost:3000`

---

## De ce se deconecta înainte
- Codul vechi de pe Railway termina jocul la orice navigare/deconectare scurtă.
- Backend-ul vechi trimitea abrevieri greșite (`MJ` în loc de `MH`) → un județ lipsea.

Ambele sunt rezolvate în codul nou. Trebuie doar **redeploy pe Railway**.
