"use client";
import { useEffect, useState } from "react";
import { githubReturnNotice, type SkillsProfile } from "../lib/skills";
import { useSkillsProfile } from "../lib/skills-client";
import { PageTitle } from "./UI";
import { PlatformCards } from "./PlatformCards";
import { FeaturedPicker } from "./FeaturedProjects";
import { PlacementPreview, VisibilityForm } from "./ProfileSharing";

/** Skills profile management after onboarding. */
export function Connections({ initial, github, githubCode, preview: startPreview = false }: { initial: SkillsProfile; github?: string; githubCode?: string; preview?: boolean }) {
  const skills = useSkillsProfile(initial);
  const returned = githubReturnNotice(github, githubCode);
  const [preview, setPreview] = useState(startPreview);
  useEffect(() => {
    if (window.location.hash === "#preview") setPreview(true);
  }, []);
  return (
    <div className="st-si-connections">
      <PageTitle
        eyebrow="DSU / SKILLS PROFILE"
        title="Skills profile"
        description="Your developer platforms, featured projects and what authorized Placement Officers can see. Your official academic record is managed by the university."
        action={
          <button className="st-button st-button-secondary" aria-expanded={preview} aria-controls="preview" onClick={() => setPreview(!preview)}>
            {preview ? "Close preview" : "Preview placement profile"}
          </button>
        }
      />
      {returned && (
        <p className={returned.tone === "good" ? "st-success" : "st-error"} role={returned.tone === "good" ? "status" : "alert"}>
          {returned.text}
        </p>
      )}
      <section id="preview" className="st-panel st-si-anchor" hidden={!preview} aria-labelledby="preview-title">
        <div className="st-panel-title">
          <h2 id="preview-title">Placement profile preview</h2>
          <p className="st-muted">Read only. Built from your own profile and filtered by your visibility settings.</p>
        </div>
        {preview && <PlacementPreview profile={skills.profile} />}
      </section>
      <section id="platforms" className="st-panel st-si-anchor" aria-labelledby="platforms-title">
        <div className="st-panel-title">
          <h2 id="platforms-title">Developer platforms</h2>
          <p className="st-muted">
            GitHub and Hugging Face sync in the background, about once a day. You can refresh a synced account once every 10 minutes. Other platforms
            keep the link and figures you entered.
          </p>
        </div>
        <PlatformCards skills={skills} mode="manage" />
      </section>
      <div className="st-si-two">
        <section id="featured" className="st-panel st-si-anchor" aria-labelledby="featured-title">
          <div className="st-panel-title">
            <h2 id="featured-title">Featured projects</h2>
            <p className="st-muted">Choose up to three public repositories to highlight.</p>
          </div>
          <FeaturedPicker skills={skills} />
        </section>
        <section id="visibility" className="st-panel st-si-anchor" aria-labelledby="visibility-title">
          <div className="st-panel-title">
            <h2 id="visibility-title">Privacy and visibility</h2>
            <p className="st-muted">Changes apply to placement officers immediately.</p>
          </div>
          <VisibilityForm skills={skills} />
        </section>
      </div>
    </div>
  );
}
