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
