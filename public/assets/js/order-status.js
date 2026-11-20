(() => {
  const $ = id => document.getElementById(id);
  const copy = {
    fr: {
      eyebrow:'SUIVI DE COMMANDE', heading:'Où en est votre commande ?',
      intro:'Saisissez la référence reçue et le numéro de téléphone ou de table indiqué lors de la commande.',
      ref:'Référence de commande', contact:'Téléphone / N° de table', name:'Nom du client', submit:'Suivre ma commande',
      back:'Retour au menu', details:'Détails de la commande', order:'COMMANDE',
      customer:'Client', statuses:{pending:'Reçue',confirmed:'Confirmée',preparing:'En préparation',ready:'Prête',completed:'Terminée',cancelled:'Annulée'},
      steps:['Reçue','Confirmée','Préparation','Prête','Terminée'],
      invalid:'Veuillez saisir la référence et le téléphone ou numéro de table.',
      notFound:'Aucune commande ne correspond à ces informations. Vérifiez la référence et le contact.',
      error:'Impossible de consulter la commande pour le moment. Réessayez.',
      updated:'Dernière mise à jour', takeaway:'À emporter / livraison', dinein:'Sur place'
    },
    ar: {
      eyebrow:'تتبع الطلب', heading:'أين وصل طلبك؟',
      intro:'أدخل رقم الطلب الذي استلمته ورقم الهاتف أو رقم الطاولة الذي استخدمته عند الطلب.',
      ref:'رقم الطلب', contact:'الهاتف / رقم الطاولة', name:'اسم الزبون', submit:'تتبع طلبي',
      back:'العودة إلى القائمة', details:'تفاصيل الطلب', order:'الطلب',
      customer:'الزبون', statuses:{pending:'تم الاستلام',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',completed:'مكتمل',cancelled:'ملغى'},
      steps:['تم الاستلام','تم التأكيد','قيد التحضير','جاهز','مكتمل'],
      invalid:'يرجى إدخال رقم الطلب ورقم الهاتف أو الطاولة.',
      notFound:'لم نعثر على طلب بهذه المعلومات. تحقق من الرقم وبيانات الاتصال.',
      error:'تعذر جلب حالة الطلب حالياً. حاول مجدداً.',
      updated:'آخر تحديث', takeaway:'سفري / توصيل', dinein:'داخل المطعم'
    },
    en: {
      eyebrow:'ORDER TRACKING', heading:'Where is your order?',
      intro:'Enter your order reference and the phone number or table number used when ordering.',
      ref:'Order reference', contact:'Phone / Table number', name:'Customer name', submit:'Track my order',
      back:'Back to menu', details:'Order details', order:'ORDER',
      customer:'Customer', statuses:{pending:'Received',confirmed:'Confirmed',preparing:'Preparing',ready:'Ready',completed:'Completed',cancelled:'Cancelled'},
      steps:['Received','Confirmed','Preparing','Ready','Completed'],
      invalid:'Enter your order reference and phone or table number.',
      notFound:'No order matched those details. Check the reference and contact.',
      error:'Unable to retrieve the order right now. Please try again.',
      updated:'Last updated', takeaway:'Takeaway / delivery', dinein:'Dine-in'
    }
  };
  let lang='fr', lastOrder=null, restaurantName='Mimosa Brunch & Drunch';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localized=value=>typeof value==='string'?value:(value?.[lang]||value?.fr||value?.ar||value?.en||'Article');
  function applyLanguage(){
    const t=copy[lang];
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    $('eyebrow').textContent=t.eyebrow;$('heading').textContent=t.heading;$('intro').textContent=t.intro;
    $('ref-label').textContent=t.ref;$('contact-label').textContent=t.contact;$('name-label').textContent=t.name;$('lookup-button').textContent=t.submit;
    $('back-link').textContent=t.back;$('items-heading').textContent=t.details;$('order-ref-caption').textContent=t.order;
    if(lastOrder) renderOrder(lastOrder);
  }
  function showMessage(text,bad=true){
    const el=$('message');el.textContent=text;el.className='mt-4 rounded-xl p-3 text-sm '+(bad?'bg-rose-950/70 text-rose-200 border border-rose-800':'bg-emerald-950/70 text-emerald-200 border border-emerald-800');
  }
  function money(value,currency){
    return new Intl.NumberFormat(lang==='ar'?'ar-DZ':lang==='en'?'en-US':'fr-DZ',{maximumFractionDigits:0}).format(Number(value||0))+' '+(currency==='DZD'?'دج':currency||'دج');
  }
  function renderOrder(order){
    const t=copy[lang],states=['pending','confirmed','preparing','ready','completed'];
    $('result-number').textContent=order.orderNumber;
    $('result-customer').textContent=t.customer+': '+order.customerName+' · '+(order.orderType==='sur_place'?t.dinein:t.takeaway);
    $('status-pill').textContent=t.statuses[order.status]||order.status;
    $('status-pill').className='rounded-full px-3 py-1.5 text-xs font-bold '+(order.status==='cancelled'?'bg-rose-400/10 text-rose-200':'bg-amber-400/10 text-amber-300');
    const current=states.indexOf(order.status);
    $('timeline').innerHTML=states.map((state,index)=>{
      const done=order.status!=='cancelled'&&current>=index;
      return (index?'<span class="step-line '+(done?'done':'')+'"></span>':'')+'<span class="step-dot '+(done?'done':'')+'" aria-label="'+esc(t.statuses[state])+'">'+(done?'✓':index+1)+'</span>';
    }).join('');
    $('timeline-labels').innerHTML=t.steps.map((label,index)=>'<span class="step-label '+(order.status!=='cancelled'&&current>=index?'text-amber-300':'')+'">'+esc(label)+'</span>').join('');
    if(order.status==='cancelled') $('timeline-labels').innerHTML='<span class="col-span-5 text-rose-300">'+esc(t.statuses.cancelled)+'</span>';
    $('result-total').textContent=money(order.total,order.currency);
    $('result-items').innerHTML=(order.items||[]).map(item=>{
      const extras=(item.extras||[]).map(x=>localized(x.name||x.label||x)).filter(Boolean).join(', ');
      return '<div class="py-3"><div class="flex justify-between gap-3 text-sm"><span>'+esc(item.quantity+' × '+localized(item.name))+'</span><b>'+esc(money(item.total,order.currency))+'</b></div>'+(extras?'<p class="text-xs text-slate-400 mt-1">+ '+esc(extras)+'</p>':'')+(item.note?'<p class="text-xs text-amber-200 mt-1">'+esc(item.note)+'</p>':'')+'</div>';
    }).join('')||'<p class="text-sm text-slate-400 py-3">—</p>';
    $('updated-at').textContent=t.updated+': '+new Intl.DateTimeFormat(lang==='ar'?'ar-DZ':lang==='en'?'en-US':'fr-DZ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(order.createdAt));
    $('result').classList.remove('hidden');
  }
  $('language').addEventListener('change',e=>{lang=e.target.value;applyLanguage()});
  $('lookup-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const orderNumber=$('order-number').value.trim(),customerContact=$('customer-contact').value.trim();
    if(!orderNumber||!customerContact){showMessage(copy[lang].invalid);return}
    const button=$('lookup-button');button.disabled=true;button.textContent=lang==='ar'?'جارٍ البحث...':lang==='en'?'Searching...':'Recherche...';
    $('message').classList.add('hidden');$('result').classList.add('hidden');
    try{
      const params=new URLSearchParams({restaurantSlug:'mimosa',orderNumber,customerContact,customerName});
      const response=await fetch('/api/orders?'+params.toString(),{cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success){
        showMessage(response.status===404?copy[lang].notFound:copy[lang].error);
        return;
      }
      restaurantName=data.restaurant?.name||restaurantName;
      $('brand').textContent=restaurantName;
      lastOrder=data.order;renderOrder(lastOrder);
    }catch(error){console.error('Order tracking failed:',error);showMessage(copy[lang].error)}
    finally{button.disabled=false;button.textContent=copy[lang].submit}
  });
  applyLanguage();
})();