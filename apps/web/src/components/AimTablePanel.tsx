import type { AimTableRow } from "@/lib/api";

/** One "Âng. N: Distância | Força" card — two side-by-side column pairs (distances 1..10, then 11..20), like the
 *  DD Clássico reference (`remaster/00-site-pagina-jogar/inputs/referencia-ddclassico.png`). */
export function AimTableCard({ row, distances }: { row: AimTableRow; distances: number[] }) {
  const half = Math.ceil(distances.length / 2);
  const left = distances.slice(0, half);
  const right = distances.slice(half);

  return (
    <div className="aim-card">
      <div className="aim-card-title">Âng. {row.angle}</div>
      <table className="aim-card-table">
        <thead>
          <tr>
            <th>Dist.</th>
            <th>Força</th>
            <th>Dist.</th>
            <th>Força</th>
          </tr>
        </thead>
        <tbody>
          {left.map((d, i) => {
            const d2 = right[i];
            const f1 = row.forces[i];
            const f2 = d2 !== undefined ? row.forces[half + i] : undefined;
            return (
              <tr key={d}>
                <td className="d">{d}</td>
                <td>
                  <span className="aim-pill">{f1 ?? "—"}</span>
                </td>
                {d2 !== undefined ? (
                  <>
                    <td className="d">{d2}</td>
                    <td>
                      <span className="aim-pill">{f2 ?? "—"}</span>
                    </td>
                  </>
                ) : (
                  <>
                    <td />
                    <td />
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** One parchment side panel: two stacked `AimTableCard`s. */
export function AimSidePanel({ side, rows, distances }: { side: "left" | "right"; rows: AimTableRow[]; distances: number[] }) {
  return (
    <div className={`play-panel ${side}`}>
      {rows.map((row) => (
        <AimTableCard key={row.angle} row={row} distances={distances} />
      ))}
    </div>
  );
}
