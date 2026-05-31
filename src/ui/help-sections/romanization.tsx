import { HEADING, PROSE } from "@/ui/help-sections/shared";

// -- Romanization -------------------------------------------------------------

const RomanizationSection: React.FC = () => (
  <div className="space-y-4">
    <p className={PROSE}>
      Romanization shows a Latin-script reading under the source lyrics. Useful for non-Latin scripts your listeners
      can't read: Japanese, Chinese, and so on.
    </p>

    <div>
      <h4 className={HEADING}>Supported schemes</h4>
      <ul className={`${PROSE} list-disc pl-4 space-y-1`}>
        <li>Japanese: Hepburn (default), Kunrei, Nihon-shiki.</li>
        <li>Chinese: Pinyin. Wade-Giles is supported as a best-effort fallback.</li>
      </ul>
    </div>

    <div>
      <h4 className={HEADING}>Turning it on</h4>
      <p className={PROSE}>
        When Composer spots non-Latin script on any line, a banner appears in Edit asking which scheme to use. Pick one
        and generate. The banner won't come back unless you switch projects.
      </p>
    </div>

    <div>
      <h4 className={HEADING}>Generated vs. manual</h4>
      <ul className={`${PROSE} list-disc pl-4 space-y-1`}>
        <li>Generated: Composer produced the romaji. Hover a line and click the regenerate icon to redo it.</li>
        <li>Manual: you typed it yourself. Composer won't overwrite manual romaji.</li>
      </ul>
    </div>

    <div>
      <h4 className={HEADING}>TTML round-trip</h4>
      <p className={PROSE}>
        Romanization lives inside the project. It exports with the TTML as <code>{"<transliterations>"}</code> in the
        head metadata, and re-imports back into the same shape. Renderers that read transliterations will display it
        under each line.
      </p>
    </div>

    <div>
      <h4 className={HEADING}>Where it shows</h4>
      <p className={PROSE}>
        In Sync, the romaji sits under each line with the active line emphasized. In Timeline, it sits inside each word
        block; it hides automatically when a block gets too narrow.
      </p>
    </div>
  </div>
);

// -- Exports ------------------------------------------------------------------

export { RomanizationSection };
