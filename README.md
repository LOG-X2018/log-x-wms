# LOG-X WMS

Mobil-first, szürke árnyalatú, clean-line tesztalkalmazás a CRUD, szerepkörök, tábla- és mezőszintű hozzáférés, auditálás, valamint adatvezérelt többnyelvűség validálásához.

## Elkészült funkciók

- Teljes teszt-entitás CRUD; a Mentés csak érvényes és ténylegesen módosított űrlapadatoknál aktív.
- Felhasználó CRUD szerepkör-, aktív állapot- és mezőszintű jogosultságkezeléssel.
- Felhasználónként összecsukható jogosultságfa tábla- és mezőszintű láthatóság, illetve módosíthatóság beállításához.
- Mezőszintű auditnapló több feltételt együttesen kezelő, összetett szűrővel.
- Angol forrásszöveget referenciaként mutató fordításszerkesztő és kulcsonként kezelt, többnyelvű szótárértékek.

## Indítás

Node.js 20+ szükséges. A demo külső függőség nélkül fut:

```powershell
cd 'D:\Visual Studio Code\Logix VMS'
npm start
```

Nyisd meg: `http://localhost:3000`. Az első indítás a `data/db.json` lokális demo-adattárat hozza létre. Az aktív demo felhasználó váltásával azonnal ellenőrizhető a felhasználónként beállított tábla- és mezőhozzáférés. A tiltott területek és mezők nem kerülnek a felületre vagy az API-válaszba. A felület szövegei fordítási kulcsból érkeznek, az értékek magyarul, angolul, németül és további felvett nyelveken szerkeszthetők.

## Supabase beüzemelés

1. Hozd létre a dedikált **LOG-X WMS** Supabase projektet, majd állítsd be a CLI-t (`supabase login`, `supabase link --project-ref ...`).
2. Futtasd: `supabase db push`. Ez feltelepíti a `supabase/migrations/20260808090000_log_x_wms.sql` sémát: profilok, felhasználónkénti tábla- és mezőjogosultságok, RLS, szűrt RPC-k, általános mezőszintű audit triggerek és fordítási táblák.
3. Hozz létre Auth felhasználókat, majd adj nekik `public.profiles` sort admin, editor vagy viewer szerepkörrel. Az alkalmazáskód Supabase adaptere a következő lépésben az `read_test_entities` és `write_test_entity` RPC-kat hívja; ezek RLS mellett is mezőszinten szűrnek.

Az `.env.example` a publikus URL/anon-kulcs helyét dokumentálja. Service role kulcsot soha ne adj a böngészőnek.

## Publikus telepítés

Az alkalmazás nyilvánosan elérhető: https://log-x-wms.onrender.com

A forráskód nyilvános GitHub-repozitóriuma: https://github.com/LOG-X2018/log-x-wms

A Render szolgáltatás a `main` ág új commitjait automatikusan telepíti. A jelenlegi publikus változat a beépített JSON demo-adattárral fut; a felhasználóválasztó szándékosan csak szerepkör-demonstráció, nem valódi bejelentkezés, ezért a demóban nem szabad bizalmas adatot megadni. A tartós, hitelesített adatkezeléshez a dedikált **LOG-X WMS** Supabase projekt létrehozása, migrálása és a Render szolgáltatáshoz kapcsolása még szükséges.

## Ellenőrzés

```powershell
npm run check
npm test
```

## Korlátok

A JSON demo-adattár nem tartós production tároló, és a demó felhasználóváltó nem hitelesítés: egy Render-újraindítás vagy újratelepítés visszaállíthatja a demo-adatokat, és bárki kipróbálhatja az előre megadott szerepköröket. A mellékelt Supabase-migráció a tartós adatmodell és a kényszerített RLS/RPC hozzáférés alapja, de a dedikált Supabase projekt még nincs létrehozva és összekötve a publikus alkalmazással.
