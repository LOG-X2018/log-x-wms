# LOG-X WMS

Mobil-first, szürke árnyalatú, clean-line tesztalkalmazás a CRUD, szerepkörök, tábla- és mezőszintű hozzáférés, auditálás, valamint adatvezérelt többnyelvűség validálásához.

## Indítás

Node.js 20+ szükséges. A demo külső függőség nélkül fut:

```powershell
cd 'D:\Visual Studio Code\Logix VMS'
npm start
```

Nyisd meg: `http://localhost:3000`. Az első indítás a `data/db.json` lokális demo-adattárat hozza létre. Az aktív demo felhasználó váltásával azonnal ellenőrizhető a felhasználónként beállított tábla- és mezőhozzáférés. A Jogosultságok mátrixban külön kapcsolható a láthatóság és a módosíthatóság; a tiltott területek és mezők nem kerülnek a felületre vagy az API-válaszba. A Felhasználók oldalon létrehozás, szerkesztés, aktiválás és törlés érhető el. A felület szövegei fordítási kulcsból érkeznek; a Nyelvek képernyőn új nyelv és fordításérték adható meg.

## Supabase beüzemelés

1. Hozz létre egy Supabase projektet, majd állítsd be a CLI-t (`supabase login`, `supabase link --project-ref ...`).
2. Futtasd: `supabase db push`. Ez feltelepíti a `supabase/migrations/20260808090000_log_x_wms.sql` sémát: profilok, felhasználónkénti tábla- és mezőjogosultságok, RLS, szűrt RPC-k, általános mezőszintű audit triggerek és fordítási táblák.
3. Hozz létre Auth felhasználókat, majd adj nekik `public.profiles` sort admin, editor vagy viewer szerepkörrel. Az alkalmazáskód Supabase adaptere a következő lépésben az `read_test_entities` és `write_test_entity` RPC-kat hívja; ezek RLS mellett is mezőszinten szűrnek.

Az `.env.example` a publikus URL/anon-kulcs helyét dokumentálja. Service role kulcsot soha ne adj a böngészőnek.

## Publikus telepítés

Az alkalmazás nyilvánosan elérhető: https://log-x-wms.onrender.com

A forráskód nyilvános GitHub-repozitóriuma: https://github.com/LOG-X2018/log-x-wms

A Render szolgáltatás a `main` ág új commitjait automatikusan telepíti. Supabase használatához továbbra is egy külön Supabase-projekt és annak hitelesítő adatai szükségesek.

## Ellenőrzés

```powershell
npm run check
npm test
```

## Korlátok

A futó alapváltozat szándékosan lokális JSON demo-adattárat használ, hogy Supabase-hitelesítés nélkül is ellenőrizhető legyen. A módosítások auditja ebben az adattárban működik, de egy Render újraindítás vagy újratelepítés visszaállíthatja a demo-adatokat. A mellékelt Supabase-migráció a tartós production adatmodell és a kényszerített RLS/RPC hozzáférés alapja; éles csatlakoztatáskor a helyi API adaptert erre kell állítani.
