const translations = {
  hu: {
    app_title: 'LOG-X WMS', app_subtitle: 'Adatvezérelt validációs környezet', nav_entities: 'Teszt-entitások', nav_users: 'Felhasználók', nav_permissions: 'Jogosultságok', nav_audit: 'Auditnapló', nav_languages: 'Nyelvek',
    new: 'Új rekord', edit: 'Szerkesztés', delete: 'Törlés', save: 'Mentés', cancel: 'Mégse', actions: 'Műveletek', code: 'Kód', name: 'Név', owner: 'Felelős', status: 'Állapot', risk: 'Kockázat', active: 'Aktív', inactive: 'Inaktív', draft: 'Piszkozat', low: 'Alacsony', medium: 'Közepes', high: 'Magas',
    access: 'Hozzáférés', role: 'Szerepkör', email: 'E-mail', table_access: 'Táblaszint', column_access: 'Mezőszint', read: 'Csak olvasás', write: 'Módosítható', deny: 'Tiltva', actor: 'Ki', table: 'Tábla', field: 'Mező', before: 'Korábbi érték', after: 'Új érték', when: 'Mikor', action: 'Művelet', record: 'Rekord',
    add_language: 'Új nyelv', language_code: 'Nyelvkód', language_name: 'Nyelv neve', translation_key: 'Fordítási kulcs', translation_value: 'Érték', add_user: 'Felhasználó hozzáadása', edit_user: 'Felhasználó szerkesztése', confirm_delete: 'Valóban törlöd ezt a rekordot?', confirm_delete_user: 'Valóban törlöd ezt a felhasználót?',
    no_access: 'Nincs hozzáférésed ehhez a területhez.', demo_user: 'Aktív demo felhasználó', empty: 'Nincs megjeleníthető adat.', close: 'Bezárás', language: 'Nyelv', audit_hint: 'Minden módosítás mezőszinten kerül naplózásra.', permission_hint: 'Felhasználónként állítsd be a táblák és mezők láthatóságát, valamint módosíthatóságát.', saved: 'Sikeresen mentve.', deleted: 'Sikeresen törölve.', admin_only: 'Csak megfelelő jogosultsággal.', visible: 'Láthatja', modifiable: 'Módosíthatja', scope: 'Tábla vagy mező',
    role_admin: 'Adminisztrátor', role_editor: 'Szerkesztő', role_viewer: 'Megtekintő', permissions_locked: 'A saját jogosultságkezelési hozzáférésed nem tiltható le.', create: 'Létrehozás', update: 'Módosítás', remove: 'Törlés', permission_change: 'Jogosultságmódosítás'
  },
  en: {
    app_title: 'LOG-X WMS', app_subtitle: 'Data-driven validation environment', nav_entities: 'Test entities', nav_users: 'Users', nav_permissions: 'Permissions', nav_audit: 'Audit log', nav_languages: 'Languages',
    new: 'New record', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', actions: 'Actions', code: 'Code', name: 'Name', owner: 'Owner', status: 'Status', risk: 'Risk', active: 'Active', inactive: 'Inactive', draft: 'Draft', low: 'Low', medium: 'Medium', high: 'High',
    access: 'Access', role: 'Role', email: 'Email', table_access: 'Table level', column_access: 'Field level', read: 'Read only', write: 'Editable', deny: 'Denied', actor: 'Actor', table: 'Table', field: 'Field', before: 'Before', after: 'After', when: 'When', action: 'Action', record: 'Record',
    add_language: 'Add language', language_code: 'Language code', language_name: 'Language name', translation_key: 'Translation key', translation_value: 'Value', add_user: 'Add user', edit_user: 'Edit user', confirm_delete: 'Delete this record?', confirm_delete_user: 'Delete this user?',
    no_access: 'You do not have access to this area.', demo_user: 'Active demo user', empty: 'No data to display.', close: 'Close', language: 'Language', audit_hint: 'Every change is recorded at field level.', permission_hint: 'Set table and field visibility and editability for each user.', saved: 'Saved successfully.', deleted: 'Deleted successfully.', admin_only: 'Requires sufficient permission.', visible: 'Can view', modifiable: 'Can edit', scope: 'Table or field',
    role_admin: 'Administrator', role_editor: 'Editor', role_viewer: 'Viewer', permissions_locked: 'You cannot remove your own permission-management access.', create: 'Create', update: 'Update', remove: 'Delete', permission_change: 'Permission change'
  },
  de: {
    app_title: 'LOG-X WMS', app_subtitle: 'Datengesteuerte Validierungsumgebung', nav_entities: 'Testentitäten', nav_users: 'Benutzer', nav_permissions: 'Berechtigungen', nav_audit: 'Auditprotokoll', nav_languages: 'Sprachen',
    new: 'Neuer Datensatz', edit: 'Bearbeiten', delete: 'Löschen', save: 'Speichern', cancel: 'Abbrechen', actions: 'Aktionen', code: 'Code', name: 'Name', owner: 'Verantwortlich', status: 'Status', risk: 'Risiko', active: 'Aktiv', inactive: 'Inaktiv', draft: 'Entwurf', low: 'Niedrig', medium: 'Mittel', high: 'Hoch',
    access: 'Zugriff', role: 'Rolle', email: 'E-Mail', table_access: 'Tabellenebene', column_access: 'Feldebene', read: 'Nur lesen', write: 'Bearbeitbar', deny: 'Gesperrt', actor: 'Akteur', table: 'Tabelle', field: 'Feld', before: 'Vorher', after: 'Nachher', when: 'Wann', action: 'Aktion', record: 'Datensatz',
    add_language: 'Sprache hinzufügen', language_code: 'Sprachcode', language_name: 'Sprachname', translation_key: 'Übersetzungsschlüssel', translation_value: 'Wert', add_user: 'Benutzer hinzufügen', edit_user: 'Benutzer bearbeiten', confirm_delete: 'Diesen Datensatz löschen?', confirm_delete_user: 'Diesen Benutzer löschen?',
    no_access: 'Sie haben keinen Zugriff auf diesen Bereich.', demo_user: 'Aktiver Demo-Benutzer', empty: 'Keine Daten vorhanden.', close: 'Schließen', language: 'Sprache', audit_hint: 'Jede Änderung wird auf Feldebene protokolliert.', permission_hint: 'Tabellen- und Feldsichtbarkeit sowie Bearbeitbarkeit pro Benutzer festlegen.', saved: 'Erfolgreich gespeichert.', deleted: 'Erfolgreich gelöscht.', admin_only: 'Entsprechende Berechtigung erforderlich.', visible: 'Sichtbar', modifiable: 'Bearbeitbar', scope: 'Tabelle oder Feld',
    role_admin: 'Administrator', role_editor: 'Bearbeiter', role_viewer: 'Betrachter', permissions_locked: 'Der eigene Zugriff auf die Berechtigungsverwaltung kann nicht entfernt werden.', create: 'Erstellen', update: 'Ändern', remove: 'Löschen', permission_change: 'Berechtigungsänderung'
  }
};

Object.assign(translations.hu, {
  all_roles: 'Minden szerepkör', role_filter: 'Szerepkör szűrése', permission_user: 'Felhasználó', no_field_permissions: 'Ehhez a táblához nincs külön mezőjogosultság.',
  audit_filter_title: 'Összetett szűrő', audit_filter_help: 'Csoportokkal több szintű ÉS/VAGY feltételeket állíthatsz össze.', audit_filter_add: 'Feltétel hozzáadása', audit_filter_add_group: 'Csoport hozzáadása', audit_filter_reset: 'Alaphelyzet', audit_filter_remove: 'Feltétel törlése', audit_filter_remove_group: 'Csoport törlése', audit_filter_join: 'Kapcsolat', audit_filter_group_join: 'Csoportkapcsolat', audit_filter_where: 'Ahol', audit_filter_and: 'ÉS', audit_filter_or: 'VAGY', audit_filter_group: 'Csoport', audit_filter_group_mode: 'Csoporton belül', audit_filter_all_conditions: 'Minden feltétel (ÉS)', audit_filter_any_condition: 'Bármely feltétel (VAGY)', audit_filter_field: 'Mező', audit_filter_operator: 'Feltétel', audit_filter_value: 'Érték', audit_filter_value_placeholder: 'Szűrési érték', audit_filter_select_value: 'Válassz értéket', audit_filter_no_value: 'Nem szükséges érték', audit_filter_empty_rules: 'Még nincs feltétel ebben a csoportban.', audit_filter_results: 'találat', audit_filter_no_results: 'Nincs a feltételeknek megfelelő naplóbejegyzés.',
  audit_filter_operator_contains: 'Tartalmazza', audit_filter_operator_not_contains: 'Nem tartalmazza', audit_filter_operator_equals: 'Egyenlő', audit_filter_operator_not_equals: 'Nem egyenlő', audit_filter_operator_starts_with: 'Ezzel kezdődik', audit_filter_operator_ends_with: 'Erre végződik', audit_filter_operator_is_empty: 'Üres', audit_filter_operator_is_not_empty: 'Nem üres', audit_filter_operator_before: 'Korábbi mint', audit_filter_operator_after: 'Későbbi mint', audit_filter_operator_on_date: 'Adott napon',
  translation_help: 'Válassz célnyelvet; balra az eredeti angol, jobbra a szerkeszthető fordítás látható.', target_language: 'Célnyelv', source_language: 'Forrásnyelv', english_source: 'Eredeti angol', target_translation: 'Kiválasztott nyelv', dropdown_translations: 'Legördülő mezők értékei', dropdown_translation_help: 'Az adatbázis a stabil kódot használja, a felület a nyelvi megnevezést mutatja.', dictionary_key: 'Törzsadat és kód',
  error_required: 'Töltsd ki az összes kötelező mezőt.', error_invalid_option: 'Érvénytelen legördülő érték.', error_duplicate: 'Ez a kód vagy e-mail-cím már használatban van.', error_access: 'Nincs jogosultságod ehhez a művelethez.', error_invalid_language: 'A nyelvkód érvénytelen vagy már létezik.', error_unknown_translation: 'Ismeretlen fordítási kulcs.'
});
Object.assign(translations.en, {
  all_roles: 'All roles', role_filter: 'Filter by role', permission_user: 'User', no_field_permissions: 'This table has no separate field permissions.',
  audit_filter_title: 'Advanced filter', audit_filter_help: 'Build multi-level AND/OR logic with condition groups.', audit_filter_add: 'Add condition', audit_filter_add_group: 'Add group', audit_filter_reset: 'Reset', audit_filter_remove: 'Remove condition', audit_filter_remove_group: 'Remove group', audit_filter_join: 'Join', audit_filter_group_join: 'Group join', audit_filter_where: 'Where', audit_filter_and: 'AND', audit_filter_or: 'OR', audit_filter_group: 'Group', audit_filter_group_mode: 'Inside group', audit_filter_all_conditions: 'All conditions (AND)', audit_filter_any_condition: 'Any condition (OR)', audit_filter_field: 'Field', audit_filter_operator: 'Operator', audit_filter_value: 'Value', audit_filter_value_placeholder: 'Filter value', audit_filter_select_value: 'Select a value', audit_filter_no_value: 'No value required', audit_filter_empty_rules: 'No conditions in this group yet.', audit_filter_results: 'results', audit_filter_no_results: 'No audit entries match these conditions.',
  audit_filter_operator_contains: 'Contains', audit_filter_operator_not_contains: 'Does not contain', audit_filter_operator_equals: 'Equals', audit_filter_operator_not_equals: 'Does not equal', audit_filter_operator_starts_with: 'Starts with', audit_filter_operator_ends_with: 'Ends with', audit_filter_operator_is_empty: 'Is empty', audit_filter_operator_is_not_empty: 'Is not empty', audit_filter_operator_before: 'Before', audit_filter_operator_after: 'After', audit_filter_operator_on_date: 'On date',
  translation_help: 'Choose a target language; the original English is on the left and the editable translation is on the right.', target_language: 'Target language', source_language: 'Source language', english_source: 'Original English', target_translation: 'Selected language', dropdown_translations: 'Dropdown values', dropdown_translation_help: 'The database uses the stable code while the UI shows its localized label.', dictionary_key: 'Dictionary and code',
  error_required: 'Complete every required field.', error_invalid_option: 'Invalid dropdown value.', error_duplicate: 'This code or email address is already in use.', error_access: 'You are not allowed to perform this action.', error_invalid_language: 'The language code is invalid or already exists.', error_unknown_translation: 'Unknown translation key.'
});
Object.assign(translations.de, {
  all_roles: 'Alle Rollen', role_filter: 'Nach Rolle filtern', permission_user: 'Benutzer', no_field_permissions: 'Für diese Tabelle gibt es keine separaten Feldberechtigungen.',
  audit_filter_title: 'Erweiterter Filter', audit_filter_help: 'Erstellen Sie mehrstufige UND/ODER-Logik mit Bedingungsgruppen.', audit_filter_add: 'Bedingung hinzufügen', audit_filter_add_group: 'Gruppe hinzufügen', audit_filter_reset: 'Zurücksetzen', audit_filter_remove: 'Bedingung entfernen', audit_filter_remove_group: 'Gruppe entfernen', audit_filter_join: 'Verknüpfung', audit_filter_group_join: 'Gruppenverknüpfung', audit_filter_where: 'Wo', audit_filter_and: 'UND', audit_filter_or: 'ODER', audit_filter_group: 'Gruppe', audit_filter_group_mode: 'Innerhalb der Gruppe', audit_filter_all_conditions: 'Alle Bedingungen (UND)', audit_filter_any_condition: 'Eine Bedingung (ODER)', audit_filter_field: 'Feld', audit_filter_operator: 'Operator', audit_filter_value: 'Wert', audit_filter_value_placeholder: 'Filterwert', audit_filter_select_value: 'Wert auswählen', audit_filter_no_value: 'Kein Wert erforderlich', audit_filter_empty_rules: 'Noch keine Bedingungen in dieser Gruppe.', audit_filter_results: 'Treffer', audit_filter_no_results: 'Keine Audit-Einträge entsprechen diesen Bedingungen.',
  audit_filter_operator_contains: 'Enthält', audit_filter_operator_not_contains: 'Enthält nicht', audit_filter_operator_equals: 'Ist gleich', audit_filter_operator_not_equals: 'Ist nicht gleich', audit_filter_operator_starts_with: 'Beginnt mit', audit_filter_operator_ends_with: 'Endet mit', audit_filter_operator_is_empty: 'Ist leer', audit_filter_operator_is_not_empty: 'Ist nicht leer', audit_filter_operator_before: 'Vor', audit_filter_operator_after: 'Nach', audit_filter_operator_on_date: 'Am Datum',
  translation_help: 'Wählen Sie eine Zielsprache; links steht das englische Original, rechts die bearbeitbare Übersetzung.', target_language: 'Zielsprache', source_language: 'Quellsprache', english_source: 'Englisches Original', target_translation: 'Ausgewählte Sprache', dropdown_translations: 'Werte der Auswahllisten', dropdown_translation_help: 'Die Datenbank verwendet den stabilen Code, die Oberfläche zeigt die lokalisierte Bezeichnung.', dictionary_key: 'Stammdaten und Code',
  error_required: 'Füllen Sie alle Pflichtfelder aus.', error_invalid_option: 'Ungültiger Auswahllistenwert.', error_duplicate: 'Dieser Code oder diese E-Mail-Adresse wird bereits verwendet.', error_access: 'Sie sind zu dieser Aktion nicht berechtigt.', error_invalid_language: 'Der Sprachcode ist ungültig oder bereits vorhanden.', error_unknown_translation: 'Unbekannter Übersetzungsschlüssel.'
});
Object.assign(translations.hu, { error_invalid_email: 'Adj meg érvényes e-mail-címet.', error_invalid_user: 'Érvénytelen felhasználói adat vagy szerepkör.', error_invalid_permission: 'Érvénytelen jogosultsági beállítás.', error_protected_admin: 'Az aktuális vagy az utolsó aktív adminisztrátor nem tiltható le és nem törölhető.', error_not_found: 'A kért rekord nem található.', error_server: 'Váratlan szerverhiba történt.' });
Object.assign(translations.en, { error_invalid_email: 'Enter a valid email address.', error_invalid_user: 'Invalid user value or role.', error_invalid_permission: 'Invalid permission setting.', error_protected_admin: 'The current or last active administrator cannot be disabled or deleted.', error_not_found: 'The requested record was not found.', error_server: 'An unexpected server error occurred.' });
Object.assign(translations.de, { error_invalid_email: 'Geben Sie eine gültige E-Mail-Adresse ein.', error_invalid_user: 'Ungültiger Benutzerwert oder Rolle.', error_invalid_permission: 'Ungültige Berechtigungseinstellung.', error_protected_admin: 'Der aktuelle oder letzte aktive Administrator kann nicht deaktiviert oder gelöscht werden.', error_not_found: 'Der angeforderte Datensatz wurde nicht gefunden.', error_server: 'Ein unerwarteter Serverfehler ist aufgetreten.' });
Object.assign(translations.hu, { demo_security_warning: 'Nyilvános demó: a felhasználóváltó nem valódi bejelentkezés. Ne adj meg bizalmas adatot.' });
Object.assign(translations.en, { demo_security_warning: 'Public demo: the user switcher is not real authentication. Do not enter sensitive data.' });
Object.assign(translations.de, { demo_security_warning: 'Öffentliche Demo: Der Benutzerwechsel ist keine echte Anmeldung. Geben Sie keine vertraulichen Daten ein.' });

Object.assign(translations.hu, {
  nav_operations: 'ERP / WMS műveletek', nav_mobile_demo: 'Mobil integrációk', primary_navigation: 'Elsődleges navigáció',
  theme: 'Megjelenés', theme_system: 'Rendszer szerint', theme_light: 'Világos', theme_dark: 'Sötét', tooltip_toggle: 'Mezősúgók', highlightColor: 'Alkalmazás kiemelőszíne (RGB)', persistence_supabase: 'Supabase · tartós adat', persistence_demo: 'Helyi demó adattár',
  form_validation_hint: 'A mentéshez töltsd ki helyesen a kötelező mezőket.', form_validation_ready: 'Az űrlap érvényes és menthető.', validation_required: 'Ez a mező kötelező.', validation_email: 'Adj meg érvényes e-mail-címet.', validation_pattern: 'Az érték formátuma nem megfelelő.',
  tooltip_code: 'Stabil, egyedi üzleti azonosító.', tooltip_name: 'A felületen megjelenő megnevezés.', tooltip_owner: 'A rekord üzleti felelőse.', tooltip_status: 'A többnyelvű státusztörzsből választott kód.', tooltip_risk: 'A többnyelvű kockázati törzsből választott kód.', tooltip_email: 'Érvényes, egyedi e-mail-cím.', tooltip_role: 'A felhasználó alap jogosultsági szintje.', tooltip_active: 'Csak aktív rekord használható a napi működésben.', tooltip_highlightColor: 'Az aktív felhasználóhoz tartozó RGB kiemelőszín.', tooltip_language_code: 'Két–nyolc betűs, egyedi nyelvkód.', tooltip_language_name: 'A nyelv megjelenő neve.', tooltip_operations: 'Jogosultságvezérelt ERP- és raktári mintafolyamatok.', tooltip_mobile_demo: 'Az eszköz képességeit biztonságos, kézi indítású próbákkal ellenőrzi.',
  sku: 'Cikkszám', unit: 'Mértékegység', onHand: 'Készlet', reorderPoint: 'Újrarendelési pont', itemId: 'Cikk', locationId: 'Tárhely', type: 'Típus', quantity: 'Mennyiség', reference: 'Hivatkozás', note: 'Megjegyzés', occurredAt: 'Mozgás ideje', capacity: 'Kapacitás', receiptNo: 'Bevételezés száma', supplier: 'Beszállító', receivedAt: 'Átvétel ideje', orderNo: 'Rendelésszám', customer: 'Vevő', priority: 'Prioritás', shipBy: 'Szállítási határidő',
  tooltip_sku: 'A cikk stabil, egyedi azonosítója.', tooltip_unit: 'A többnyelvű mértékegységtörzs kódja.', tooltip_onHand: 'A könyvelt mozgásokból számított aktuális készlet.', tooltip_reorderPoint: 'Az a készletszint, amely alatt utánpótlás javasolt.', tooltip_itemId: 'A cikk törzsrekordjára mutató kapcsolat.', tooltip_locationId: 'A raktári tárhely rekordjára mutató kapcsolat.', tooltip_type: 'A megfelelő többnyelvű típustörzsből választott érték.', tooltip_quantity: 'Pozitív könyvelési mennyiség.', tooltip_reference: 'Külső bizonylat vagy folyamat hivatkozása.', tooltip_note: 'Szabad szöveges, opcionális megjegyzés.', tooltip_occurredAt: 'A készletmozgás üzleti időpontja.', tooltip_capacity: 'A tárhely tervezett maximális kapacitása.', tooltip_receiptNo: 'A beérkező szállítmány egyedi bizonylatszáma.', tooltip_supplier: 'A szállítmányt küldő üzleti partner.', tooltip_receivedAt: 'A tényleges vagy tervezett átvétel időpontja.', tooltip_orderNo: 'A kimenő rendelés egyedi bizonylatszáma.', tooltip_customer: 'A rendelés vevője vagy címzettje.', tooltip_priority: 'A többnyelvű prioritástörzs kódja.', tooltip_shipBy: 'A vállalt kiszállítás dátuma.',
  erp_intro: 'Élő adatkapcsolatra épülő készlet-, tárhely-, bevételezési és kiszállítási mintafolyamatok.', erp_kpi_inventory_lines: 'Aktív cikktörzs', erp_kpi_units_on_hand: 'Összes készlet', erp_kpi_receipts: 'Nyitott bevételezések', erp_kpi_orders: 'Nyitott rendelések', erp_kpi_master_data: 'Törzsadat-rekord', erp_kpi_live_balance: 'Mozgásokból számítva', erp_kpi_open: 'Folyamatban',
  wms_inventory_items: 'Cikk- és készlettörzs', wms_stock_movements: 'Készletmozgások', wms_warehouse_locations: 'Raktári tárhelyek', wms_inbound_receipts: 'Bevételezések', wms_outbound_orders: 'Kimenő rendelések', wms_inventory_help: 'Cikkszám, mértékegység és mozgásokból képzett készlet.', wms_movements_help: 'Bevételezés, kiadás és készletkorrekció negatív készlet elleni védelemmel.', wms_locations_help: 'Fogadó-, tároló-, komissiózó- és expediálóhelyek.', wms_inbound_help: 'Beszállítói beérkezések és cél tárhelyek követése.', wms_outbound_help: 'Vevői rendelések, prioritások és határidők kezelése.', wms_select_item: 'Válassz cikket', wms_select_location: 'Válassz tárhelyet', wms_module_badge: 'WMS / ERP',
  mobile_demo_intro: 'Ellenőrizd, mit támogat az aktuális telefon, tablet vagy böngésző.', mobile_permission_notice: 'Engedélykérés csak a hozzá tartozó próbagomb megnyomásakor történik; az app nem indít eszközfunkciót automatikusan.', mobile_supported: 'Támogatott', mobile_unsupported: 'Nem támogatott', mobile_ready_to_test: 'Próbára kész.', mobile_permission_denied: 'Az eszközengedélyt nem kaptuk meg.', mobile_action_failed: 'A próba ezen az eszközön nem hajtható végre.',
  mobile_camera_title: 'Kamera', mobile_camera_help: 'Hátsó kamera használata áru- és bizonylatfotózáshoz.', mobile_camera_action: 'Kamera indítása', mobile_camera_preview: 'Élő kamerakép', mobile_camera_stop: 'Kamera leállítása', mobile_camera_active: 'A kamera aktív.', mobile_camera_stopped: 'A kamera leállt.',
  mobile_barcode_title: 'Vonalkód és QR', mobile_barcode_help: 'Kód felismerése az élő kameraképből, ha a böngésző támogatja.', mobile_barcode_action: 'Kód beolvasása', mobile_barcode_result: 'Felismert kód', mobile_barcode_none: 'Nem található kód a képen.',
  mobile_location_title: 'Helymeghatározás', mobile_location_help: 'GPS-koordináta rögzítése telephelyi vagy fuvarfolyamathoz.', mobile_location_action: 'Pozíció lekérése', mobile_location_result: 'Pozíció',
  mobile_sensors_title: 'Tájolás és mozgás', mobile_sensors_help: 'Giroszkóp-, tájolás- és mozgásszenzorok kipróbálása.', mobile_sensors_action: 'Szenzorok indítása', mobile_sensors_active: 'A szenzorfigyelés aktív.', mobile_orientation_values: 'Tájolás', mobile_motion_values: 'Mozgás',
  mobile_vibration_title: 'Rezgés', mobile_vibration_help: 'Haptikus visszajelzés sikeres szkenneléshez vagy hibához.', mobile_vibration_action: 'Rezgés tesztelése', mobile_vibration_done: 'A rezgési minta elküldve.',
  mobile_share_title: 'Megosztás', mobile_share_help: 'A rendszermegosztó megnyitása rendelés vagy hivatkozás továbbításához.', mobile_share_action: 'Megosztás', mobile_share_text: 'LOG-X WMS mobil demó', mobile_share_done: 'A megosztás befejeződött.',
  mobile_clipboard_title: 'Vágólap', mobile_clipboard_help: 'Cikkszámok és hivatkozások biztonságos másolása.', mobile_clipboard_action: 'Cím másolása', mobile_clipboard_done: 'A cím a vágólapra került.',
  mobile_connectivity_title: 'Hálózat és akkumulátor', mobile_connectivity_help: 'Kapcsolati állapot, hálózattípus és – ahol elérhető – töltöttség.', mobile_connectivity_action: 'Állapot lekérése', mobile_online: 'Online', mobile_offline: 'Offline', mobile_network_type: 'Hálózat', mobile_battery_level: 'Akkumulátor', mobile_charging: 'Töltés alatt',
  mobile_nfc_title: 'NFC', mobile_nfc_help: 'NFC-címke olvasása támogatott Android-eszközön.', mobile_nfc_action: 'NFC-olvasás', mobile_nfc_waiting: 'Érints NFC-címkét a készülékhez.', mobile_nfc_detected: 'NFC-címke érzékelve', mobile_nfc_tag: 'Címke',
  mobile_install_title: 'Telepíthető alkalmazás', mobile_install_help: 'A PWA a kezdőképernyőre telepíthető, és az alkalmazáskeret offline is betöltődik.', mobile_install_action: 'Telepítés', mobile_install_installed: 'Az alkalmazás már telepítve van.', mobile_install_browser_help: 'A böngésző menüjében válaszd a Kezdőképernyőhöz adás vagy Alkalmazás telepítése lehetőséget.', mobile_install_accepted: 'A telepítés elindult.', mobile_install_dismissed: 'A telepítés most elmaradt.', error_invalid_number: 'Adj meg érvényes pozitív számot.', error_invalid_reference: 'Válassz létező kapcsolt rekordot.', error_negative_stock: 'A művelet negatív készletet eredményezne.', error_referenced_record: 'A rekord nem törölhető, mert más bizonylat hivatkozik rá.', error_calculated_field: 'A számított készlet csak készletmozgással változtatható.'
});

Object.assign(translations.en, {
  nav_operations: 'ERP / WMS operations', nav_mobile_demo: 'Mobile integrations', primary_navigation: 'Primary navigation',
  theme: 'Appearance', theme_system: 'Use system', theme_light: 'Light', theme_dark: 'Dark', tooltip_toggle: 'Field help', highlightColor: 'App highlight color (RGB)', persistence_supabase: 'Supabase · persistent data', persistence_demo: 'Local demo store',
  form_validation_hint: 'Complete all required fields correctly to save.', form_validation_ready: 'The form is valid and ready to save.', validation_required: 'This field is required.', validation_email: 'Enter a valid email address.', validation_pattern: 'The value has an invalid format.',
  tooltip_code: 'Stable, unique business identifier.', tooltip_name: 'The name shown in the interface.', tooltip_owner: 'The business owner of the record.', tooltip_status: 'Code selected from a multilingual status dictionary.', tooltip_risk: 'Code selected from a multilingual risk dictionary.', tooltip_email: 'Valid, unique email address.', tooltip_role: 'The user’s base access level.', tooltip_active: 'Only active records are available in daily operation.', tooltip_highlightColor: 'RGB highlight color applied for the active user.', tooltip_language_code: 'Unique language code containing two to eight letters.', tooltip_language_name: 'The displayed name of the language.', tooltip_operations: 'Permission-driven ERP and warehouse sample workflows.', tooltip_mobile_demo: 'Checks device capabilities through safe user-triggered tests.',
  sku: 'SKU', unit: 'Unit', onHand: 'On hand', reorderPoint: 'Reorder point', itemId: 'Item', locationId: 'Location', type: 'Type', quantity: 'Quantity', reference: 'Reference', note: 'Note', occurredAt: 'Movement time', capacity: 'Capacity', receiptNo: 'Receipt number', supplier: 'Supplier', receivedAt: 'Received at', orderNo: 'Order number', customer: 'Customer', priority: 'Priority', shipBy: 'Ship by',
  tooltip_sku: 'Stable, unique identifier of the item.', tooltip_unit: 'Code from the multilingual unit dictionary.', tooltip_onHand: 'Current balance calculated from posted movements.', tooltip_reorderPoint: 'Stock level below which replenishment is suggested.', tooltip_itemId: 'Reference to the item master record.', tooltip_locationId: 'Reference to the warehouse location record.', tooltip_type: 'Value selected from the relevant multilingual type dictionary.', tooltip_quantity: 'Positive posting quantity.', tooltip_reference: 'External document or process reference.', tooltip_note: 'Optional free-text note.', tooltip_occurredAt: 'Business timestamp of the stock movement.', tooltip_capacity: 'Planned maximum capacity of the location.', tooltip_receiptNo: 'Unique document number of the inbound delivery.', tooltip_supplier: 'Business partner sending the delivery.', tooltip_receivedAt: 'Actual or planned receipt timestamp.', tooltip_orderNo: 'Unique document number of the outbound order.', tooltip_customer: 'Customer or consignee of the order.', tooltip_priority: 'Code from the multilingual priority dictionary.', tooltip_shipBy: 'Committed shipping date.',
  erp_intro: 'Live-data sample flows for inventory, locations, receiving and shipping.', erp_kpi_inventory_lines: 'Active item master', erp_kpi_units_on_hand: 'Total on hand', erp_kpi_receipts: 'Open receipts', erp_kpi_orders: 'Open orders', erp_kpi_master_data: 'Master-data records', erp_kpi_live_balance: 'Calculated from movements', erp_kpi_open: 'In progress',
  wms_inventory_items: 'Items and inventory', wms_stock_movements: 'Stock movements', wms_warehouse_locations: 'Warehouse locations', wms_inbound_receipts: 'Inbound receipts', wms_outbound_orders: 'Outbound orders', wms_inventory_help: 'SKU, unit and movement-derived on-hand quantity.', wms_movements_help: 'Receipts, issues and adjustments with negative-stock protection.', wms_locations_help: 'Receiving, storage, picking and shipping locations.', wms_inbound_help: 'Track supplier deliveries and destination locations.', wms_outbound_help: 'Manage customer orders, priorities and deadlines.', wms_select_item: 'Select an item', wms_select_location: 'Select a location', wms_module_badge: 'WMS / ERP',
  mobile_demo_intro: 'Check what the current phone, tablet or browser supports.', mobile_permission_notice: 'A permission is requested only after its test button is pressed; the app never starts device features automatically.', mobile_supported: 'Supported', mobile_unsupported: 'Unsupported', mobile_ready_to_test: 'Ready to test.', mobile_permission_denied: 'Device permission was not granted.', mobile_action_failed: 'This test cannot be completed on the current device.',
  mobile_camera_title: 'Camera', mobile_camera_help: 'Use the rear camera for item and document photos.', mobile_camera_action: 'Start camera', mobile_camera_preview: 'Live camera preview', mobile_camera_stop: 'Stop camera', mobile_camera_active: 'Camera is active.', mobile_camera_stopped: 'Camera stopped.',
  mobile_barcode_title: 'Barcode and QR', mobile_barcode_help: 'Recognize a code from the live camera when supported by the browser.', mobile_barcode_action: 'Scan a code', mobile_barcode_result: 'Recognized code', mobile_barcode_none: 'No code was found in the image.',
  mobile_location_title: 'Geolocation', mobile_location_help: 'Capture GPS coordinates for site or transport workflows.', mobile_location_action: 'Get position', mobile_location_result: 'Position',
  mobile_sensors_title: 'Orientation and motion', mobile_sensors_help: 'Try gyroscope, orientation and motion sensors.', mobile_sensors_action: 'Start sensors', mobile_sensors_active: 'Sensor monitoring is active.', mobile_orientation_values: 'Orientation', mobile_motion_values: 'Motion',
  mobile_vibration_title: 'Vibration', mobile_vibration_help: 'Haptic feedback for successful scans or errors.', mobile_vibration_action: 'Test vibration', mobile_vibration_done: 'Vibration pattern sent.',
  mobile_share_title: 'Share', mobile_share_help: 'Open the system share sheet to forward an order or link.', mobile_share_action: 'Share', mobile_share_text: 'LOG-X WMS mobile demo', mobile_share_done: 'Sharing completed.',
  mobile_clipboard_title: 'Clipboard', mobile_clipboard_help: 'Safely copy item numbers and links.', mobile_clipboard_action: 'Copy address', mobile_clipboard_done: 'Address copied to the clipboard.',
  mobile_connectivity_title: 'Network and battery', mobile_connectivity_help: 'Connection status, network type and battery level where available.', mobile_connectivity_action: 'Get status', mobile_online: 'Online', mobile_offline: 'Offline', mobile_network_type: 'Network', mobile_battery_level: 'Battery', mobile_charging: 'Charging',
  mobile_nfc_title: 'NFC', mobile_nfc_help: 'Read an NFC tag on a supported Android device.', mobile_nfc_action: 'Read NFC', mobile_nfc_waiting: 'Touch an NFC tag to the device.', mobile_nfc_detected: 'NFC tag detected', mobile_nfc_tag: 'Tag',
  mobile_install_title: 'Installable app', mobile_install_help: 'Install the PWA on the home screen; its application shell also opens offline.', mobile_install_action: 'Install', mobile_install_installed: 'The app is already installed.', mobile_install_browser_help: 'Choose Add to Home Screen or Install App from the browser menu.', mobile_install_accepted: 'Installation started.', mobile_install_dismissed: 'Installation was skipped for now.', error_invalid_number: 'Enter a valid positive number.', error_invalid_reference: 'Select an existing related record.', error_negative_stock: 'The operation would result in negative stock.', error_referenced_record: 'The record cannot be deleted because another document references it.', error_calculated_field: 'Calculated stock can only be changed through a stock movement.'
});

Object.assign(translations.de, {
  nav_operations: 'ERP-/WMS-Vorgänge', nav_mobile_demo: 'Mobile Integrationen', primary_navigation: 'Hauptnavigation',
  theme: 'Darstellung', theme_system: 'Systemeinstellung', theme_light: 'Hell', theme_dark: 'Dunkel', tooltip_toggle: 'Feldhilfen', highlightColor: 'App-Hervorhebungsfarbe (RGB)', persistence_supabase: 'Supabase · persistente Daten', persistence_demo: 'Lokaler Demo-Speicher',
  form_validation_hint: 'Füllen Sie alle Pflichtfelder korrekt aus, um zu speichern.', form_validation_ready: 'Das Formular ist gültig und kann gespeichert werden.', validation_required: 'Dieses Feld ist erforderlich.', validation_email: 'Geben Sie eine gültige E-Mail-Adresse ein.', validation_pattern: 'Das Format des Werts ist ungültig.',
  tooltip_code: 'Stabile, eindeutige Geschäftskennung.', tooltip_name: 'Der in der Oberfläche angezeigte Name.', tooltip_owner: 'Geschäftlich verantwortliche Person des Datensatzes.', tooltip_status: 'Code aus einem mehrsprachigen Statusverzeichnis.', tooltip_risk: 'Code aus einem mehrsprachigen Risikoverzeichnis.', tooltip_email: 'Gültige, eindeutige E-Mail-Adresse.', tooltip_role: 'Grundlegende Zugriffsstufe des Benutzers.', tooltip_active: 'Nur aktive Datensätze stehen im Tagesgeschäft zur Verfügung.', tooltip_highlightColor: 'RGB-Hervorhebungsfarbe des aktiven Benutzers.', tooltip_language_code: 'Eindeutiger Sprachcode mit zwei bis acht Buchstaben.', tooltip_language_name: 'Angezeigter Name der Sprache.', tooltip_operations: 'Berechtigungsgesteuerte ERP- und Lagerbeispielflüsse.', tooltip_mobile_demo: 'Prüft Gerätefunktionen durch sichere, manuell gestartete Tests.',
  sku: 'Artikelnummer', unit: 'Einheit', onHand: 'Bestand', reorderPoint: 'Meldebestand', itemId: 'Artikel', locationId: 'Lagerplatz', type: 'Typ', quantity: 'Menge', reference: 'Referenz', note: 'Notiz', occurredAt: 'Buchungszeit', capacity: 'Kapazität', receiptNo: 'Wareneingangsnummer', supplier: 'Lieferant', receivedAt: 'Empfangszeit', orderNo: 'Auftragsnummer', customer: 'Kunde', priority: 'Priorität', shipBy: 'Versand bis',
  tooltip_sku: 'Stabile, eindeutige Kennung des Artikels.', tooltip_unit: 'Code aus dem mehrsprachigen Einheitenverzeichnis.', tooltip_onHand: 'Aus gebuchten Bewegungen berechneter aktueller Bestand.', tooltip_reorderPoint: 'Bestandsschwelle für einen Nachschubvorschlag.', tooltip_itemId: 'Verweis auf den Artikelstammsatz.', tooltip_locationId: 'Verweis auf den Lagerplatzdatensatz.', tooltip_type: 'Wert aus dem passenden mehrsprachigen Typverzeichnis.', tooltip_quantity: 'Positive Buchungsmenge.', tooltip_reference: 'Externe Beleg- oder Prozessreferenz.', tooltip_note: 'Optionale Freitextnotiz.', tooltip_occurredAt: 'Geschäftlicher Zeitpunkt der Bestandsbewegung.', tooltip_capacity: 'Geplante maximale Kapazität des Lagerplatzes.', tooltip_receiptNo: 'Eindeutige Belegnummer des Wareneingangs.', tooltip_supplier: 'Geschäftspartner, der die Lieferung sendet.', tooltip_receivedAt: 'Tatsächlicher oder geplanter Empfangszeitpunkt.', tooltip_orderNo: 'Eindeutige Belegnummer des Ausgangsauftrags.', tooltip_customer: 'Kunde oder Empfänger des Auftrags.', tooltip_priority: 'Code aus dem mehrsprachigen Prioritätsverzeichnis.', tooltip_shipBy: 'Zugesagtes Versanddatum.',
  erp_intro: 'Live-Daten-Beispielflüsse für Bestand, Lagerplätze, Wareneingang und Versand.', erp_kpi_inventory_lines: 'Aktive Artikelstämme', erp_kpi_units_on_hand: 'Gesamtbestand', erp_kpi_receipts: 'Offene Eingänge', erp_kpi_orders: 'Offene Aufträge', erp_kpi_master_data: 'Stammdatensätze', erp_kpi_live_balance: 'Aus Bewegungen berechnet', erp_kpi_open: 'In Bearbeitung',
  wms_inventory_items: 'Artikel und Bestand', wms_stock_movements: 'Bestandsbewegungen', wms_warehouse_locations: 'Lagerplätze', wms_inbound_receipts: 'Wareneingänge', wms_outbound_orders: 'Ausgangsaufträge', wms_inventory_help: 'Artikelnummer, Einheit und bewegungsbasierter Bestand.', wms_movements_help: 'Eingänge, Ausgänge und Korrekturen mit Negativbestandsprüfung.', wms_locations_help: 'Empfangs-, Lager-, Kommissionier- und Versandplätze.', wms_inbound_help: 'Lieferungen und Ziellagerplätze verfolgen.', wms_outbound_help: 'Kundenaufträge, Prioritäten und Termine verwalten.', wms_select_item: 'Artikel auswählen', wms_select_location: 'Lagerplatz auswählen', wms_module_badge: 'WMS / ERP',
  mobile_demo_intro: 'Prüfen Sie, was das aktuelle Telefon, Tablet oder der Browser unterstützt.', mobile_permission_notice: 'Eine Berechtigung wird erst nach Druck auf die jeweilige Testtaste angefordert; Gerätefunktionen starten niemals automatisch.', mobile_supported: 'Unterstützt', mobile_unsupported: 'Nicht unterstützt', mobile_ready_to_test: 'Testbereit.', mobile_permission_denied: 'Die Geräteberechtigung wurde nicht erteilt.', mobile_action_failed: 'Dieser Test kann auf dem aktuellen Gerät nicht ausgeführt werden.',
  mobile_camera_title: 'Kamera', mobile_camera_help: 'Rückkamera für Artikel- und Belegfotos verwenden.', mobile_camera_action: 'Kamera starten', mobile_camera_preview: 'Live-Kamerabild', mobile_camera_stop: 'Kamera stoppen', mobile_camera_active: 'Die Kamera ist aktiv.', mobile_camera_stopped: 'Die Kamera wurde gestoppt.',
  mobile_barcode_title: 'Barcode und QR', mobile_barcode_help: 'Code aus dem Kamerabild erkennen, wenn der Browser dies unterstützt.', mobile_barcode_action: 'Code scannen', mobile_barcode_result: 'Erkannter Code', mobile_barcode_none: 'Im Bild wurde kein Code gefunden.',
  mobile_location_title: 'Standort', mobile_location_help: 'GPS-Koordinaten für Standort- oder Transportabläufe erfassen.', mobile_location_action: 'Position abrufen', mobile_location_result: 'Position',
  mobile_sensors_title: 'Ausrichtung und Bewegung', mobile_sensors_help: 'Gyroskop-, Ausrichtungs- und Bewegungssensoren testen.', mobile_sensors_action: 'Sensoren starten', mobile_sensors_active: 'Die Sensorüberwachung ist aktiv.', mobile_orientation_values: 'Ausrichtung', mobile_motion_values: 'Bewegung',
  mobile_vibration_title: 'Vibration', mobile_vibration_help: 'Haptische Rückmeldung für erfolgreiche Scans oder Fehler.', mobile_vibration_action: 'Vibration testen', mobile_vibration_done: 'Vibrationsmuster gesendet.',
  mobile_share_title: 'Teilen', mobile_share_help: 'Systemdialog zum Weiterleiten eines Auftrags oder Links öffnen.', mobile_share_action: 'Teilen', mobile_share_text: 'LOG-X WMS Mobile-Demo', mobile_share_done: 'Teilen abgeschlossen.',
  mobile_clipboard_title: 'Zwischenablage', mobile_clipboard_help: 'Artikelnummern und Links sicher kopieren.', mobile_clipboard_action: 'Adresse kopieren', mobile_clipboard_done: 'Adresse in die Zwischenablage kopiert.',
  mobile_connectivity_title: 'Netzwerk und Akku', mobile_connectivity_help: 'Verbindungsstatus, Netzwerktyp und – soweit verfügbar – Akkustand.', mobile_connectivity_action: 'Status abrufen', mobile_online: 'Online', mobile_offline: 'Offline', mobile_network_type: 'Netzwerk', mobile_battery_level: 'Akku', mobile_charging: 'Wird geladen',
  mobile_nfc_title: 'NFC', mobile_nfc_help: 'NFC-Tag auf einem unterstützten Android-Gerät lesen.', mobile_nfc_action: 'NFC lesen', mobile_nfc_waiting: 'Halten Sie einen NFC-Tag an das Gerät.', mobile_nfc_detected: 'NFC-Tag erkannt', mobile_nfc_tag: 'Tag',
  mobile_install_title: 'Installierbare App', mobile_install_help: 'PWA auf dem Startbildschirm installieren; die App-Hülle öffnet auch offline.', mobile_install_action: 'Installieren', mobile_install_installed: 'Die App ist bereits installiert.', mobile_install_browser_help: 'Wählen Sie Zum Startbildschirm oder App installieren im Browsermenü.', mobile_install_accepted: 'Installation gestartet.', mobile_install_dismissed: 'Installation wurde vorerst übersprungen.', error_invalid_number: 'Geben Sie eine gültige positive Zahl ein.', error_invalid_reference: 'Wählen Sie einen vorhandenen verknüpften Datensatz.', error_negative_stock: 'Der Vorgang würde zu einem negativen Bestand führen.', error_referenced_record: 'Der Datensatz kann nicht gelöscht werden, da ein anderer Beleg darauf verweist.', error_calculated_field: 'Der berechnete Bestand kann nur durch eine Bestandsbewegung geändert werden.'
});

const dictionaries = {
  status: {
    key: 'status',
    englishName: 'Status',
    options: [
      { code: 'draft', key: 'option.status.draft', englishName: 'Draft', sortOrder: 10, enabled: true, labels: { en: 'Draft', hu: 'Piszkozat', de: 'Entwurf' } },
      { code: 'active', key: 'option.status.active', englishName: 'Active', sortOrder: 20, enabled: true, labels: { en: 'Active', hu: 'Aktív', de: 'Aktiv' } }
    ]
  },
  risk: {
    key: 'risk',
    englishName: 'Risk',
    options: [
      { code: 'low', key: 'option.risk.low', englishName: 'Low', sortOrder: 10, enabled: true, labels: { en: 'Low', hu: 'Alacsony', de: 'Niedrig' } },
      { code: 'medium', key: 'option.risk.medium', englishName: 'Medium', sortOrder: 20, enabled: true, labels: { en: 'Medium', hu: 'Közepes', de: 'Mittel' } },
      { code: 'high', key: 'option.risk.high', englishName: 'High', sortOrder: 30, enabled: true, labels: { en: 'High', hu: 'Magas', de: 'Hoch' } }
    ]
  }
};

function defaultTranslations() { return structuredClone(translations); }
function defaultDictionaries() { return structuredClone(dictionaries); }

function ensureDictionaryStructure(db) {
  const defaults = defaultDictionaries();
  db.dictionaries ||= {};
  for (const [dictionaryKey, defaultDictionary] of Object.entries(defaults)) {
    const dictionary = db.dictionaries[dictionaryKey] ||= defaultDictionary;
    dictionary.key ||= defaultDictionary.key;
    dictionary.englishName ||= defaultDictionary.englishName;
    dictionary.options ||= [];
    for (const defaultOption of defaultDictionary.options) {
      const option = dictionary.options.find(item => item.code === defaultOption.code);
      if (!option) {
        dictionary.options.push(defaultOption);
        continue;
      }
      option.key ||= defaultOption.key;
      option.englishName ||= defaultOption.englishName;
      option.sortOrder ??= defaultOption.sortOrder;
      option.enabled ??= defaultOption.enabled;
      option.labels = { ...defaultOption.labels, ...(option.labels || {}) };
    }
    dictionary.options.sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code));
  }
}

function initializeLanguageStructure(db, languageCode) {
  if (!/^[a-z]{2,8}$/.test(languageCode)) throw new Error('Invalid language code');
  db.translations ||= {};
  const english = db.translations.en || translations.en;
  const target = db.translations[languageCode] ||= {};
  for (const [key, value] of Object.entries(english)) if (!Object.hasOwn(target, key)) target[key] = value;
  ensureDictionaryStructure(db);
  for (const dictionary of Object.values(db.dictionaries)) {
    for (const option of dictionary.options) {
      option.labels ||= {};
      option.labels.en ||= option.englishName;
      if (!Object.hasOwn(option.labels, languageCode)) option.labels[languageCode] = option.labels.en;
    }
  }
  return target;
}

function ensureTranslationData(db) {
  db.translations ||= {};
  const defaults = defaultTranslations();
  for (const languageCode of Object.keys(defaults)) db.translations[languageCode] = { ...defaults[languageCode], ...(db.translations[languageCode] || {}) };
  ensureDictionaryStructure(db);
  for (const language of db.languages || []) initializeLanguageStructure(db, language.code);
  return db;
}

function resolveLanguage(db, requestedLanguage) {
  const enabled = (db.languages || []).filter(language => language.enabled).map(language => language.code);
  if (enabled.includes(requestedLanguage)) return requestedLanguage;
  if (enabled.includes('hu')) return 'hu';
  return enabled[0] || 'en';
}

function localizedDictionaries(db, requestedLanguage) {
  ensureTranslationData(db);
  const languageCode = resolveLanguage(db, requestedLanguage);
  return Object.fromEntries(Object.entries(db.dictionaries).map(([dictionaryKey, dictionary]) => [dictionaryKey, {
    key: dictionary.key,
    englishName: dictionary.englishName,
    options: dictionary.options.filter(option => option.enabled).map(option => ({
      code: option.code,
      key: option.key,
      englishName: option.englishName,
      label: option.labels[languageCode] || option.labels.en || option.englishName,
      labels: { ...option.labels }
    }))
  }]));
}

function buildTranslationEditor(db, requestedLanguage) {
  ensureTranslationData(db);
  const targetLanguage = resolveLanguage(db, requestedLanguage);
  const uiEntries = Object.entries(db.translations.en).sort(([left], [right]) => left.localeCompare(right)).map(([key, english]) => ({
    key,
    scope: 'ui',
    english,
    target: db.translations[targetLanguage]?.[key] ?? english
  }));
  const optionEntries = Object.entries(db.dictionaries).flatMap(([dictionaryKey, dictionary]) => dictionary.options.map(option => ({
    key: option.key,
    scope: 'option',
    dictionaryKey,
    optionCode: option.code,
    english: option.englishName,
    target: option.labels[targetLanguage] ?? option.labels.en ?? option.englishName
  })));
  return { sourceLanguage: 'en', targetLanguage, entries: [...uiEntries, ...optionEntries] };
}

function setTranslationValue(db, languageCode, key, value) {
  ensureTranslationData(db);
  if (!(db.languages || []).some(language => language.code === languageCode)) throw new Error('Unknown language');
  if (Object.hasOwn(db.translations.en, key)) {
    const previous = db.translations[languageCode]?.[key];
    db.translations[languageCode][key] = value;
    return { scope: 'ui', previous, value };
  }
  for (const [dictionaryKey, dictionary] of Object.entries(db.dictionaries)) {
    const option = dictionary.options.find(item => item.key === key);
    if (!option) continue;
    const previous = option.labels[languageCode] ?? option.labels.en ?? option.englishName;
    option.labels[languageCode] = value;
    if (languageCode === 'en') option.englishName = value;
    return { scope: 'option', dictionaryKey, optionCode: option.code, previous, value };
  }
  throw new Error('Unknown translation key');
}

function hasDictionaryOption(db, dictionaryKey, code) {
  ensureTranslationData(db);
  return Boolean(db.dictionaries[dictionaryKey]?.options.some(option => option.code === code && option.enabled));
}

module.exports = {
  defaultTranslations,
  defaultDictionaries,
  ensureTranslationData,
  initializeLanguageStructure,
  localizedDictionaries,
  buildTranslationEditor,
  setTranslationValue,
  hasDictionaryOption
};
