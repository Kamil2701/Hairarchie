# hairarchie — Website & Terminbuchung

Next.js-Website für den Friseursalon hairarchie in Bremen, mit eigenem
Buchungssystem (kein Drittanbieter). Läuft komplett ohne Datenbank im
lokalen Test (Buchungen im Arbeitsspeicher) und schaltet automatisch auf
eine echte Postgres-Datenbank (Supabase) um, sobald die Zugangsdaten
gesetzt sind — der Rest der App muss dafür nicht angefasst werden.

## Was ist fertig

- Startseite: Hero, Leistungen ("Die Hairarchie" — vier Preis-Stufen aus
  eurer aktuellen SumUp-Liste), Team, Öffnungszeiten/Adresse.
- `/termin`: vierstufiger Buchungsablauf (Leistung → Stylist:in → Termin →
  Kontaktdaten), verhindert Doppelbuchungen serverseitig.
- `/admin`: passwortgeschützte Übersicht aller anstehenden Buchungen,
  Stornieren-Funktion.

## Vor dem Launch unbedingt anpassen

- **Team**: `src/lib/data/stylists.ts` enthält drei Platzhalter-Personen
  (Mila, Yusuf, Elif) — durch das echte Team ersetzen.
- **Leistungen/Preise**: `src/lib/data/services.ts`, aus eurer SumUp-Seite
  übernommen. Ein Eintrag war dort schwer lesbar ("Was komplett") — hier
  als "Waschen komplett" angenommen, bitte prüfen.
- **Admin-Zugangscode**: steht in `.env.local` (`ADMIN_PASSWORD`), vor
  dem Livegang durch einen eigenen, langen Code ersetzen.
- Auf der SumUp-Seite gab es eine Kategorie "Damen" ohne eigene Einträge —
  falls es tatsächlich separate Damen-Leistungen gibt, bitte ergänzen.

## Lokal starten

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Ohne ausgefüllte `SUPABASE_*`-Variablen läuft die Seite sofort mit einer
temporären In-Memory-Datenbank (Buchungen gehen bei jedem Neustart
verloren — gut zum Ausprobieren, nicht für den echten Betrieb).

`ADMIN_PASSWORD` und `ADMIN_SESSION_SECRET` müssen in jedem Fall gesetzt
sein, auch lokal (siehe `.env.local.example`; Secret mit
`openssl rand -base64 32` erzeugen).

## Live schalten: Supabase + Vercel

### 1. Supabase-Projekt (Datenbank)

1. Auf [supabase.com](https://supabase.com) kostenlos registrieren, neues
   Projekt anlegen (Region z. B. Frankfurt).
2. Im Projekt: **SQL Editor → New query**, den Inhalt von
   `supabase/schema.sql` einfügen und ausführen.
3. **Project Settings → API**: `Project URL` und den `service_role`-Key
   kopieren (nicht den `anon`-Key — der wird hier nicht verwendet).

### 2. Vercel-Projekt (Hosting)

1. Projekt in ein eigenes GitHub-Repo pushen (`git remote add origin …`,
   `git push`).
2. Auf [vercel.com](https://vercel.com) mit GitHub anmelden, das Repo
   importieren.
3. Unter **Environment Variables** eintragen:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET` (neu erzeugen, nicht den lokalen Wert wiederverwenden)
4. Deploy anstoßen. Ihr bekommt eine `*.vercel.app`-URL.

### 3. Eigene Domain verbinden

In Vercel: **Project → Settings → Domains**, eure Domain eintragen und
die angezeigten DNS-Einträge beim Domain-Anbieter setzen. Sag mir
Bescheid, sobald ihr die Domain habt — dann gehe ich das mit dir durch.

## Admin-Dashboard

`/admin` — mit dem `ADMIN_PASSWORD` anmelden, zeigt alle künftigen
Termine chronologisch, mit Stornieren-Button.
