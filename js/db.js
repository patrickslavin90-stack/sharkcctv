// ── db.js — all Supabase queries ─────────────────────────────
// Requires: config.js loaded first, supabase CDN loaded

let _sb = null;

function getClient() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _sb;
}

// ── Auth ─────────────────────────────────────────────────────

const Auth = {
  async signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user } } = await getClient().auth.getUser();
    return user;
  },

  onAuthChange(cb) {
    return getClient().auth.onAuthStateChange(cb);
  },

  async getProfile(userId) {
    const { data, error } = await getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },
};

const Products = {
  async list() {
    const { data, error } = await getClient()
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    return data;
  },
};

const Quotes = {
  async create(quoteData) {
    const user = await Auth.getUser();
    const quoteNumber = await Quotes._nextNumber();
    const { data, error } = await getClient()
      .from('quotes')
      .insert({ ...quoteData, quote_number: quoteNumber, created_by: user.id })
      .select().single();
    if (error) throw error;
    return data;
  },
  async update(id, quoteData) {
    const { data, error } = await getClient()
      .from('quotes').update(quoteData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async _nextNumber() {
    const { count } = await getClient().from('quotes').select('*', { count: 'exact', head: true });
    return `${QUOTE_PREFIX}-${new Date().getFullYear()}-${String((count||0)+1).padStart(4,'0')}`;
  },
  async setItems(quoteId, items) {
    await getClient().from('quote_items').delete().eq('quote_id', quoteId);
    if (!items.length) return;
    const rows = items.map(i => ({ quote_id: quoteId, product_id: i.product_id||null, name: i.name, model: i.model, price: i.price, qty: i.qty, color: i.color }));
    const { error } = await getClient().from('quote_items').insert(rows);
    if (error) throw error;
  },
  async saveFull(qid, d, items, cams) {
    await Quotes.update(qid, { ...d, camera_placements: cams });
    await Quotes.setItems(qid, items);
  },
};

const Favourites = {
  async list(userId) {
    if (!userId) return [];
    const { data, error } = await getClient().from('user_favourites').select('product_id').eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },
  async add(uid, pid) {
    const { error } = await getClient().from('user_favourites').insert({ user_id: uid, product_id: pid });
    if (error) throw error;
  },
  async remove(uid, pid) {
    const { error } = await getClient().from('user_favourites').delete().eq('user_id', uid).eq('product_id', pid);
    if (error) throw error;
  },
};
