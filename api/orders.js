const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function send(res, status, payload) {
  return res.status(status).json(payload);
}

async function supabase(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.message || 'Database request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

function validText(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

function sameExtra(selected, available) {
  return available.some(extra =>
    JSON.stringify(extra) === JSON.stringify(selected)
  );
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { success: false, message: 'Method Not Allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return send(res, 503, { success: false, message: 'Order service is not configured.' });
  }

  const body = req.body || {};
  const restaurantSlug = typeof body.restaurantSlug === 'string' ? body.restaurantSlug.trim() : '';
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerContact = typeof body.customerContact === 'string' ? body.customerContact.trim() : '';
  const orderType = body.orderType;
  const items = body.items;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(restaurantSlug) ||
      !validText(customerName, 120) ||
      !validText(customerContact, 120) ||
      !['sur_place', 'takeaway'].includes(orderType) ||
      !Array.isArray(items) || items.length < 1 || items.length > 40) {
    return send(res, 400, { success: false, message: 'Invalid order details.' });
  }

  if (items.some(item =>
    !item || typeof item.id !== 'string' ||
    !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50 ||
    !Array.isArray(item.extras) || item.extras.length > 20 ||
    (item.note != null && (typeof item.note !== 'string' || item.note.length > 500))
  )) {
    return send(res, 400, { success: false, message: 'Invalid order item.' });
  }

  try {
    const restaurants = await supabase(
      `restaurants?select=id,name,slug,currency,is_active,whatsapp_number&slug=eq.${encodeURIComponent(restaurantSlug)}&limit=1`
    );
    const restaurant = restaurants?.[0];
    if (!restaurant || !restaurant.is_active) {
      return send(res, 404, { success: false, message: 'Restaurant not found or inactive.' });
    }

    const ids = [...new Set(items.map(item => item.id))];
    const idFilter = ids.map(id => `"${id.replace(/"/g, '')}"`).join(',');
    const menuItems = await supabase(
      `menu_items?select=id,restaurant_id,name,price,extras,is_available&restaurant_id=eq.${restaurant.id}&id=in.(${idFilter})`
    );
    const menuById = new Map((menuItems || []).map(item => [item.id, item]));

    let subtotal = 0;
    const lines = [];
    for (const requested of items) {
      const menuItem = menuById.get(requested.id);
      if (!menuItem || !menuItem.is_available) {
        return send(res, 409, { success: false, message: 'One or more menu items are unavailable.' });
      }
      const availableExtras = Array.isArray(menuItem.extras) ? menuItem.extras : [];
      if (!requested.extras.every(extra => sameExtra(extra, availableExtras))) {
        return send(res, 400, { success: false, message: 'An item option is invalid. Please refresh the menu.' });
      }
      const extrasTotal = requested.extras.reduce((sum, extra) => sum + Number(extra.price || 0), 0);
      const unitPrice = Number(menuItem.price) + extrasTotal;
      const lineTotal = unitPrice * requested.quantity;
      subtotal += lineTotal;
      lines.push({
        restaurant_id: restaurant.id,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        quantity: requested.quantity,
        unit_price: unitPrice,
        selected_extras: requested.extras,
        line_total: lineTotal,
        note: requested.note ? requested.note.trim() : null
      });
    }

    const orderNumber = `RM-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const created = await supabase('orders?select=id,order_number,total,currency,created_at', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{
        restaurant_id: restaurant.id,
        order_number: orderNumber,
        customer_name: customerName,
        customer_contact: customerContact,
        order_type: orderType,
        currency: restaurant.currency || 'DZD',
        subtotal,
        total: subtotal
      }])
    });
    const order = created?.[0];
    if (!order) throw new Error('Order could not be created.');

    try {
      await supabase('order_items', {
        method: 'POST',
        body: JSON.stringify(lines.map(line => ({ ...line, order_id: order.id })))
      });
    } catch (error) {
      await supabase(`orders?id=eq.${order.id}`, { method: 'DELETE' }).catch(() => null);
      throw error;
    }

    return send(res, 201, {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        total: Number(order.total),
        currency: order.currency,
        createdAt: order.created_at
      },
      restaurant: {
        name: restaurant.name,
        whatsappNumber: restaurant.whatsapp_number || ''
      }
    });
  } catch (error) {
    console.error('Order creation failed:', error.message);
    return send(res, 500, { success: false, message: 'Unable to save the order. Please try again.' });
  }
};
