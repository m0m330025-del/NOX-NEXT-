// NOX NEXT social sections: interactive front-end prototype.
// User-generated content stays in memory for this page session; no fake server sync.
export function initSections() {
  const workspace=document.querySelector(".workspace");
  if(!workspace)return;
  const toast=document.getElementById("toast");
  const notify=(message)=>{if(!toast)return;toast.textContent=message;toast.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove("show"),2600);};
  const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const sections=[
    ["discover","اكتشف","NOX EXPLORE","اكتشف أشخاصًا واهتمامات ومحتوى جديدًا"],
    ["friends-view","الأصدقاء","YOUR CIRCLE","طلبات الصداقة والأصدقاء المقترحون"],
    ["notifications","الإشعارات","NOX ALERTS","كل التنبيهات في مكان واحد"],
    ["saved","المحفوظات","YOUR COLLECTION","المنشورات التي تحفظها للعودة إليها"],
    ["gifts","الهدايا","NOX GIFTS","اختَر هدية رمزية وشارك لحظة لطيفة"],
    ["settings","الإعدادات","YOUR CONTROL","تحكم في تجربتك وخصوصيتك"]
  ];
  const panels={};
  for(const [id,title,kicker,desc] of sections){
    const section=make("section","social-feature-section nox-dynamic-section");section.id=id;
    const head=make("header","feature-heading");const copy=make("div");copy.append(make("small","",kicker),make("h2","",title),make("p","",desc));head.append(copy);section.append(head);
    const body=make("div","nox-section-body");section.append(body);workspace.append(section);panels[id]=body;
  }
  // Explore
  const explore=panels.discover;
  const search=make("input","nox-section-search");search.type="search";search.placeholder="ابحث في NOX عن محتوى أو أشخاص...";search.setAttribute("aria-label","البحث في اكتشف");
  const filters=make("div","nox-chip-row");["الكل","الأصدقاء","صور","فيديو","اهتمامات"].forEach((label,i)=>{const b=make("button","nox-chip",label);b.type="button";b.dataset.exploreFilter=String(i);if(!i)b.classList.add("active");filters.append(b);});
  const exploreGrid=make("div","nox-explore-grid");
  [["✦","مساحات إبداعية","اكتشف منشورات ملهمة وأفكارًا جديدة"],["◎","صنّاع المحتوى","تابع المبدعين الذين يشاركون اهتماماتك"],["♧","مجتمع NOX","كوّن دائرة اجتماعية باحترام وخصوصية"]].forEach(([icon,title,desc])=>{const card=make("article","nox-info-card");card.append(make("span","nox-info-icon",icon),make("b","",title),make("p","",desc));exploreGrid.append(card);});
  explore.append(search,filters,exploreGrid);
  filters.addEventListener("click",e=>{const b=e.target.closest("[data-explore-filter]");if(!b)return;filters.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));notify("تم اختيار تصنيف "+b.textContent+" — عرض المحتوى الحقيقي يحتاج ربط الخادم.");});
  search.addEventListener("keydown",e=>{if(e.key==="Enter"&&search.value.trim())notify("بحث الواجهة جاهز؛ نتائج الأعضاء تحتاج فهرس بحث على الخادم.");});
  // Friends
  const friends=panels["friends-view"];const friendIntro=make("div","nox-section-card");
  friendIntro.append(make("h3","","دائرة NOX الخاصة بك"),make("p","","ابحث باستخدام NOX ID فقط، وأرسل طلب صداقة قبل بدء محادثة خاصة."));
  const friendForm=make("form","nox-inline-form"),friendInput=make("input","nox-section-search");friendInput.placeholder="أدخل NOX ID";friendInput.maxLength=80;friendInput.required=true;
  const friendSubmit=make("button","feature-primary","بحث عن صديق");friendSubmit.type="submit";friendForm.append(friendInput,friendSubmit);friendIntro.append(friendForm);
  const friendStatus=make("p","nox-inline-status","لم يتم إجراء بحث بعد.");friendIntro.append(friendStatus);
  friendForm.addEventListener("submit",e=>{e.preventDefault();const id=friendInput.value.trim();if(!id)return;friendStatus.textContent="طلب البحث عن "+id+" جاهز للربط بالخادم؛ لم يتم إرسال طلب فعلي.";notify("هذه معاينة محلية — لا يوجد طلب صداقة تم إرساله.");});
  const requestList=make("div","nox-explore-grid");[["مريم جمال","اقتراح تجريبي"],["أحمد المصري","اقتراح تجريبي"],["ليلى محمد","اقتراح تجريبي"]].forEach(([name,meta])=>{const card=make("article","nox-info-card");card.append(make("span","nox-info-icon","♧"),make("b","",name),make("small","",meta));const b=make("button","feature-secondary","إضافة");b.type="button";b.addEventListener("click",()=>{b.disabled=true;b.textContent="بانتظار الربط";notify("زر تجريبي — لم يُرسل طلب حقيقي.");});card.append(b);requestList.append(card);});
  friends.append(friendIntro,make("h3","nox-subheading","أشخاص قد تعرفهم"),requestList);
  // Notifications
  const notifications=panels.notifications;const notificationTop=make("div","nox-section-toolbar");notificationTop.append(make("p","","التنبيهات المعروضة هنا أمثلة توضيحية حتى ربط خدمة الإشعارات."));const readAll=make("button","feature-secondary","تحديد الكل كمقروء");readAll.type="button";notificationTop.append(readAll);notifications.append(notificationTop);
  const notificationList=make("div","nox-notification-list");
  [["♡","تفاعل جديد","سيظهر هنا من أعجب بمنشوراتك."],["♧","طلبات الصداقة","تابع طلبات الصداقة الواردة والصادرة."],["✉","رسالة جديدة","ستظهر الرسائل بعد تفعيل المحادثات الآمنة."]].forEach(([icon,title,desc])=>{const item=make("article","nox-notification-item unread");item.append(make("span","nox-info-icon",icon),make("div","",title),make("p","",desc));notificationList.append(item);});
  readAll.addEventListener("click",()=>{notificationList.querySelectorAll(".unread").forEach(x=>x.classList.remove("unread"));notify("تم تحديث حالة أمثلة الإشعارات في هذه الصفحة.");});notifications.append(notificationList);
  // Saved
  const saved=panels.saved;const savedEmpty=make("div","nox-section-card nox-empty-state");savedEmpty.append(make("span","nox-info-icon","▤"),make("h3","","لا توجد عناصر محفوظة بعد"),make("p","","استخدم زر حفظ في المنشورات لإضافتها إلى مجموعتك خلال جلسة الصفحة."));saved.append(savedEmpty);
  // Gifts
  const gifts=panels.gifts;const giftGrid=make("div","nox-explore-grid");[["💜","قلب بنفسجي"],["🌟","نجمة مضيئة"],["👑","تاج NOX"],["🦋","فراشة"],["🎁","صندوق مفاجأة"],["✨","بريق"]].forEach(([emoji,name])=>{const card=make("article","nox-info-card");card.append(make("span","nox-gift-emoji",""+emoji),make("b","",name));const b=make("button","feature-secondary","اختيار");b.type="button";b.addEventListener("click",()=>notify("تم اختيار "+name+" كمعاينة فقط؛ لا توجد مدفوعات أو إرسال هدايا مفعّل."));card.append(b);giftGrid.append(card);});gifts.append(giftGrid,make("p","nox-privacy-note","الهدايا هنا رمزية وتجريبية. لا توجد عمليات شراء أو مدفوعات."));
  // Settings
  const settings=panels.settings;const settingsCard=make("div","nox-section-card");settingsCard.append(make("h3","","إعدادات التجربة"));
  const options=[["إظهار معاينة الملف الشخصي","تتحكم في عرض معاينة الحساب داخل هذه الصفحة."],["تقليل الحركة","تفضيل بصري لتقليل المؤثرات المتحركة."],["تأكيد قبل مشاركة المحتوى","تذكير قبل أي مشاركة مستقبلية."]];
  options.forEach(([label,desc],i)=>{const row=make("label","nox-setting-row");const text=make("span");text.append(make("b","",label),make("small","",desc));const input=make("input");input.type="checkbox";input.checked=i!==1;input.addEventListener("change",()=>{if(i===1)document.documentElement.classList.toggle("nox-reduce-motion",input.checked);notify("تم تطبيق الإعداد على هذه الجلسة فقط.");});row.append(text,input);settingsCard.append(row);});
  settings.append(settingsCard,make("p","nox-privacy-note","لا نعرض بريدك الإلكتروني أو بياناتك الخاصة في هذه الأقسام. الإعدادات الدائمة ومزامنتها تحتاج إعدادًا آمنًا على الخادم."));
  // Add a More menu in mobile header without crowding the primary navigation.
  const actions=document.querySelector(".mobile-actions");
  if(actions&&!actions.querySelector('[data-action="open-more"]')){const more=make("button","icon-button","☰");more.type="button";more.dataset.action="open-more";more.setAttribute("aria-label","المزيد من الأقسام");actions.append(more);
    const menu=make("div","nox-more-menu");menu.hidden=true;[["discover","اكتشف"],["friends-view","الأصدقاء"],["notifications","الإشعارات"],["saved","المحفوظات"],["gifts","الهدايا"],["settings","الإعدادات"]].forEach(([id,label])=>{const a=make("a","",label);a.href="#"+id;menu.append(a);});document.querySelector(".app-frame")?.append(menu);
    more.addEventListener("click",()=>{menu.hidden=!menu.hidden;more.setAttribute("aria-expanded",String(!menu.hidden));});
    menu.addEventListener("click",e=>{if(e.target.closest("a"))menu.hidden=true;});
    document.addEventListener("click",e=>{if(!menu.contains(e.target)&&!more.contains(e.target))menu.hidden=true;});
  }
  // Feed composer: safe text-only post creation, stored only in current page memory.
  const composer=document.querySelector(".composer");
  if(composer){const prompt=composer.querySelector(".composer-prompt");prompt?.removeAttribute("data-action");prompt?.addEventListener("click",()=>openComposer());
    composer.querySelectorAll('[data-action="demo-notice"]').forEach(b=>{b.removeAttribute("data-action");b.addEventListener("click",()=>openComposer());});
  }
  let savedPosts=[];
  function openComposer(){
    if(document.getElementById("nox-compose-dialog"))return;
    const dialog=make("dialog","nox-compose-dialog");dialog.id="nox-compose-dialog";
    const form=make("form","nox-compose-form");form.method="dialog";form.append(make("h2","","إنشاء منشور"));
    const area=make("textarea","nox-section-search");area.placeholder="شارك فكرة أو لحظة جميلة...";area.maxLength=1000;area.required=true;
    const privacy=make("select","nox-section-search");[["public","عام"],["friends","الأصدقاء"],["private","أنا فقط"]].forEach(([v,t])=>{const o=make("option");o.value=v;o.textContent=t;privacy.append(o);});
    const controls=make("div","nox-compose-actions");const cancel=make("button","feature-secondary","إلغاء");cancel.type="button";cancel.addEventListener("click",()=>dialog.close());const publish=make("button","feature-primary","نشر");publish.type="submit";controls.append(cancel,publish);form.append(area,privacy,controls);dialog.append(form);document.body.append(dialog);
    form.addEventListener("submit",e=>{e.preventDefault();const value=area.value.trim();if(!value)return;const card=make("article","post card nox-user-post");const header=make("header","post-header");header.append(make("span","avatar nox-post-avatar","N"),make("div","post-author","حسابي"));card.append(header,make("p","post-copy",value));const meta=make("small","nox-post-privacy",privacy.options[privacy.selectedIndex].textContent+" · منشور محلي لهذه الجلسة");card.append(meta);const actions=make("div","post-actions");const like=make("button","","♡ إعجاب");like.type="button";like.addEventListener("click",()=>{like.classList.toggle("liked");like.textContent=like.classList.contains("liked")?"♥ أعجبني":"♡ إعجاب";});const save=make("button","","▤ حفظ");save.type="button";save.addEventListener("click",()=>{savedPosts.push({text:value,privacy:privacy.value});const count=saved.querySelectorAll(".nox-saved-post").length;if(count===0)saved.querySelector(".nox-empty-state")?.remove();const item=make("article","nox-section-card nox-saved-post",value);saved.append(item);notify("أُضيف المنشور إلى المحفوظات في هذه الجلسة.");});actions.append(like,save);card.append(actions);document.querySelector(".feed-column")?.prepend(card);dialog.close();dialog.remove();notify("تم إنشاء معاينة المنشور محليًا. لم يُرفع إلى NOX.");});
    dialog.addEventListener("close",()=>dialog.remove());dialog.showModal();area.focus();
  }
  // Search currently filters visible local posts only; remote member search is a backend task.
  const globalSearch=document.getElementById("global-search");
  globalSearch?.addEventListener("input",()=>{const q=globalSearch.value.trim().toLocaleLowerCase("ar");document.querySelectorAll(".post").forEach(post=>{post.hidden=!!q&&!post.textContent.toLocaleLowerCase("ar").includes(q);});});
  // Make notifications, gifts and settings reachable from existing sidebar links.
  document.querySelectorAll('.primary-nav a[data-nav="gifts"],.primary-nav a[data-nav="settings"]').forEach(a=>a.removeAttribute("data-action"));
}
