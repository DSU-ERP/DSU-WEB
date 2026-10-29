import Image from "next/image";

/** DSU lockup for the student portal: the official seal, then "DSU" and the
 * portal name. The second span is the part the collapsed sidebar hides,
 * leaving just the seal. */
export function StudentBrand({ label = "STUDENT PORTAL" }: { label?: string }) {
  return (
    <>
      <span className="st-brand-seal">
        <Image src="/assets/college/dsu-seal-crest.png" alt="" width={192} height={192} priority />
      </span>
      <span className="st-brand-text">
        <strong>DSU</strong>
        <small>{label}</small>
      </span>
    </>
  );
}
