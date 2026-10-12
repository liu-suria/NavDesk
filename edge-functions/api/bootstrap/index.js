import {bootstrap} from '../../_bootstrap.js';
import {getNavigation,getNavigationStore} from '../../_storage.js';
import {versionFromCookie} from '../../_navigation-read.js';
import {parseCookies} from '../../_lib.js';
import {readFamily} from '../../_family.js';
export const onRequestGet=context=>bootstrap(context,{
 navigation:async()=>{const {trash,...visible}=await getNavigation(getNavigationStore(),{list:true,minVersion:versionFromCookie(parseCookies(context.request).navdesk_revision)});return visible},
 family:()=>readFamily(context,'ledger'),
});
