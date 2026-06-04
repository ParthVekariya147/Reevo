import { isGbpLive } from './liveFlag';

export interface PostReplyArgs {
  accountId:      string;
  locationId:     string;
  googleReviewId: string;
  replyText:      string;
  accessToken:    string;
}

/**
 * Posts a reply to a Google Business Profile review.
 * SAFETY: when GBP_LIVE is off (mock mode) this function logs and returns {ok:true}
 * without making any network call — Google is never contacted.
 */
export async function postReplyToGoogle(args: PostReplyArgs): Promise<{ ok: boolean }> {
  if (!(await isGbpLive())) {
    console.log(`[MOCK] would post reply to ${args.googleReviewId}`);
    return { ok: true };
  }

  const { accountId, locationId, googleReviewId, replyText, accessToken } = args;
  const url =
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${googleReviewId}/reply`;

  const res = await fetch(url, {
    method:  'PUT',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: replyText }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const msg  = `[gbp/postReply] failed: ${res.status} ${body}`;
    console.error(msg);
    throw new Error(msg);
  }

  return { ok: true };
}
