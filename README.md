# LOG-X WMS

Mobil-first, szürke árnyalatú, clean-line tesztalkalmazás a CRUD, szerepkörök, tábla- és mezőszintű hozzáférés, auditálás, valamint adatvezérelt többnyelvűség validálásához.

## Indítás

Node.js 20+ szükséges. A demo külső függőség nélkül fut:

```powershell
cd 'D:\Visual Studio Code\Logix VMS'
npm start
```

Nyisd meg: `http://localhost:3000`. Az első indítás a `data/db.json` lokális demo-adattárat hozza létre. Az aktív demo felhasználó váltásával azonnal ellenőrizhető az admin/editor/viewer láthatóság és a mezőtiltás. A felület szövegei fordítási kulcsból érkeznek; a Nyelvek képernyőn új nyelv és fordításérték adható meg.

## Supabase beüzemelés

1. Hozz létre egy Supabase projektet, majd állítsd be a CLI-t (`supabase login`, `supabase link --project-ref ...`).
2. Futtasd: `supabase db push`. Ez feltelepíti a `supabase/migrations/20260808090000_log_x_wms.sql` sémát: profilok/szerepkörök, tábla- és mezőjogosultságok, RLS, RPC-k, audit trigger és fordítási táblák.
3. Hozz létre Auth felhasználókat, majd adj nekik `public.profiles` sort admin, editor vagy viewer szerepkörrel. Az alkalmazáskód Supabase adaptere a következő lépésben az `read_test_entities` és `write_test_entity` RPC-kat hívja; ezek RLS mellett is mezőszinten szűrnek.

Az `.env.example` a publikus URL/anon-kulcs helyét dokumentálja. Service role kulcsot soha ne adj a böngészőnek.

## Publikus telepítés

Készen áll Render Blueprinthoz: a `render.yaml` Node web service-ként indítja a projektet, és a build során lefuttatja az ellenőrzést. Az egyetlen hiányzó következő lépés: jelentkezz be a saját Render-fiókodba, és importáld a projekt Git-repozitóriumát (a Render ekkor a `render.yaml` alapján kiadja a nyilvános URL-t). Supabase használatához a fenti projekt hitelesítő adatai is szükségesek.

## Ellenőrzés

```powershell
npm run check
npm test
```

## Korlátok

A futó alapváltozat szándékosan lokális JSON demo-adattárat használ, hogy Supabase-hitelesítés nélkül is ellenőrizhető legyen. A mellékelt Supabase-migráció a production adatmodell és a kényszerített RLS/RPC hozzáférés alapja; éles csatlakoztatáskor a helyi API adaptert erre kell állítani.
