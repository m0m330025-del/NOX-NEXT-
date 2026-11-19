export function initSocialUI() {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const toast=$("#toast");let timer,stream=null,filter="none",facingMode="user",recorder=null,recordedChunks=[],outputUrl=null,recordStream=null,recordFrame=0;
 function notice(message){const status=$("#nox-camera-status");if(status)status.textContent=message;if(!toast)return;toast.textContent=message;toast.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove("show"),2600);}
 $(".add-story")?.addEventListener("click",()=>{window.location.hash="#camera";});
 $("#nox-id-submit")?.addEventListener("click",()=>{const id=$("#nox-id-search")?.value.trim();notice(id?"واجهة البحث جاهزة؛ ربط البحث وإرسال طلب الصداقة بقاعدة البيانات في المرحلة التالية.":"اكتب NOX ID للبحث.");});
 $("#nox-id-search")?.addEventListener("keydown",e=>{if(e.key==="Enter")$("#nox-id-submit")?.click();});

 const video=$("#nox-camera-video"),empty=$("#nox-camera-empty"),start=$("#nox-camera-start"),stop=$("#nox-camera-stop"),capture=$("#nox-camera-capture"),record=$("#nox-camera-record"),flip=$("#nox-camera-flip"),canvas=$("#nox-camera-canvas"),recordCanvas=$("#nox-record-canvas");
 const stage=$("#nox-camera-stage"),stickerLayer=$("#nox-live-sticker"),captionLayer=$("#nox-live-caption"),captionInput=$("#nox-camera-caption-input"),faceCanvas=$("#nox-face-overlay");
 $("#nox-camera-back")?.addEventListener("click",()=>{window.location.hash="#home";});
 let faceLandmarker=null,faceModelPromise=null,faceAnimationFrame=0,lastFaceDetection=0,faceLandmarks=null,arLens="none";
 const output=$("#nox-camera-output"),imageOutput=$("#nox-captured-image"),videoOutput=$("#nox-recorded-video"),download=$("#nox-camera-download");
 const fileInput=$("#nox-camera-file"),gallery=$("#nox-camera-gallery"),recordingIndicator=$("#nox-recording-indicator");
 let sticker="";
 function setCameraControls(active){if(start)start.hidden=active;if(stop)stop.disabled=!active;if(capture)capture.disabled=!active;if(record)record.disabled=!active;if(flip)flip.disabled=!active;}
 function revokeOutput(){if(outputUrl){URL.revokeObjectURL(outputUrl);outputUrl=null;}if(download){download.removeAttribute("href");download.hidden=true;}if(imageOutput){imageOutput.hidden=true;imageOutput.removeAttribute("src");}if(videoOutput){videoOutput.pause();videoOutput.hidden=true;videoOutput.removeAttribute("src");}}
 async function loadFaceTracker(){
  if(faceLandmarker)return faceLandmarker;
  if(!faceModelPromise)faceModelPromise=(async()=>{
   const vision=await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14");
   const fileset=await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
   const options={baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",delegate:"GPU"},runningMode:"VIDEO",numFaces:1};
   try{return await vision.FaceLandmarker.createFromOptions(fileset,options);}
   catch(gpuError){options.baseOptions.delegate="CPU";return await vision.FaceLandmarker.createFromOptions(fileset,options);}
  })();
  faceLandmarker=await faceModelPromise;return faceLandmarker;
 }
 function drawFaceEffect(ctx,w,h,landmarks,kind){
  if(!landmarks||kind==="none")return;
  const p=i=>({x:landmarks[i].x*w,y:landmarks[i].y*h});
  const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const eyeL=p(33),eyeR=p(263),eyeMid=mid(eyeL,eyeR),nose=p(1),forehead=p(10),cheekL=p(50),cheekR=p(280);
  const eyeDistance=Math.hypot(eyeR.x-eyeL.x,eyeR.y-eyeL.y),unit=Math.max(eyeDistance,24);
  ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
  if(kind==="glasses"){
   const lensW=unit*.47,lensH=unit*.29;
   ctx.strokeStyle="#f8d66b";ctx.fillStyle="rgba(32,12,77,.22)";ctx.lineWidth=Math.max(3,unit*.035);
   [eyeL,eyeR].forEach(e=>{ctx.beginPath();ctx.ellipse(e.x,e.y,lensW/2,lensH/2,0,0,Math.PI*2);ctx.fill();ctx.stroke();});
   ctx.beginPath();ctx.moveTo(eyeL.x+lensW/2,eyeL.y);ctx.lineTo(eyeR.x-lensW/2,eyeR.y);ctx.stroke();
   ctx.beginPath();ctx.moveTo(eyeL.x-lensW/2,eyeL.y);ctx.lineTo(eyeL.x-unit*.22,eyeL.y-unit*.04);ctx.moveTo(eyeR.x+lensW/2,eyeR.y);ctx.lineTo(eyeR.x+unit*.22,eyeR.y-unit*.04);ctx.stroke();
  }else if(kind==="crown"){
   const y=Math.min(forehead.y,eyeMid.y-unit*.62),x=eyeMid.x,half=unit*.58,base=y+unit*.22;
   ctx.fillStyle="#ffd45f";ctx.strokeStyle="#fff1b6";ctx.lineWidth=Math.max(2,unit*.025);
   ctx.beginPath();ctx.moveTo(x-half,base);ctx.lineTo(x-half*.82,y+unit*.03);ctx.lineTo(x-half*.28,base-unit*.08);ctx.lineTo(x,y-unit*.22);ctx.lineTo(x+half*.28,base-unit*.08);ctx.lineTo(x+half*.82,y+unit*.03);ctx.lineTo(x+half,base);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle="#8d35e8";[[-.55,.06],[0,-.16],[.55,.06]].forEach(([dx,dy])=>{ctx.beginPath();ctx.arc(x+unit*dx,y+unit*dy,unit*.045,0,Math.PI*2);ctx.fill();});
  }else if(kind==="cat"||kind==="bunny"){
   const size=kind==="bunny"?.48:.34,topY=Math.min(forehead.y,eyeMid.y-unit*.55);
   ctx.fillStyle=kind==="bunny"?"rgba(255,220,240,.92)":"rgba(190,145,255,.94)";ctx.strokeStyle="#fff";ctx.lineWidth=Math.max(2,unit*.025);
   [-1,1].forEach(side=>{const x=eyeMid.x+side*unit*.43,y=topY+unit*.08;ctx.beginPath();if(kind==="bunny"){ctx.ellipse(x+side*unit*.08,y-unit*.28,unit*.14,unit*size,side*-.18,0,Math.PI*2);}else{ctx.moveTo(x-unit*.2,y+unit*.12);ctx.lineTo(x-side*unit*.02,y-unit*.38);ctx.lineTo(x+side*unit*.25,y+unit*.12);ctx.closePath();}ctx.fill();ctx.stroke();});
  }else if(kind==="halo"||kind==="hearts"||kind==="butterfly"){
   ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`bold ${Math.round(unit*(kind==="halo"?1.05:.62))}px sans-serif`;
   if(kind==="halo"){ctx.shadowColor="#ffe58a";ctx.shadowBlur=unit*.22;ctx.fillText("✧",forehead.x,forehead.y-unit*.48);}
   if(kind==="hearts"){ctx.fillText("💜",cheekL.x-unit*.12,cheekL.y-unit*.18);ctx.fillText("💗",cheekR.x+unit*.12,cheekR.y-unit*.18);}
   if(kind==="butterfly"){ctx.fillText("🦋",forehead.x,forehead.y-unit*.55);}
  }else if(kind==="sparkle"){
   ctx.fillStyle="#ffe58a";ctx.shadowColor="#ffdf74";ctx.shadowBlur=unit*.12;
   [cheekL,cheekR,{x:forehead.x,y:forehead.y-unit*.25}].forEach((q,n)=>{const r=unit*(n===2?.075:.06);ctx.beginPath();ctx.moveTo(q.x,q.y-r*2.2);ctx.quadraticCurveTo(q.x+r*.3,q.y-r*.3,q.x+r*2,q.y);ctx.quadraticCurveTo(q.x+r*.3,q.y+r*.3,q.x,q.y+r*2.2);ctx.quadraticCurveTo(q.x-r*.3,q.y+r*.3,q.x-r*2,q.y);ctx.quadraticCurveTo(q.x-r*.3,q.y-r*.3,q.x,q.y-r*2.2);ctx.fill();});
  }else if(kind==="beauty"){
   ctx.fillStyle="rgba(255,105,155,.22)";
   [cheekL,cheekR].forEach(q=>{ctx.beginPath();ctx.ellipse(q.x,q.y,unit*.18,unit*.105,0,0,Math.PI*2);ctx.fill();});
   ctx.strokeStyle="rgba(255,205,225,.72)";ctx.lineWidth=Math.max(2,unit*.018);ctx.beginPath();ctx.moveTo(eyeL.x-unit*.12,eyeL.y-unit*.05);ctx.quadraticCurveTo(eyeL.x,eyeL.y-unit*.13,eyeL.x+unit*.12,eyeL.y-unit*.05);ctx.moveTo(eyeR.x-unit*.12,eyeR.y-unit*.05);ctx.quadraticCurveTo(eyeR.x,eyeR.y-unit*.13,eyeR.x+unit*.12,eyeR.y-unit*.05);ctx.stroke();
  }
  ctx.restore();
 }
 function paintFaceCanvas(){
  if(!faceCanvas||!video?.videoWidth)return;
  const w=video.videoWidth,h=video.videoHeight;if(faceCanvas.width!==w||faceCanvas.height!==h){faceCanvas.width=w;faceCanvas.height=h;}
  const ctx=faceCanvas.getContext("2d");ctx.clearRect(0,0,w,h);
  if(faceLandmarks&&arLens!=="none")drawFaceEffect(ctx,w,h,faceLandmarks,arLens);
 }
 async function enableFaceLens(kind){
  arLens=kind;
  $(".nox-ar-lens").forEach(button=>{const active=button.dataset.arLens===kind;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});
  if(kind==="none"){faceLandmarks=null;paintFaceCanvas();notice("تم إيقاف عدسة الوجه");return;}
  if(!stream){notice("شغّل الكاميرا أولًا لاستخدام عدسات الوجه.");return;}
  notice("جارٍ تجهيز تتبّع الوجه لأول مرة…");
  try{await loadFaceTracker();if(!faceAnimationFrame)trackFaceFrame();notice("عدسة الوجه جاهزة — قرّب وجهك من الكاميرا.");}
  catch(error){arLens="none";paintFaceCanvas();notice("تعذر تحميل محرك تتبّع الوجه. تحقق من اتصال الإنترنت ثم أعد المحاولة.");}
 }
 function trackFaceFrame(){
  if(!stream||!video)return;
  if(video.readyState<2){faceAnimationFrame=requestAnimationFrame(trackFaceFrame);return;}
  const now=performance.now();
  if(faceLandmarker&&now-lastFaceDetection>33){
   lastFaceDetection=now;
   try{const result=faceLandmarker.detectForVideo(video,now);faceLandmarks=result.faceLandmarks?.[0]||null;paintFaceCanvas();}
   catch(error){faceLandmarks=null;paintFaceCanvas();}
  }
  faceAnimationFrame=requestAnimationFrame(trackFaceFrame);
 }
 function drawActiveFaceEffect(ctx,w,h){
  if(faceLandmarks&&arLens!=="none")drawFaceEffect(ctx,w,h,faceLandmarks,arLens);
 }
 function drawOverlay(ctx,w,h){
  if(sticker){ctx.save();ctx.textAlign="center";ctx.font=`bold ${Math.round(w*.13)}px sans-serif`;ctx.shadowColor="rgba(20,5,55,.35)";ctx.shadowBlur=12;ctx.fillText(sticker,w*.5,h*.19);ctx.restore();}
  const caption=captionInput?.value.trim();if(caption){ctx.save();ctx.direction="rtl";ctx.textAlign="center";ctx.font=`bold ${Math.max(22,Math.round(w*.055))}px Cairo, sans-serif`;ctx.lineWidth=Math.max(3,w*.008);ctx.strokeStyle="rgba(28,10,75,.75)";ctx.fillStyle="#fff";ctx.strokeText(caption,w*.5,h*.84);ctx.fillText(caption,w*.5,h*.84);ctx.restore();}
  const scale=Math.max(1,w/720),pad=18*scale,label="NOX NEXT";ctx.save();ctx.direction="ltr";ctx.font=`900 ${18*scale}px Arial`;const tw=ctx.measureText(label).width,bw=tw+56*scale,bh=38*scale,x=w-pad-bw,y=h-pad-bh;ctx.fillStyle="rgba(16,9,39,.62)";ctx.beginPath();ctx.roundRect(x,y,bw,bh,11*scale);ctx.fill();ctx.fillStyle="#f5d77e";ctx.beginPath();ctx.arc(x+18*scale,y+19*scale,12*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle="#24145d";ctx.font=`900 ${14*scale}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("N",x+18*scale,y+19*scale);ctx.fillStyle="#ffe7a5";ctx.font=`900 ${18*scale}px Arial`;ctx.textAlign="left";ctx.fillText(label,x+36*scale,y+20*scale);ctx.restore();
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
  if(faceAnimationFrame)cancelAnimationFrame(faceAnimationFrame);
  faceAnimationFrame=0;faceLandmarks=null;
  if(stream)stream.getTracks().forEach(track=>track.stop());
  stream=null;
  if(video){video.pause();video.srcObject=null;video.hidden=true;video.style.filter="none";}
  if(faceCanvas){const ctx=faceCanvas.getContext("2d");ctx?.clearRect(0,0,faceCanvas.width,faceCanvas.height);}
  if(empty)empty.hidden=false;
  setCameraControls(false);
  notice("الكاميرا متوقفة");
 }
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){notice("الكاميرا تحتاج متصفحًا حديثًا واتصال HTTPS.");return;}
  if(!window.isSecureContext){notice("شغّل الموقع عبر HTTPS للسماح باستخدام الكاميرا.");return;}
  try{
   if(stream){await stopRecording();stream.getTracks().forEach(track=>track.stop());stream=null;}
   if(video){video.pause();video.srcObject=null;}
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facingMode},width:{ideal:1280},height:{ideal:720}}});
   video.srcObject=stream;video.style.filter=filter;video.hidden=false;stage?.classList.toggle("is-front",facingMode==="user");if(faceCanvas)faceCanvas.style.display=arLens==="none"?"none":"block";empty.hidden=true;
   await video.play();setCameraControls(true);notice(facingMode==="user"?"الكاميرا الأمامية جاهزة":"الكاميرا الخلفية جاهزة");if(arLens!=="none"){if(faceCanvas)faceCanvas.style.display="block";loadFaceTracker().then(()=>{if(stream&&!faceAnimationFrame)trackFaceFrame();}).catch(()=>notice("تعذر تحميل عدسة الوجه. تحقق من اتصال الإنترنت."));}
  }catch(error){if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;if(video){video.pause();video.srcObject=null;video.hidden=true;}if(empty)empty.hidden=false;setCameraControls(false);notice(error?.name==="NotAllowedError"?"لم يتم السماح بالكاميرا. راجع إذن المتصفح.":error?.name==="NotFoundError"?"لم يتم العثور على كاميرا متاحة.":"تعذر تشغيل الكاميرا. تأكد من إذن المتصفح وأن الموقع يعمل عبر HTTPS.");}
 }
 start?.addEventListener("click",startCamera);
 stop?.addEventListener("click",stopCamera);
 flip?.addEventListener("click",async()=>{facingMode=facingMode==="user"?"environment":"user";await startCamera();});
 $(".nox-lens").forEach(button=>button.addEventListener("click",()=>{
  $(".nox-lens").forEach(item=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-pressed",String(active));});
  filter=button.dataset.filter||"none";if(video)video.style.filter=filter;
  notice("تم تغيير تأثير الكاميرا");
 }));
 let lensHoldTimer=null,lensHoldStarted=false,lensPointer=null;
 $(".nox-lens").forEach(button=>{
  button.addEventListener("pointerdown",event=>{
   if(!stream)return;
   lensPointer=event.pointerId;lensHoldStarted=false;
   filter=button.dataset.filter||"none";if(video)video.style.filter=filter;
   $(".nox-lens").forEach(item=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-pressed",String(active));});
   lensHoldTimer=setTimeout(()=>{lensHoldStarted=true;if(record?.disabled)return notice("تعذر بدء تسجيل الفيديو.");record?.click();notice("بدأ تسجيل الفيديو — ارفع إصبعك للإيقاف.");},380);
  });
  const finishLensPress=event=>{
   if(lensPointer!==event.pointerId)return;
   clearTimeout(lensHoldTimer);lensHoldTimer=null;lensPointer=null;
   if(lensHoldStarted){if(recorder?.state==="recording")record?.click();}
   else if(stream)capture?.click();
  };
  button.addEventListener("pointerup",finishLensPress);
  button.addEventListener("pointercancel",finishLensPress);
  button.addEventListener("contextmenu",event=>event.preventDefault());
 });
 $(".nox-ar-lens").forEach(button=>button.addEventListener("click",()=>enableFaceLens(button.dataset.arLens||"none")));
 $$(".nox-sticker-picker button").forEach(button=>button.addEventListener("click",()=>{
  sticker=button.dataset.sticker||"";$$(".nox-sticker-picker button").forEach(item=>item.classList.toggle("active",item===button));syncLiveOverlay();
 }));
 captionInput?.addEventListener("input",syncLiveOverlay);
 capture?.addEventListener("click",()=>{
  if(!stream||!video.videoWidth){notice("انتظر حتى تعمل معاينة الكاميرا.");return;}
  const width=video.videoWidth,height=video.videoHeight;canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d");context.save();if(facingMode==="user"){context.translate(width,0);context.scale(-1,1);}context.filter=filter;context.drawImage(video,0,0,width,height);context.filter="none";drawActiveFaceEffect(context,width,height);context.restore();drawOverlay(context,width,height);
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
   const drawRecordFrame=()=>{if(!stream||!video.videoWidth)return;const ctx=recordCanvas.getContext("2d");ctx.save();if(facingMode==="user"){ctx.translate(recordCanvas.width,0);ctx.scale(-1,1);}ctx.filter=filter;ctx.drawImage(video,0,0,recordCanvas.width,recordCanvas.height);ctx.filter="none";drawActiveFaceEffect(ctx,recordCanvas.width,recordCanvas.height);ctx.restore();drawOverlay(ctx,recordCanvas.width,recordCanvas.height);recordFrame=requestAnimationFrame(drawRecordFrame);};
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
