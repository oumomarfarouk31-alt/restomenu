function validateCustomerInfo() {
  const name = document.getElementById('cust-name').value.trim();
  const tableOrPhone = document.getElementById('cust-table-or-phone').value.trim();

  if (!name || !tableOrPhone) {
    showToast(TRANSLATIONS[currentLang].validationError, 'alert-circle', true);
    return null;
  }
  const orderType = document.querySelector('input[name="order-type"]:checked').value;
  return { name, tableOrPhone, orderType };
}

async function submitOrderViaWhatsApp() {
  if (cart.length === 0) {
    showToast(TRANSLATIONS[currentLang].emptyCart, 'alert-circle', true);
    return;
  }

  const info = validateCustomerInfo();
  if (!info) return;

  const submitButton = document.getElementById('submit-order-button');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalText = submitButton.textContent;
    submitButton.textContent = currentLang === 'ar' ? 'جارٍ حفظ الطلب...' : 'Enregistrement...';
  }

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantSlug: RESTAURANT_CONFIG.slug || 'mimosa',
        customerName: info.name,
        customerContact: info.tableOrPhone,
        orderType: info.orderType === 'sur_place' ? 'sur_place' : 'takeaway',
        items: cart.map(entry => ({
          id: String(entry.item.id),
          quantity: entry.quantity,
          extras: entry.selectedExtras,
          note: entry.note || ''
        }))
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to save order.');
    }

    const { order, restaurant } = result;
    const isArabic = currentLang === 'ar';
    const lines = cart.map((entry, index) => {
      const title = entry.item.title[currentLang] || entry.item.title.fr || entry.item.title.en;
      const extras = entry.selectedExtras.map(extra => extra.name?.[currentLang] || extra.name?.fr || '').filter(Boolean);
      return [
        `${index + 1}. *${title}* × ${entry.quantity}`,
        extras.length ? (isArabic ? `   الإضافات: ${extras.join('، ')}` : `   Suppléments: ${extras.join(', ')}`) : '',
        entry.note ? (isArabic ? `   ملاحظة: ${entry.note}` : `   Note: ${entry.note}`) : ''
      ].filter(Boolean).join('\n');
    }).join('\n');

    const orderTypeLabel = info.orderType === 'sur_place'
      ? (isArabic ? `داخل المطعم: ${info.tableOrPhone}` : `Sur place: ${info.tableOrPhone}`)
      : (isArabic ? `خارجي / هاتف: ${info.tableOrPhone}` : `À emporter / téléphone: ${info.tableOrPhone}`);

    const message = isArabic
      ? `طلب جديد من ${restaurant.name}\nرقم الطلب: ${order.orderNumber}\nالعميل: ${info.name}\nالنوع: ${orderTypeLabel}\n\n${lines}\n\nالمجموع: ${order.total} ${order.currency}`
      : `Nouvelle commande — ${restaurant.name}\nRéférence: ${order.orderNumber}\nClient: ${info.name}\nMode: ${orderTypeLabel}\n\n${lines}\n\nTotal: ${order.total} ${order.currency}`;

    cart = [];
    renderCart();
    toggleCartDrawer(false);

    if (restaurant.whatsappNumber) {
      const whatsappUrl = `https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener');
      showToast(isArabic ? 'تم حفظ الطلب. جارٍ فتح واتساب...' : 'Commande enregistrée. Ouverture de WhatsApp...', 'check-circle');
    } else {
      showToast(isArabic ? `تم حفظ طلبك رقم ${order.orderNumber}` : `Commande enregistrée : ${order.orderNumber}`, 'check-circle');
    }
  } catch (error) {
    console.error('Order submission failed:', error);
    showToast(currentLang === 'ar' ? 'تعذر حفظ الطلب. حاول مرة أخرى.' : 'Impossible d’enregistrer la commande. Réessayez.', 'alert-circle', true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
    }
  }
}