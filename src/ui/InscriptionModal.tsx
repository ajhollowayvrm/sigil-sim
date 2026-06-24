import { climbSteps, transformsFrom, isCharacter, getCardInfo } from "../data/loadCards";

export function InscriptionModal({ name, onClose, onCard }: { name: string; onClose: () => void; onCard?: (n: string) => void }) {
  const ci = getCardInfo(name);
  const steps = ci?.kind === "character" ? climbSteps(name) : [];
  const froms = ci?.kind === "character" ? transformsFrom(name) : [];
  return (
    <div className="modal" onClick={onClose}>
      <div className="cm-box" onClick={(e) => e.stopPropagation()}>
        <button className="cm-close" onClick={onClose}>
          ✕
        </button>
        <div className="cmname">{name}</div>
        {!ci && <div className="cmmeta">No inscription on file.</div>}
        {ci && (
          <>
            <div className="cmmeta">
              {ci.kind === "character" ? `${ci.elem ?? "—"} · ${ci.tier ?? "TBD"}` : `${ci.type ?? ci.kind} · ${ci.tier ?? ""}`}
            </div>
            {ci.affils && (
              <div className="cmrow">
                <span className="cmlabel">Affiliations</span>
                {ci.affils}
              </div>
            )}
            {ci.text && <div className="cmab">{ci.text}</div>}
            {froms.length > 0 && (
              <div className="cmrow">
                <span className="cmlabel">Transforms from</span>
                {froms.map((f, i) => {
                  const linkable = !!onCard && isCharacter(f.src);
                  return (
                    <div className="cmstep" key={i}>
                      <span
                        className={`cmstepname${linkable ? " link" : ""}`}
                        onClick={() => linkable && onCard!(f.src)}
                      >
                        ← {f.src}
                      </span>
                      {f.needs.length > 0 && <span className="cmstepneed">via {f.needs.join(", ")}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {steps.length > 0 && (
              <div className="cmrow">
                <span className="cmlabel">Transforms into</span>
                {steps.map((s, i) => (
                  <div className="cmstep" key={i}>
                    <span
                      className={`cmstepname${onCard && s.dest !== "any T2 Wild" ? " link" : ""}`}
                      onClick={() => onCard && s.dest !== "any T2 Wild" && onCard(s.dest)}
                    >
                      → {s.dest}
                    </span>
                    <span className="cmstepneed">
                      {s.needs.length ? `needs ${s.needs.join(", ")} (+ the form in hand)` : "have the form in hand, spend your transformation"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {ci.flavor && <div className="cmflav">"{ci.flavor}"</div>}
          </>
        )}
      </div>
    </div>
  );
}
