"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Pin, Star } from "lucide-react";
import { safeHttps } from "@/shared/http/safe-url";
import {
  FEATURED_LIMIT,
  dateText,
  featuredSourceLabel,
  studentSelected,
  toggleFeatured,
  type FeaturedProject,
  type SkillsProfile,
} from "../lib/skills";
import { errorText, skillsApi, type useSkillsProfile } from "../lib/skills-client";
import { Badge } from "./PlatformCards";

type Skills = ReturnType<typeof useSkillsProfile>;

/** Read-only featured projects (dashboard and preview). */
export function FeaturedList({ featured }: { featured: FeaturedProject[] }) {
  return (
    <ul className="st-si-projects">
      {featured.map((f) => {
        const url = safeHttps(f.repo.url);
        return (
        <li key={f.repo.repoId}>
          <div className="st-si-project-head">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {f.repo.name}
                <ExternalLink size={12} aria-hidden="true" />
                <span className="st-visually-hidden"> (opens in a new tab)</span>
              </a>
            ) : (
              <strong>{f.repo.name}</strong>
            )}
            <Badge tone={f.source === "github_pinned" ? "neutral" : "good"}>{featuredSourceLabel(f.source)}</Badge>
          </div>
          {f.repo.description && <p>{f.repo.description}</p>}
          <small>
            {[f.repo.primaryLanguage, typeof f.repo.stars === "number" ? `${f.repo.stars} ${f.repo.stars === 1 ? "star" : "stars"}` : null, f.repo.pushedAt ? `Last pushed ${dateText(f.repo.pushedAt)}` : null]
              .filter(Boolean)
              .join(". ")}
          </small>
        </li>
        );
      })}
    </ul>
  );
}

/** Choose up to three public repositories; pinned ones are shown first. */
export function FeaturedPicker({ skills }: { skills: Skills }) {
  const profile: SkillsProfile = skills.profile;
  const github = profile.accounts.find((a) => a.platform === "github" && a.state === "linked");
  const serverSelection = studentSelected(profile.github.featured).join(",");
  const [selected, setSelected] = useState<string[]>(() => studentSelected(profile.github.featured));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setSelected(serverSelection ? serverSelection.split(",") : []);
  }, [serverSelection]);
  if (!github)
    return <p className="st-si-hidden">Connect GitHub to choose featured projects. Repositories are read from your public GitHub profile only.</p>;
  const repos = profile.github.repositories;
  if (!repos.length)
    return <p className="st-si-hidden">Your public repositories appear here after GitHub finishes syncing. Syncing runs in the background.</p>;
  const pinnedCount = repos.filter((r) => r.pinned).length;
  return (
    <form
      className="st-si-picker"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        const result = await skills.act("featured", () => skillsApi.featured(selected));
        if (result.ok) setMessage("Featured projects saved.");
        else setError(errorText(result.error));
      }}
    >
      <p className="st-si-fine">
        Projects pinned on GitHub appear first. Your selections fill the remaining places, up to {FEATURED_LIMIT} featured projects in total.
        {pinnedCount >= FEATURED_LIMIT ? " You already have three pinned repositories, so selections are kept but only pinned ones are featured." : ""}
      </p>
      <p className="st-si-count" aria-live="polite">
        {selected.length} of {FEATURED_LIMIT} selected
      </p>
      <ul>
        {repos.map((repo) => {
          const checked = selected.includes(repo.repoId);
          return (
            <li key={repo.repoId} data-checked={checked}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = toggleFeatured(selected, repo.repoId);
                    setSelected(next.selected);
                    setMessage(next.full ? `You can choose up to ${FEATURED_LIMIT} projects. Clear one to choose another.` : "");
                  }}
                />
                <span>
                  <strong>{repo.name}</strong>
                  {repo.description && <small>{repo.description}</small>}
                  <small>
                    {[repo.primaryLanguage, typeof repo.stars === "number" ? `${repo.stars} ${repo.stars === 1 ? "star" : "stars"}` : null].filter(Boolean).join(". ")}
                  </small>
                </span>
              </label>
              <span className="st-si-tags">
                {repo.pinned && (
                  <Badge>
                    <Pin size={11} aria-hidden="true" /> Pinned on GitHub
                  </Badge>
                )}
                {checked && (
                  <Badge tone="good">
                    <Star size={11} aria-hidden="true" /> Selected by you
                  </Badge>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="st-si-note" role="status">
          {message}
        </p>
      )}
      <div className="st-actions">
        <button className="st-button" disabled={skills.busy !== null}>
          {skills.busy === "featured" ? "Saving" : "Save featured projects"}
        </button>
      </div>
    </form>
  );
}
