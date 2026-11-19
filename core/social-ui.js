export function initSocialUI() {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const toast=$("#toast");let timer,stream=null,filter="none";
 function notice(m){if(!toast)return;toast.textContent=m;toast.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove("show"),2500);}
 $("#nox-id-submit")?.addEventListener("click",()=>{const id=$("#nox-id-search")?.value.trim();notice(id?"واجهة البحث جاهزة؛ ربط البحث وإرسال طلب الصداقة بقاعدة البيانات في المرحلة التالية.":"اكتب NOX ID للبحث.");});
 $("#nox-id-search")?.addEventListener("keydown",e=>{if(e.key==="Enter")$("#nox-id-submit")?.click();});
 const video=$("#nox-camera-video"),empty=$("#nox-camera-empty"),start=$("#nox-camera-start"),stop=$("#nox-camera-stop"),capture=$("#nox-camera-capture");
 async function stopCamera(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(video){video.srcObject=null;video.hidden=true;video.style.filter="none";}if(empty)empty.hidden=false;if(start)start.disabled=false;if(stop)stop.disabled=true;if(capture)capture.disabled=true;}
 window.addEventListener("nox:screenchange",event=>{if(event.detail?.from==="camera"&&event.detail?.to!=="camera")stopCamera();});
 start?.addEventListener("click",async()=>{if(!navigator.mediaDevices?.getUserMedia)return notice("الكاميرا غير مدعومة في هذا المتصفح أو الاتصال.");try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});video.srcObject=stream;video.style.filter=filter;video.hidden=false;empty.hidden=true;start.disabled=true;stop.disabled=false;capture.disabled=false;}catch(e){notice(e?.name==="NotAllowedError"?"لم يتم السماح للكاميرا. راجع إذن المتصفح.":"تعذر تشغيل الكاميرا على هذا الجهاز.");}});
 stop?.addEventListener("click",stopCamera);
 $$(".nox-filter").forEach(b=>b.addEventListener("click",()=>{$$(".nox-filter").forEach(x=>x.classList.toggle("active",x===b));filter=b.dataset.filter||"none";if(video)video.style.filter=filter;}));
 capture?.addEventListener("click",()=>{const canvas=$("#nox-camera-canvas");if(!stream||!video.videoWidth)return notice("انتظر حتى تعمل معاينة الكاميرا.");canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext("2d");ctx.filter=filter;ctx.drawImage(video,0,0);$("#nox-captured-image").src=canvas.toDataURL("image/jpeg",.9);$("#nox-capture-preview").hidden=false;notice("تم التقاط صورة للمعاينة المحلية فقط.");});
 $("#nox-capture-close")?.addEventListener("click",()=>$("#nox-capture-preview").hidden=true);
 window.addEventListener("pagehide",()=>{if(stream)stream.getTracks().forEach(t=>t.stop());});
 $$("[data-story-preview]").forEach(b=>b.addEventListener("click",()=>{const r=$("#nox-story-result");r.replaceChildren();const title=document.createElement("b"),note=document.createElement("small");title.textContent=b.dataset.storyPreview;note.textContent="معاينة شكلية فقط — الحالات الحقيقية ستُحمّل من قاعدة البيانات";r.append(title,note);}));
 $$("[data-reel-like]").forEach(b=>b.addEventListener("click",()=>{const liked=b.classList.toggle("liked");b.textContent=liked?"♥ أعجبني":"♡ إعجاب";b.setAttribute("aria-pressed",String(liked));}));
}
