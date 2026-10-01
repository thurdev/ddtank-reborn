# How to restore the DDTank .bak files and re-export them

These steps were tested on Windows 11 on 2026-10-01 with SQL Server 2025 LocalDB 17.0.1000.7 and go-sqlcmd. Docker isn't needed.

## 1. Install LocalDB and sqlcmd (one-time, needs admin/UAC)

`winget install Microsoft.SQLServer.2022.LocalDB` **does not exist** in winget. Use the Express bootstrapper to download the LocalDB MSI only:

```powershell
$d = "C:\Users\T\Documents\Projects\DDTank\vendor\_tools\installers"
curl.exe -L -o "$d\SQL2022-SSEI-Expr.exe" "https://go.microsoft.com/fwlink/p/?linkid=2216019"
& "$d\SQL2022-SSEI-Expr.exe" /ACTION=Download MEDIAPATH=$d /MEDIATYPE=LocalDB /QUIET   # -> $d\en-US\SqlLocalDB.msi (it is actually 2025 LocalDB)
# a non-elevated /qn install fails with 1603 ("no credential elevation is possible"), so run it elevated:
Start-Process msiexec -Verb RunAs -Wait -ArgumentList "/i `"$d\en-US\SqlLocalDB.msi`" /qn IACCEPTSQLLOCALDBLICENSETERMS=YES"
winget install Microsoft.Sqlcmd -e --silent --accept-package-agreements --accept-source-agreements   # go-sqlcmd -> C:\Program Files\SqlCmd\sqlcmd.exe
```

## 2. Create the instance and get its pipe

```powershell
$L = "C:\Program Files\Microsoft SQL Server\170\Tools\Binn\SqlLocalDB.exe"
& $L create DDTank -s
& $L info DDTank      # "Instance pipe name: np:\\.\pipe\LOCALDB#XXXXXXXX\tsql\query"
```

go-sqlcmd does **not** resolve `(localdb)\DDTank`, so pass the pipe name: `sqlcmd -S np:\\.\pipe\LOCALDB#...\tsql\query -E`.
The pipe name **changes every time the instance starts**, and LocalDB auto-stops when it is idle. Run `SqlLocalDB start DDTank` and then `info` again to get the new name.

## 3. Restore

| .bak | Logical data / log | Restored as |
|---|---|---|
| vendor/DDTank41/Database/Game34.bak | Db_Tank / Db_Tank_log | Project_Game34 |
| vendor/DDTank41/Database/Player34.bak | DDTMixTankAc / DDTMixTankAc_log | Project_Player34 |
| vendor/DDTank41/Database/Db_Membership.bak | Db_Membership_Data / Db_Membership_Log | Db_Membership |

```sql
RESTORE FILELISTONLY FROM DISK=N'...\Game34.bak';
RESTORE DATABASE [Project_Game34] FROM DISK=N'C:\Users\T\Documents\Projects\DDTank\vendor\DDTank41\Database\Game34.bak'
  WITH MOVE N'Db_Tank' TO N'C:\Users\T\Documents\Projects\DDTank\vendor\_sqldata\Project_Game34.mdf',
       MOVE N'Db_Tank_log' TO N'C:\Users\T\Documents\Projects\DDTank\vendor\_sqldata\Project_Game34_log.ldf', REPLACE;
-- same pattern for Project_Player34 and Db_Membership
```

The backups come from SQL 2019 (db version 904) and SQL 2008 R2 (661). All three upgraded to version 998 without errors.

## 4. Export

```powershell
cd C:\Users\T\Documents\Projects\DDTank\vendor\_tools
npm install            # only mssql/msnodesqlv8 are listed; export.mjs itself needs no packages
node export.mjs        # all 3 DBs; or: node export.mjs Project_Game34 --instance DDTank
node summary.mjs       # regenerates research/db/00-summary.md
```

`export.mjs` finds the pipe through `SqlLocalDB info`. You can override it with `SQL_SERVER`, `SQLCMD` or `SQLLOCALDB`. It runs go-sqlcmd and has SQL Server serialise every catalog query and table with `FOR JSON PATH, INCLUDE_NULL_VALUES` into one nvarchar(max) scalar (`-y 0`, UTF-8 output). Output:

- `vendor/_dbexport/<Db>/schema/tables.sql` — CREATE TABLE statements with types, identity, defaults, PK/UNIQUE/CHECK constraints, indexes and FKs
- `.../schema/{procedures,views,functions,triggers}/<name>.sql` — text from `sys.sql_modules`
- `.../schema/catalog.json` — tables, columns, PKs, indexes and module parameters (for codegen)
- `.../data/<Table>.json` — every table that has rows, as a JSON array with one row per line, ordered by PK when there is one
- `.../row-counts.json`
- the schema folder and row counts are also copied to `research/db/<Db>/`

Why not use tedious or msnodesqlv8 directly: LocalDB only listens on named pipes, and tedious only speaks TCP. The prebuilt msnodesqlv8 5.5 hung under Node 24 on this machine, even against an unreachable server. If you need a TCP driver later, install SQL Server Express (`winget install Microsoft.SQLServer.2022.Express`), enable TCP 1433 and use `mssql`.

Gotcha: Git-Bash in this environment mangles backslashes in commands and heredocs. Run sqlcmd from PowerShell and write scripts with an editor.
