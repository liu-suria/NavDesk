import { json, readJson, getSecrets, passwordMatches, createSession, SESSION_MAX_AGE, requireAuth } from '../../../_lib.js';
export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin');
  if (origin && origin !== new URL(context.request.url).origin) return json({error:'Forbidden origin'},403);
  try {
    const {password} = await readJson(context.request);
    const {adminPassword,sessionSecret} = getSecrets(context);
    if (password === undefined) {
      const auth=await requireAuth(context); if(auth.response)return auth.response;
    } else if (typeof password !== 'string' || !await passwordMatches(password,adminPassword)) return json({error:'Unauthorized'},401);
    return json({token:await createSession(sessionSecret),tokenType:'Bearer',expiresIn:SESSION_MAX_AGE});
  } catch { return json({error:'无法签发令牌'},503); }
}
