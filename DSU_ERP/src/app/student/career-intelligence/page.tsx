import {competencyRead,requireCompetencyTesting} from '@/features/competency/server';
import {StudentIntelligence} from '@/features/competency/Intelligence';
import type {Catalog,Profile} from '@/features/competency/types';
import '@/features/competency/competency.css';
export default async function CareerIntelligence(){
 requireCompetencyTesting();
 const [profile,catalog]=await Promise.all([competencyRead<Profile>('/student/career-intelligence'),competencyRead<Catalog>('/competency/catalog')]);
 return <StudentIntelligence initial={profile} catalog={catalog}/>;
}
