// Cloudflare Worker: a short, easy link for the Volume II last pieces.
// It sends everyone straight to the Shop tab of the BAD App, where the Volume II items now live.
// Deploy: Cloudflare dashboard → Workers & Pages → Create → Worker → paste this file → Deploy.
// The link will look like https://volume-ii.thebadclub-co.workers.dev (same account as FRAGMENTS RELEASE).
const APP = 'https://thebadclub.com/';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // /quests goes to Side Quests; anything else goes to the Shop
    const tab = url.pathname.replace(/\/+$/, '') === '/quests' ? 'quests' : 'shop';
    return Response.redirect(APP + '#' + tab, 302);
  },
};
