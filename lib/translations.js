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

function defaultTranslations() { return structuredClone(translations); }

module.exports = { defaultTranslations };
