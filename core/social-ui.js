export function initSocialUI() {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const toast=$("#toast");let timer,stream=null,filter="none",facingMode="user",recorder=null,recordedChunks=[],outputUrl=null,recordStream=null,recordFrame=0;
 function notice(message){const status=$("#nox-camera-status");if(status)status.textContent=message;if(!toast)return;toast.textContent=message;toast.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove("show"),2600);}
 $("#nox-id-submit")?.addEventListener("click",()=>{const id=$("#nox-id-search")?.value.trim();notice(id?"واجهة البحث جاهزة؛ ربط البحث وإرسال طلب الصداقة بقاعدة البيانات في المرحلة التالية.":"اكتب NOX ID للبحث.");});
 $("#nox-id-search")?.addEventListener("keydown",e=>{if(e.key==="Enter")$("#nox-id-submit")?.click();});

 const video=$("#nox-camera-video"),empty=$("#nox-camera-empty"),start=$("#nox-camera-start"),stop=$("#nox-camera-stop"),capture=$("#nox-camera-capture"),record=$("#nox-camera-record"),flip=$("#nox-camera-flip"),canvas=$("#nox-camera-canvas"),recordCanvas=$("#nox-record-canvas");
 const stage=$("#nox-camera-stage"),stickerLayer=$("#nox-live-sticker"),captionLayer=$("#nox-live-caption"),captionInput=$("#nox-camera-caption-input");
 const output=$("#nox-camera-output"),imageOutput=$("#nox-captured-image"),videoOutput=$("#nox-recorded-video"),download=$("#nox-camera-download");
 const fileInput=$("#nox-camera-file"),gallery=$("#nox-camera-gallery"),recordingIndicator=$("#nox-recording-indicator");
 let sticker="";
 function setCameraControls(active){if(start)start.hidden=active;if(stop)stop.disabled=!active;if(capture)capture.disabled=!active;if(record)record.disabled=!active;if(flip)flip.disabled=!active;}
 function revokeOutput(){if(outputUrl){URL.revokeObjectURL(outputUrl);outputUrl=null;}if(download){download.removeAttribute("href");download.hidden=true;}if(imageOutput){imageOutput.hidden=true;imageOutput.removeAttribute("src");}if(videoOutput){videoOutput.pause();videoOutput.hidden=true;videoOutput.removeAttribute("src");}}
 function drawOverlay(ctx,w,h){
  if(sticker){ctx.save();ctx.textAlign="center";ctx.font=`bold ${Math.round(w*.13)}px sans-serif`;ctx.shadowColor="rgba(20,5,55,.35)";ctx.shadowBlur=12;ctx.fillText(sticker,w*.5,h*.19);ctx.restore();}
  const caption=captionInput?.value.trim();if(caption){ctx.save();ctx.direction="rtl";ctx.textAlign="center";ctx.font=`bold ${Math.max(22,Math.round(w*.055))}px Cairo, sans-serif`;ctx.lineWidth=Math.max(3,w*.008);ctx.strokeStyle="rgba(28,10,75,.75)";ctx.fillStyle="#fff";ctx.strokeText(caption,w*.5,h*.84);ctx.fillText(caption,w*.5,h*.84);ctx.restore();}
 }
 function syncLiveOverlay(){if(stickerLayer)stickerLayer.textContent=sticker;if(captionLayer)captionLayer.textContent=captionInput?.value.trim()||"";}
 async function stopRecording(){
  if(recordFrame)cancelAnimationFrame(recordFrame);recordFrame=0;
  if(recorder&&recorder.state!=="inactive")recorder.stop();
  if(recordingIndicator)recordingIndicator.hidden=true;
  if(record)record.textContent="●";
 }
 async function stopCamera(){
  await stopRecording();
  if(stream)stream.getTracks().forEach(track=>track.stop());
  stream=null;
  if(video){video.pause();video.srcObject=null;video.hidden=true;video.style.filter="none";}
  if(empty)empty.hidden=false;
  setCameraControls(false);
  notice("الكاميرا متوقفة");
 }
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){notice("الكاميرا تحتاج متصفحًا حديثًا واتصال HTTPS.");return;}
  if(!window.isSecureContext){notice("شغّل الموقع عبر HTTPS للسماح باستخدام الكاميرا.");return;}
  try{
   if(stream){await stopRecording();stream.getTracks().forEach(track=>track.stop());}
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facingMode},width:{ideal:1280},height:{ideal:720}}});
   video.srcObject=stream;video.style.filter=filter;video.hidden=false;stage?.classList.toggle("is-front",facingMode==="user");empty.hidden=true;
   await video.play();setCameraControls(true);notice(facingMode==="user"?"الكاميرا الأمامية جاهزة":"الكاميرا الخلفية جاهزة");
  }catch(error){stream=null;notice(error?.name==="NotAllowedError"?"لم يتم السماح بالكاميرا. راجع إذن المتصفح.":error?.name==="NotFoundError"?"لم يتم العثور على كاميرا متاحة.":"تعذر تشغيل الكاميرا على هذا الجهاز.");}
 }
 start?.addEventListener("click",startCamera);
 stop?.addEventListener("click",stopCamera);
 flip?.addEventListener("click",async()=>{facingMode=facingMode==="user"?"environment":"user";await startCamera();});
 $$(".nox-lens").forEach(button=>button.addEventListener("click",()=>{
  $$(".nox-lens").forEach(item=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-pressed",String(active));});
  filter=button.dataset.filter||"none";if(video)video.style.filter=filter;
  notice("تم تغيير تأثير الكاميرا");
 }));
 $$(".nox-sticker-picker button").forEach(button=>button.addEventListener("click",()=>{
  sticker=button.dataset.sticker||"";$$(".nox-sticker-picker button").forEach(item=>item.classList.toggle("active",item===button));syncLiveOverlay();
 }));
 captionInput?.addEventListener("input",syncLiveOverlay);
 capture?.addEventListener("click",()=>{
  if(!stream||!video.videoWidth){notice("انتظر حتى تعمل معاينة الكاميرا.");return;}
  const width=video.videoWidth,height=video.videoHeight;canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d");context.save();context.filter=filter;if(facingMode==="user"){context.translate(width,0);context.scale(-1,1);}context.drawImage(video,0,0,width,height);context.restore();drawOverlay(context,width,height);
  canvas.toBlob(blob=>{
   if(!blob){notice("تعذر تجهيز الصورة.");return;}
   revokeOutput();outputUrl=URL.createObjectURL(blob);imageOutput.src=outputUrl;imageOutput.hidden=false;
   output.hidden=false;$("#nox-output-label").textContent="الصورة جاهزة — لم يتم رفعها.";download.href=outputUrl;download.download="nox-photo.jpg";download.hidden=false;
   notice("تم التقاط الصورة. يمكنك حفظها على جهازك.");
  },"image/jpeg",.94);
 });
 record?.addEventListener("click",()=>{
  if(!stream)return notice("شغّل الكاميرا أولًا.");
  if(!window.MediaRecorder||!recordCanvas?.captureStream)return notice("تسجيل الفيديو غير مدعوم في هذا المتصفح.");
  if(recorder&&recorder.state==="recording"){stopRecording();return;}
  try{
   recordedChunks=[];recordCanvas.width=video.videoWidth;recordCanvas.height=video.videoHeight;
   const drawRecordFrame=()=>{if(!stream||!video.videoWidth)return;const ctx=recordCanvas.getContext("2d");ctx.save();ctx.filter=filter;if(facingMode==="user"){ctx.translate(recordCanvas.width,0);ctx.scale(-1,1);}ctx.drawImage(video,0,0,recordCanvas.width,recordCanvas.height);ctx.restore();drawOverlay(ctx,recordCanvas.width,recordCanvas.height);recordFrame=requestAnimationFrame(drawRecordFrame);};
   drawRecordFrame();recordStream=recordCanvas.captureStream(30);
   const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(type=>MediaRecorder.isTypeSupported(type));
   recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:undefined);
   recorder.ondataavailable=event=>{if(event.data?.size)recordedChunks.push(event.data);};
   recorder.onstop=()=>{
    if(recordStream)recordStream.getTracks().forEach(track=>track.stop());recordStream=null;
    if(recordingIndicator)recordingIndicator.hidden=true;if(record)record.textContent="●";
    if(!recordedChunks.length){notice("لم يتم إنشاء ملف فيديو.");return;}
    const blob=new Blob(recordedChunks,{type:recorder.mimeType||"video/webm"});revokeOutput();outputUrl=URL.createObjectURL(blob);
    videoOutput.src=outputUrl;videoOutput.hidden=false;output.hidden=false;$("#nox-output-label").textContent="الفيديو جاهز — لم يتم رفعه.";
    download.href=outputUrl;download.download="nox-video.webm";download.hidden=false;notice("انتهى التسجيل. يمكنك مشاهدة الفيديو وحفظه.");
   };
   recorder.start();record.textContent="■";recordingIndicator.hidden=false;notice("بدأ تسجيل الفيديو");
  }catch(error){notice("تعذر بدء تسجيل الفيديو على هذا المتصفح.");}
 });
 gallery?.addEventListener("click",()=>fileInput?.click());
 fileInput?.addEventListener("change",()=>{
  const file=fileInput.files?.[0];if(!file)return;
  revokeOutput();output.hidden=false;outputUrl=URL.createObjectURL(file);
  if(file.type.startsWith("image/")){imageOutput.src=outputUrl;imageOutput.hidden=false;videoOutput.hidden=true;}
  else if(file.type.startsWith("video/")){videoOutput.src=outputUrl;videoOutput.hidden=false;imageOutput.hidden=true;}
  else{revokeOutput();notice("نوع الملف غير مدعوم.");return;}
  $("#nox-output-label").textContent="ملف من جهازك — لم يتم رفعه.";
  download.href=outputUrl;download.download=file.name||"nox-media";download.hidden=false;notice("تم فتح الملف للمعاينة المحلية.");
 });
 window.addEventListener("nox:screenchange",event=>{if(event.detail?.from==="camera"&&event.detail?.to!=="camera")stopCamera();});
 window.addEventListener("pagehide",()=>{if(stream)stream.getTracks().forEach(track=>track.stop());if(outputUrl)URL.revokeObjectURL(outputUrl);});

 $$(".story-preview-card").forEach(button=>button.addEventListener("click",()=>{const result=$("#nox-story-result");result.replaceChildren();const title=document.createElement("b"),note=document.createElement("small");title.textContent=button.dataset.storyPreview;note.textContent="معاينة شكلية فقط — الحالات الحقيقية ستُحمّل من قاعدة البيانات";result.append(title,note);}));
 $$("[data-reel-like]").forEach(button=>button.addEventListener("click",()=>{const liked=button.classList.toggle("liked");button.textContent=liked?"♥ أعجبني":"♡ إعجاب";button.setAttribute("aria-pressed",String(liked));}));
}
