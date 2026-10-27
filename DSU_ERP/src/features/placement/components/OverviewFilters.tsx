"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Query, Report } from "../lib/types";

export function OverviewFilters({query, options}:{query:Query;options:Report["options"]}) {
  const router=useRouter();
  const [pending, startTransition]=useTransition();
  const navigate=(params:URLSearchParams)=>startTransition(()=>router.push(`/placement/overview${params.size?`?${params}`:""}`,{scroll:false}));
  return <section className="po-overview-toolbar" aria-label="Cohort filters" aria-busy={pending}>
    <form key={JSON.stringify(query)} className="po-filters" role="search" onSubmit={e=>{
      e.preventDefault(); if(pending)return;
      const form=new FormData(e.currentTarget), params=new URLSearchParams();
      for(const key of ["search","batch","department"]) {const value=String(form.get(key)||"").trim();if(value)params.set(key,value);}
      navigate(params);
    }}>
      <label>Student name or USN<input name="search" defaultValue={query.search||""} placeholder="Search name or USN" maxLength={100}/></label>
      <label>Passing-out batch<select aria-label="Passing-out batch" name="batch" defaultValue={query.batch||""}><option value="">All batches</option>{options.batches.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      <label>Branch<select aria-label="Branch" name="department" defaultValue={query.department||""}><option value="">All branches</option>{options.departments.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      <button className="erp-primary" disabled={pending}>{pending?"Applying…":"Apply filters"}</button>
      <button type="button" className="erp-secondary" disabled={pending} onClick={()=>navigate(new URLSearchParams())}>Clear</button>
    </form>
    <div className="po-filter-scope" role="status">{pending?"Updating dashboard…":`Showing ${query.batch?`batch ${query.batch}`:"all batches"} · ${query.department||"all branches"}${query.search?` · Search: ${query.search}`:""}`}</div>
  </section>;
}
