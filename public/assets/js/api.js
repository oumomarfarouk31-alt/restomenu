async function submitOrderToPlatform() {
  if (!Array.isArray(cart) || cart.length === 0) {
    showToast(TRANSLATIONS[currentLang].emptyCart, 'alert-circle', true);
    return;
  }

  const info = validateCustomerInfo();
  if (!info) return;

  const button = document.getElementById('submit-platform-button');
  const originalText = button ? button.textContent : '';
  if (button) {
    button.disabled = true;
    button.textContent = currentLang === 'ar' ? 'جارٍ إرسال الطلب للمطبخ...' : 'Envoi en cours...';
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

    const orderNumber = result.order?.orderNumber || result.order?.order_number || '';
    cart = [];
    renderCart();
    toggleCartDrawer(false);

    const message = currentLang === 'ar'
      ? `تم إرسال طلبك إلى المطبخ بنجاح. رقم الطلب: ${orderNumber}`
      : currentLang === 'en'
        ? `Your order was sent to the kitchen. Order number: ${orderNumber}`
        : `Commande transmise à la cuisine. Référence : ${orderNumber}`;
    showToast(message, 'check-circle');
  } catch (error) {
    console.error('Kitchen order submission failed:', error);
    const message = currentLang === 'ar'
      ? 'تعذر إرسال الطلب. لم يتم حذف السلة؛ حاول مرة أخرى.'
      : currentLang === 'en'
        ? 'Could not send the order. Your cart is still saved; please try again.'
        : 'Impossible d’envoyer la commande. Votre panier est conservé ; réessayez.';
    showToast(message, 'alert-circle', true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}
