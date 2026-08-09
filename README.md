# LOG-X WMS

Reszponzív, mobil-first ERP/WMS bemutatóalkalmazás valódi Supabase-adattárolással. A projekt a CRUD-műveleteket, a felhasználó- és jogosultságkezelést, a mezőszintű auditot és az adatvezérelt többnyelvűséget demonstrálja.

## Nyilvános változat

- Alkalmazás: https://log-x-wms.onrender.com
- Forráskód: https://github.com/LOG-X2018/log-x-wms
- Supabase-projekt: **LOG-X WMS**, szervezet: **LOG-X Systems Ltd.**, régió: Frankfurt (`eu-central-1`)

A nyilvános oldal közös, módosítható demókörnyezet. A felhasználóváltó jogosultság-demonstráció, nem valódi bejelentkezés, ezért bizalmas vagy személyes adatot ne adj meg benne.

## Fő funkciók

- Teszt-entitások és felhasználók teljes, validált CRUD-kezelése.
- Felhasználónkénti RGB kiemelőszín, világos/sötét/rendszer téma és külön tooltip-kapcsoló.
- Összecsukható jogosultságfa tábla- és mezőszintű `tiltott`, `olvasható`, `módosítható` hozzáféréssel.
- Mezőszerű auditnapló korábbi és új értékekkel, valamint többszintű ÉS/VAGY szűrővel.
- Adatvezérelt magyar, angol és német felület; további nyelvek és fordítások szerkeszthetők.
- Külön, normalizált és többnyelvű kódtárak a legördülő mezőkhöz.
- ERP/WMS mintamodulok: cikktörzs és készlet, készletmozgás, raktárhelyek, bevételezés és kiszállítás.
- Mobilintegrációs demó: kamera, QR/vonalkód, helymeghatározás, tájolás/mozgás, rezgés, megosztás, vágólap, hálózat/akkumulátor, NFC és PWA-telepítés — az eszköz és a böngésző támogatásától függően.
- Mobil-, tablet- és asztali nézet; telepíthető PWA.

## Helyi indítás

Node.js 20 vagy újabb szükséges.

```powershell
npm start
```

Ezután nyisd meg a `http://localhost:3000` címet. Supabase-környezetváltozók nélkül a fejlesztői változat helyi fájlalapú demóállapotot használ.

## Supabase-beállítás

A verziózott sémák a `supabase/migrations` mappában találhatók. Új környezetben:

```powershell
supabase login
supabase link --project-ref <projekt-azonosító>
supabase db push
```

Nyilvános, közös demómód szerveroldali beállításai:

```text
SUPABASE_URL=https://<projekt-azonosító>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_PUBLIC_DEMO_MODE=true
```

Üzemi használathoz kapcsold ki a publikus demómódot, használj valódi Supabase Auth-felhasználókat, és csak a szerveren állíts be `SUPABASE_SECRET_KEY` vagy legacy `SUPABASE_SERVICE_ROLE_KEY` értéket. Titkos kulcsot soha ne tegyél böngészőkódba, GitHubra vagy dokumentációba.

## Render-telepítés

A `render.yaml` Blueprint Node webszolgáltatást ír le. A Supabase URL-t és kulcsot a Render környezeti változóiban kell megadni; a titkos/publikálható kulcs konkrét értéke nincs a repóban. A `main` ág változásai automatikusan települnek, az állapotellenőrzés végpontja: `/api/health`.

## Ellenőrzés

```powershell
npm run check
npm test
```

Az adatbázis-migrációk RLS-t, explicit grantokat, RPC-ket, mezőszintű auditálást, normalizált ERP/WMS táblákat és többnyelvű kódtárakat tartalmaznak. A nyilvános demómód szándékosan közösen írható; éles rendszerhez valódi autentikáció és szigorú, felhasználói JWT-re épülő hozzáférés szükséges.
