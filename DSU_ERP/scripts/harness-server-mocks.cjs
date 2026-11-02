// Browser harnesses bundle real client components. Server actions they import
// run on the Next server in the app, so the harnesses replace them with these
// local stand-ins. window.__notices lets a harness supply notifications.
module.exports = {
  "@/shared/notifications/actions": `
    const list=()=>window.__notices||{audience:'officer',unread:0,rows:[]};
    export async function listNotifications(){return {ok:true,data:list()}}
    export async function readNotification(id){const l=list();window.__notices={...l,unread:Math.max(0,l.unread-1),rows:l.rows.filter(r=>r.id!==id)};(window.__noticeReads=window.__noticeReads||[]).push(id);return {ok:true,data:{read:true}}}
    export async function readAllNotifications(){window.__notices={...list(),unread:0,rows:[]};return {ok:true,data:{read:true}}}`,
  "@/shared/files/actions": `export async function fileLink(id){(window.__fileLinks=window.__fileLinks||[]).push(id);return {ok:true,url:'about:blank#'+id}}`,
  "@/app/placement/company-actions": `
    const ok=(data)=>({ok:true,data});
    export async function previewAudience(spec,search){return ok((window.__preview&&window.__preview(spec,search))||{total:0,added:0,removed:0,matching:0,byDepartment:[],byBatch:[],rows:[],page:1,limit:50})}
    export async function searchStudents(term){return ok((window.__search&&window.__search(term))||[])}
    export async function reviewRequest(id,decision,details){(window.__reviews=window.__reviews||[]).push({id,decision,details});return ok({status:decision==='approve'?'approved':decision,driveId:decision==='approve'?'drive-1':undefined,audience:2,notified:2})}
    export async function saveAudience(id,spec){(window.__audiences=window.__audiences||[]).push({id,spec});return ok({audience:2,notified:0})}
    export async function releaseApplicants(id,release){(window.__releases=window.__releases||[]).push({id,release});return ok({released:release,shared:1})}
    export async function inviteContact(c,email){return ok({link:'http://127.0.0.1/join/company?token=x',email,expiresAt:'2026-11-08T00:00:00Z',emailed:false})}
    export async function revokeInvite(){return ok({revoked:true})}
    export async function revokeMember(){return ok({revoked:true})}`,
};
