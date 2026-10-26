import {competencyRead,requireCompetencyTesting} from '@/features/competency/server';
import {OfficerIntelligence} from '@/features/competency/Intelligence';
import type {Catalog,Overview,Profile} from '@/features/competency/types';
import '@/features/competency/competency.css';
export default async function TalentIntelligence({searchParams}:{searchParams:Promise<{student?:string}>}){
 requireCompetencyTesting();
 const [overview,catalog]=await Promise.all([competencyRead<Overview>('/placement/talent-intelligence'),competencyRead<Catalog>('/competency/catalog')]);
 const {student}=await searchParams;
 const profile=student&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(student)?await competencyRead<Profile>('/placement/talent-intelligence/student/'+student):null;
 return <OfficerIntelligence initial={overview} catalog={catalog} initialProfile={profile}/>;
}
