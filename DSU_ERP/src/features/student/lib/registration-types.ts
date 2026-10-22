import type {ProfileDetails,OfficialStudent} from './types';
export type RegistrationAcademic={enrollmentNo:string;yearOfStudy:string;cgpa:string};
export type RegistrationState={
  state:'matched'|'unmatched'|'review'|'verify_email'|'officer'|'restricted';email?:string;name?:string;
  official?:Omit<OfficialStudent,'department_short_name'> & {phone:string|null;city:string|null};
  draft:{details:Partial<ProfileDetails>;academic:RegistrationAcademic;step:number;status:'draft'|'pending'|'completed';revision:number}|null;
  profile:{details:Partial<ProfileDetails>;onboarded:boolean}|null;
};
