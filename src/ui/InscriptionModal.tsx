import { getCardInfo } from "../data/loadCards";

export function InscriptionModal({ name, onClose }: { name: string; onClose: () => void }) {
  const ci = getCardInfo(name);
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
            {ci.flavor && <div className="cmflav">"{ci.flavor}"</div>}
          </>
        )}
      </div>
    </div>
  );
}
