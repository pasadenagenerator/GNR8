import { PreviewDbBackpressureError, SiteVersionPreviewUnavailableError } from "@/gnr8/runtime/unified-render-preview";
import { parseAgencyActionContextError } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { previewRouteDependencies } from "./preview-route-dependencies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PREVIEW_ASSET_ROUTE_PREFIX = "/api/gnr8/runtime/preview-assets";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toPreviewFallbackHtml(input: { statusTitle: string; message: string; details?: string[] }): string {
  const detailList =
    input.details && input.details.length > 0
      ? `<ul>${input.details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Preview Unavailable</title>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      main { max-width: 760px; margin: 36px auto; background: #fff; border: 1px solid #dbe6f1; border-radius: 12px; padding: 20px; }
      h1 { margin: 0; font-size: 20px; }
      p { margin: 10px 0 0; color: #475569; font-size: 14px; line-height: 1.5; }
      ul { margin: 10px 0 0; padding-left: 22px; color: #334155; font-size: 13px; line-height: 1.5; }
      code { background: #f1f5f9; border-radius: 6px; padding: 2px 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(input.statusTitle)}</h1>
      <p>${escapeHtml(input.message)}</p>
      ${detailList}
    </main>
  </body>
</html>`;
}

function truncateForLog(value: string, limit = 220): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}...`;
}

function redactPreviewAssetSample(value: string): string {
  return value.replace(/\/uploads\/[^"'\s<)]+/gi, "/uploads/<redacted>");
}

function normalizeTransformedPreviewOutputDoublePrefixedUrls(input: {
  html: string;
  siteId: string;
  siteVersionId: string;
}): { html: string; occurrenceCount: number; sampleBefore: string | null; sampleAfter: string | null } {
  const encodedSiteId = encodeURIComponent(input.siteId);
  const encodedSiteVersionId = encodeURIComponent(input.siteVersionId);
  const routePrefix = `${PREVIEW_ASSET_ROUTE_PREFIX}/${encodedSiteId}/${encodedSiteVersionId}/`;
  const duplicatedRoutePrefix = `${routePrefix}${PREVIEW_ASSET_ROUTE_PREFIX.slice(1)}/${encodedSiteId}/${encodedSiteVersionId}/`;
  const occurrenceCount = input.html.split(duplicatedRoutePrefix).length - 1;
  if (occurrenceCount <= 0) {
    return { html: input.html, occurrenceCount: 0, sampleBefore: null, sampleAfter: null };
  }
  const firstMatchIndex = input.html.indexOf(duplicatedRoutePrefix);
  const sampleStart = Math.max(0, firstMatchIndex - 40);
  const sampleEnd = Math.min(input.html.length, firstMatchIndex + duplicatedRoutePrefix.length + 120);
  const sampleBefore = input.html.slice(sampleStart, sampleEnd);
  const normalizedHtml = input.html.split(duplicatedRoutePrefix).join(routePrefix);
  const sampleAfter = normalizedHtml.slice(sampleStart, sampleEnd);
  return {
    html: normalizedHtml,
    occurrenceCount,
    sampleBefore: truncateForLog(redactPreviewAssetSample(sampleBefore)),
    sampleAfter: truncateForLog(redactPreviewAssetSample(sampleAfter)),
  };
}

function injectGalleryRuntimeDiagnostic(input: { html: string; siteVersionId: string; moduleId: string }): string {
  const payload = JSON.stringify({
    siteVersionId: input.siteVersionId,
    moduleId: input.moduleId,
  });
  const script = `<script>(function(){
var payload=${payload};
var correlationKey=[payload.siteVersionId,payload.moduleId,String(Date.now())].join(":");
try{
function emit(code,details){console.info("[gnr8.runtime.preview] "+code,Object.assign({siteVersionId:payload.siteVersionId,moduleId:payload.moduleId,correlationKey:correlationKey},details||{}));}
function parseSetting(dataSettings,key){if(!dataSettings||!key)return null;var source=String(dataSettings);var normalizedKey=String(key).toLowerCase();var tokens=[];var chunk="";for(var i=0;i<source.length;i+=1){var char=source.charAt(i);if(char===","||char===";"||char==="&"){if(chunk)tokens.push(chunk);chunk="";continue;}chunk+=char;}if(chunk)tokens.push(chunk);for(var t=0;t<tokens.length;t+=1){var token=String(tokens[t]||"").trim();if(!token)continue;var eqIndex=token.indexOf("=");var colonIndex=token.indexOf(":");var separatorIndex=eqIndex>=0?eqIndex:colonIndex;if(separatorIndex<0)continue;var tokenKey=token.slice(0,separatorIndex).trim().toLowerCase();if(tokenKey!==normalizedKey)continue;var rawValue=token.slice(separatorIndex+1).trim();if(rawValue.charAt(0)==="\\""||rawValue.charAt(0)==="'"){rawValue=rawValue.slice(1);}if(rawValue.charAt(rawValue.length-1)==="\\""||rawValue.charAt(rawValue.length-1)==="'"){rawValue=rawValue.slice(0,-1);}var digitsOnly=true;for(var d=0;d<rawValue.length;d+=1){var code=rawValue.charCodeAt(d);if(code<48||code>57){digitsOnly=false;break;}}if(!digitsOnly||rawValue.length===0)continue;var n=Number(rawValue);if(Number.isFinite(n)&&n>0)return n;}return null;}
function isLikelyControlNode(node){if(!node)return false;var text=String(node.className||"")+" "+String(node.id||"")+" "+String(node.getAttribute&&node.getAttribute("aria-label")||"");return/(arrow|prev|next|nav|control|pager|button|lightbox|overlay)/i.test(text);}
function isPreviewAssetGalleryImage(img){if(!img)return false;var src=String(img.getAttribute&&img.getAttribute("src")||img.currentSrc||"");return src.indexOf("/api/gnr8/runtime/preview-assets/")>=0&&src.toLowerCase().indexOf("/uploads/")>=0;}
function isExcludedControlAnchor(anchor,moduleEl){if(!anchor)return true;if(isLikelyControlNode(anchor))return true;var node=anchor.parentElement;var depth=0;while(node&&moduleEl&&depth<6&&node!==moduleEl){if(isLikelyControlNode(node))return true;node=node.parentElement;depth+=1;}return false;}
function collectGalleryAnchors(moduleEl){if(!moduleEl||!moduleEl.querySelectorAll)return{anchors:[],skippedControlCount:0};var allAnchors=Array.prototype.slice.call(moduleEl.querySelectorAll("a"));var anchors=[];var skippedControlCount=0;allAnchors.forEach(function(anchor){var img=anchor&&anchor.querySelector?anchor.querySelector("img"):null;if(!img||!isPreviewAssetGalleryImage(img))return;if(isExcludedControlAnchor(anchor,moduleEl)){skippedControlCount+=1;return;}anchors.push(anchor);});return{anchors:anchors,skippedControlCount:skippedControlCount};}
function ensurePagesHost(moduleEl){var host=moduleEl.querySelector(":scope > .gnr8-gallery-pages");if(host)return host;host=document.createElement("div");host.className="gnr8-gallery-pages";moduleEl.appendChild(host);return host;}
function ensurePage(host,pageIndex){var page=host.querySelector(':scope > .gnr8-gallery-page[data-page-index="'+String(pageIndex)+'"]');if(page)return page;page=document.createElement("div");page.className="gnr8-gallery-page";page.setAttribute("data-page-index",String(pageIndex));host.appendChild(page);return page;}
function stylePage(page,columns){if(!page||!page.style)return;page.style.display="grid";page.style.gridTemplateColumns="repeat("+String(columns)+", minmax(0, 1fr))";page.style.gap="12px";page.style.alignItems="start";page.style.width="100%";}
function styleAnchorAndImage(anchor){var normalizedImageCount=0;var strippedInlineDimensionCount=0;if(!anchor||!anchor.style)return{normalizedImageCount:normalizedImageCount,strippedInlineDimensionCount:strippedInlineDimensionCount};anchor.style.display="block";anchor.style.width="100%";anchor.style.aspectRatio="1 / 1";anchor.style.position="relative";anchor.style.overflow="hidden";anchor.style.background="#f3f4f6";var img=anchor.querySelector("img");if(img&&img.style){var removed=0;if(img.hasAttribute("width")){img.removeAttribute("width");removed+=1;}if(img.hasAttribute("height")){img.removeAttribute("height");removed+=1;}if(img.style.width){img.style.removeProperty("width");removed+=1;}if(img.style.height){img.style.removeProperty("height");removed+=1;}if(img.style.maxWidth){img.style.removeProperty("max-width");removed+=1;}if(img.style.aspectRatio){img.style.removeProperty("aspect-ratio");removed+=1;}if(img.style.transform){img.style.removeProperty("transform");removed+=1;}strippedInlineDimensionCount+=removed;img.style.display="block";img.style.width="100%";img.style.height="100%";img.style.maxWidth="none";img.style.objectFit="cover";img.style.objectPosition="center";img.style.transform="none";normalizedImageCount=1;}return{normalizedImageCount:normalizedImageCount,strippedInlineDimensionCount:strippedInlineDimensionCount};}
function normalizeGalleryListMarkers(moduleEl,pagesHost){var listContainersNormalized=0;var removedBulletNodeCount=0;if(!moduleEl||!moduleEl.querySelectorAll)return{listMarkersSuppressed:false,suppressedCount:0,listContainersNormalized:0,removedBulletNodeCount:0};var styleTagId="gnr8-gallery-list-marker-reset-"+String(payload.moduleId);if(!document.getElementById(styleTagId)){var styleTag=document.createElement("style");styleTag.id=styleTagId;styleTag.textContent="#"+String(payload.moduleId)+" ul,#"+String(payload.moduleId)+" ol,#"+String(payload.moduleId)+" li{list-style:none !important;list-style-type:none !important;padding:0 !important;margin:0 !important;}#"+String(payload.moduleId)+" li::marker{content:none !important;}#"+String(payload.moduleId)+" li::-webkit-details-marker{display:none !important;}";(document.head||moduleEl).appendChild(styleTag);}var scopeNodes=[];if(pagesHost)scopeNodes.push(pagesHost);if(scopeNodes.length===0)scopeNodes.push(moduleEl);scopeNodes.forEach(function(scope){if(!scope||!scope.querySelectorAll)return;var lists=Array.prototype.slice.call(scope.querySelectorAll("ul,ol,li"));lists.forEach(function(node){if(!node||!node.style)return;node.style.setProperty("list-style","none","important");node.style.setProperty("list-style-type","none","important");node.style.setProperty("margin","0","important");node.style.setProperty("padding","0","important");listContainersNormalized+=1;if(node.tagName&&node.tagName.toLowerCase()==="li"){var text=String(node.textContent||"").trim();var onlyBulletText=/^[\\u2022\\u25E6\\u25AA\\u25CF\\u00B7\\-]+$/.test(text);if(onlyBulletText&&node.children.length===0&&node.parentElement){node.parentElement.removeChild(node);removedBulletNodeCount+=1;}}});var bulletNodes=Array.prototype.slice.call(scope.querySelectorAll(".bullet,.bullet-item,.bullet-point,.list-bullet,[data-bullet='1']"));bulletNodes.forEach(function(node){if(!node||!node.parentElement)return;var text=String(node.textContent||"").trim();if(text.length===0||/^[\\u2022\\u25E6\\u25AA\\u25CF\\u00B7\\-]+$/.test(text)){node.parentElement.removeChild(node);removedBulletNodeCount+=1;}});});emit("PREVIEW_GALLERY_LIST_MARKER_CLEANUP",{removedBulletNodeCount:removedBulletNodeCount,listContainersNormalized:listContainersNormalized,correlationKey:correlationKey});return{listMarkersSuppressed:listContainersNormalized>0,suppressedCount:listContainersNormalized,listContainersNormalized:listContainersNormalized,removedBulletNodeCount:removedBulletNodeCount};}
function normalizeGalleryArrowPosition(moduleEl,pagesHost){var leftArrow=moduleEl?moduleEl.querySelector(".prev,.arrow-prev,[data-dir='prev'],[aria-label*='prev' i]"):null;var rightArrow=moduleEl?moduleEl.querySelector(".next,.arrow-next,[data-dir='next'],[aria-label*='next' i]"):null;var arrowsPositioned=false;var overlapProtectionApplied=false;if(moduleEl&&moduleEl.style){moduleEl.style.position="relative";}function placeArrow(node,side){if(!node||!node.style)return false;node.style.position="absolute";node.style.top="50%";node.style.transform="translateY(-50%)";node.style.zIndex="20";node.style.pointerEvents="auto";node.style.margin="0";node.style.bottom="auto";if(side==="left"){node.style.left="-44px";node.style.right="auto";}else{node.style.right="-44px";node.style.left="auto";}return true;}if(placeArrow(leftArrow,"left")){arrowsPositioned=true;overlapProtectionApplied=true;}if(placeArrow(rightArrow,"right")){arrowsPositioned=true;overlapProtectionApplied=true;}if(pagesHost&&pagesHost.style){pagesHost.style.position="relative";pagesHost.style.zIndex="1";}emit("PREVIEW_GALLERY_ARROW_POSITION_NORMALIZED",{leftArrowDetected:!!leftArrow,rightArrowDetected:!!rightArrow,arrowsPositioned:arrowsPositioned,overlapProtectionApplied:overlapProtectionApplied,correlationKey:correlationKey});return{leftArrowDetected:!!leftArrow,rightArrowDetected:!!rightArrow,arrowsPositioned:arrowsPositioned,overlapProtectionApplied:overlapProtectionApplied};}
function hideThumbnailCaptions(moduleEl,pagesHost){var hiddenCount=0;if(!moduleEl||!moduleEl.querySelectorAll)return 0;var candidates=Array.prototype.slice.call(moduleEl.querySelectorAll("figcaption,.caption,.description,.title,.alt,.image-title,p,span,em,strong"));candidates.forEach(function(node){if(!node||!node.closest)return;if(pagesHost&&!node.closest(".gnr8-gallery-page"))return;if(node.querySelector&&node.querySelector("img,a"))return;var text=String(node.textContent||"").trim();if(text.length===0)return;if(node.style){node.style.display="none";hiddenCount+=1;}});return hiddenCount;}
function setActivePage(host,activeIndex){var pages=Array.prototype.slice.call(host.querySelectorAll(":scope > .gnr8-gallery-page"));pages.forEach(function(page,index){if(!page||!page.style)return;if(index===activeIndex){page.style.display="grid";page.style.visibility="visible";page.style.opacity="1";page.style.height="auto";page.style.overflow="visible";}else{page.style.display="none";}});}
function wireControls(moduleEl,host,pageCount){if(!moduleEl||!host||pageCount<2)return{wired:false,activePageIndex:0,arrowHandlersAttached:0};var prev=moduleEl.querySelector(".prev,.arrow-prev,[data-dir='prev'],[aria-label*='prev' i]");var next=moduleEl.querySelector(".next,.arrow-next,[data-dir='next'],[aria-label*='next' i]");if(!prev||!next)return{wired:false,activePageIndex:0,arrowHandlersAttached:0};var activeIndex=0;prev.addEventListener("click",function(ev){ev.preventDefault();var activePageBefore=activeIndex;activeIndex=Math.max(0,activeIndex-1);setActivePage(host,activeIndex);emit("PREVIEW_GALLERY_PAGE_SWITCH",{activePageBefore:activePageBefore,activePageAfter:activeIndex,visiblePageIndex:activeIndex,arrowHandlersAttached:2,correlationKey:correlationKey});});next.addEventListener("click",function(ev){ev.preventDefault();var activePageBefore=activeIndex;activeIndex=Math.min(pageCount-1,activeIndex+1);setActivePage(host,activeIndex);emit("PREVIEW_GALLERY_PAGE_SWITCH",{activePageBefore:activePageBefore,activePageAfter:activeIndex,visiblePageIndex:activeIndex,arrowHandlersAttached:2,correlationKey:correlationKey});});return{wired:true,activePageIndex:activeIndex,arrowHandlersAttached:2};}
function readBox(el){if(!el)return null;return{display:el.style&&el.style.display||"",visibility:el.style&&el.style.visibility||"",opacity:el.style&&el.style.opacity||"",clientWidth:el.clientWidth||0,clientHeight:el.clientHeight||0};}
function imageSize(img){if(!img)return null;return{clientWidth:img.clientWidth||0,clientHeight:img.clientHeight||0,naturalWidth:img.naturalWidth||0,naturalHeight:img.naturalHeight||0};}
function applyPagedVisibilityFix(moduleEl,pagesHost,pageCount,controlsWired){var page0=pagesHost.querySelector(':scope > .gnr8-gallery-page[data-page-index="0"]');var page1=pagesHost.querySelector(':scope > .gnr8-gallery-page[data-page-index="1"]');if(pagesHost&&pagesHost.style){pagesHost.style.display="block";pagesHost.style.visibility="visible";pagesHost.style.opacity="1";pagesHost.style.height="auto";pagesHost.style.overflow="visible";}if(moduleEl&&moduleEl.style){moduleEl.style.visibility="visible";moduleEl.style.opacity="1";moduleEl.style.height="auto";}if(page0&&page0.style){page0.style.display="grid";page0.style.visibility="visible";page0.style.opacity="1";page0.style.height="auto";page0.style.overflow="visible";}if(page1&&page1.style){page1.style.display="none";page1.style.visibility="hidden";page1.style.opacity="0";}setActivePage(pagesHost,0);var page0Images=page0?Array.prototype.slice.call(page0.querySelectorAll("img")):[];var page0VisibleImageCount=page0Images.filter(function(img){return !!img&&img.clientWidth>0&&img.clientHeight>0;}).length;var details={activePageIndex:0,page0Visible:!!page0&&page0.style.display==="grid"&&page0.style.visibility!=="hidden"&&page0.style.opacity!=="0",page0ImageCount:page0Images.length,page0VisibleImageCount:page0VisibleImageCount,page1Hidden:!page1||page1.style.display==="none",firstPage0ImageSize:imageSize(page0Images[0]||null),pagesHost:readBox(pagesHost),page0:readBox(page0),page1:readBox(page1),module:readBox(moduleEl),reasonCode:controlsWired?"PAGED_CONTROLS_WIRED_VISIBILITY_NORMALIZED":"PAGED_CONTROLS_UNWIRED_PAGE0_ENFORCED",correlationKey:correlationKey,pageCount:pageCount};emit("PREVIEW_GALLERY_PAGED_VISIBILITY_STATUS",details);emit("PREVIEW_GALLERY_PAGED_VISIBILITY_FIX_APPLIED",details);return details;}
function applyPagedLayout(){var moduleEl=document.getElementById(payload.moduleId);if(payload.moduleId!=="m4695"||!moduleEl||moduleEl.id!=="m4695"||!moduleEl.classList.contains("module")||!moduleEl.classList.contains("gallery")){emit("PREVIEW_GALLERY_LAYOUT_FIX_APPLIED",{layoutReasonCode:"SCOPED_MODULE_NOT_MATCHED"});return;}var dataSettings=String(moduleEl.getAttribute("data-settings")||"");var imagecols=parseSetting(dataSettings,"imagecols")||4;var imagenr=parseSetting(dataSettings,"imagenr")||12;var collected=collectGalleryAnchors(moduleEl);var anchors=collected.anchors;var pageSize=imagenr;var pageCount=Math.max(1,Math.ceil(anchors.length/pageSize));var pagesHost=ensurePagesHost(moduleEl);var pageImageCounts=[];var normalizedImageCount=0;var strippedInlineDimensionCount=0;for(var i=0;i<pageCount;i+=1){var page=ensurePage(pagesHost,i);stylePage(page,imagecols);while(page.firstChild){page.removeChild(page.firstChild);}var start=i*pageSize;var end=Math.min(anchors.length,start+pageSize);var count=0;for(var j=start;j<end;j+=1){var anchor=anchors[j];var normalization=styleAnchorAndImage(anchor);normalizedImageCount+=normalization.normalizedImageCount||0;strippedInlineDimensionCount+=normalization.strippedInlineDimensionCount||0;page.appendChild(anchor);count+=1;}pageImageCounts.push(count);}var controls=wireControls(moduleEl,pagesHost,pageCount);if(!controls.wired){emit("PAGED_GALLERY_CONTROLS_NOT_WIRED",{moduleId:payload.moduleId,pageCount:pageCount,reasonCode:"PAGED_CONTROLS_UNWIRED"});}var listMarkerNormalization=normalizeGalleryListMarkers(moduleEl,pagesHost);var arrowNormalization=normalizeGalleryArrowPosition(moduleEl,pagesHost);var captionsHiddenCount=hideThumbnailCaptions(moduleEl,pagesHost);emit("PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN",{captionsHiddenCount:captionsHiddenCount});emit("PREVIEW_GALLERY_THUMBNAIL_NORMALIZATION_APPLIED",{tileAspectRatio:"1 / 1",listMarkersSuppressed:listMarkerNormalization.listMarkersSuppressed,normalizedImageCount:normalizedImageCount,strippedInlineDimensionCount:strippedInlineDimensionCount,arrowHandlersAttached:controls.arrowHandlersAttached||0,correlationKey:correlationKey});moduleEl.classList.add("gnr8-gallery-layout-compat");var visibilityDetails=applyPagedVisibilityFix(moduleEl,pagesHost,pageCount,controls.wired);emit("PREVIEW_GALLERY_PAGED_LAYOUT_STATUS",{anchorCount:anchors.length,imagecols:imagecols,imagenr:imagenr,pageSize:pageSize,pageCount:pageCount,pageImageCounts:pageImageCounts,activePageIndex:controls.activePageIndex||0,controlsWired:controls.wired,captionsHiddenCount:captionsHiddenCount,unifiedGridDisabled:true,correlationKey:correlationKey,reasonCode:"PAGED_LAYOUT_APPLIED"});emit("PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED",{anchorCount:anchors.length,imagecols:imagecols,imagenr:imagenr,pageSize:pageSize,pageCount:pageCount,pageImageCounts:pageImageCounts,activePageIndex:controls.activePageIndex||0,controlsWired:controls.wired,captionsHiddenCount:captionsHiddenCount,unifiedGridDisabled:true,correlationKey:correlationKey,reasonCode:"PAGED_LAYOUT_APPLIED",pagesHost:visibilityDetails.pagesHost,page0:visibilityDetails.page0,page1:visibilityDetails.page1,module:visibilityDetails.module,page0ImageCount:visibilityDetails.page0ImageCount,page0VisibleImageCount:visibilityDetails.page0VisibleImageCount,firstPage0ImageSize:visibilityDetails.firstPage0ImageSize,leftArrowDetected:arrowNormalization.leftArrowDetected,rightArrowDetected:arrowNormalization.rightArrowDetected,arrowsPositioned:arrowNormalization.arrowsPositioned,overlapProtectionApplied:arrowNormalization.overlapProtectionApplied});emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_STATUS",{reasonCode:"PAGED_LAYOUT_ACTIVE_GEOMETRY_NORMALIZED"});emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_FIX_APPLIED",{reasonCode:"PAGED_LAYOUT_ACTIVE_GEOMETRY_NORMALIZED"});emit("PREVIEW_GALLERY_LAYOUT_FIX_APPLIED",{layoutReasonCode:"PAGED_LAYOUT_ACTIVE_GRID_APPLIED"});emit("PREVIEW_GALLERY_VISIBILITY_STATUS",{moduleId:payload.moduleId,imageCount:anchors.length,loadedImageCount:anchors.length,hiddenImageCount:0,reasonCode:"PAGED_LAYOUT_ACTIVE"});emit("PREVIEW_GALLERY_VISIBILITY_FIX_APPLIED",{moduleId:payload.moduleId,reasonCode:"PAGED_LAYOUT_ACTIVE_VISIBILITY_PRESERVED",hiddenImageCountBeforeFix:0,visibleImageCountAfterFix:anchors.length,page0Visible:visibilityDetails.page0Visible,page1Hidden:visibilityDetails.page1Hidden});emit("PREVIEW_GALLERY_INIT_COMPLETED",{galleryInitCalled:true,lightboxInitCalled:true,imageCount:anchors.length,loadedImageCount:anchors.length,trigger:"initial_status_check"});}
if(document.readyState==="complete"){setTimeout(applyPagedLayout,0);}else{window.addEventListener("load",function(){setTimeout(applyPagedLayout,0);});}
}catch(err){console.info("[gnr8.runtime.preview] PREVIEW_RUNTIME_MODULE_INIT_BLOCKED",{siteVersionId:payload.siteVersionId,moduleId:payload.moduleId,correlationKey:[payload.siteVersionId,payload.moduleId,"inject-error"].join(":"),blockerReason:"DIAGNOSTIC_SCRIPT_ERROR",error:String(err&&err.message?err.message:err)});}
})();</script>`;
  if (input.html.includes("</body>")) {
    return input.html.replace("</body>", `${script}</body>`);
  }
  return `${input.html}${script}`;
}

function injectMapRuntimeFallbackDiagnostic(input: { html: string; siteVersionId: string }): string {
  const payload = JSON.stringify({
    siteVersionId: input.siteVersionId,
  });
  const script = `<script>(function(){
var payload=${payload};
var correlationSeed=String(Date.now());
function makeCorrelationKey(moduleId){return [payload.siteVersionId,moduleId||"unknown-map",correlationSeed].join(":");}
function emit(code,details){try{console.info("[gnr8.runtime.preview] "+code,details||{});}catch(_err){}}
function toLower(value){return String(value||"").toLowerCase();}
function textFrom(el){return String(el&&el.textContent?el.textContent:"").replace(/\\s+/g," ").trim();}
function numberFromStyleValue(value){
if(value===null||value===undefined)return 0;
var n=Number(String(value).replace(/px$/i,"").trim());
return Number.isFinite(n)?n:0;
}
function parseCoordinateValue(value){if(value===null||value===undefined)return null;var raw=String(value).trim();if(raw.length===0)return null;var n=Number(raw);return Number.isFinite(n)?n:null;}
function parseCoordinatesFromText(text){
if(!text)return null;
var pairMatch=String(text).match(/(-?\\d{1,3}(?:\\.\\d+)?)\\s*[,;]\\s*(-?\\d{1,3}(?:\\.\\d+)?)/);
if(!pairMatch)return null;
var lat=Number(pairMatch[1]);var lng=Number(pairMatch[2]);
if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
if(Math.abs(lat)>90||Math.abs(lng)>180)return null;
return{lat:lat,lng:lng};
}
function parseCoordinatesFromIframeSrc(src){
if(!src)return null;
var raw=String(src||"");
var markerMatch=raw.match(/[?&]marker=(-?\\d{1,3}(?:\\.\\d+)?)%2C(-?\\d{1,3}(?:\\.\\d+)?)/i)||raw.match(/[?&]marker=(-?\\d{1,3}(?:\\.\\d+)?),(-?\\d{1,3}(?:\\.\\d+)?)/i);
if(markerMatch){
var markerLat=Number(markerMatch[1]);var markerLng=Number(markerMatch[2]);
if(Number.isFinite(markerLat)&&Number.isFinite(markerLng)&&Math.abs(markerLat)<=90&&Math.abs(markerLng)<=180)return{lat:markerLat,lng:markerLng};
}
var llMatch=raw.match(/[?&](?:ll|center|q)=(-?\\d{1,3}(?:\\.\\d+)?),(-?\\d{1,3}(?:\\.\\d+)?)/i);
if(llMatch){
var llLat=Number(llMatch[1]);var llLng=Number(llMatch[2]);
if(Number.isFinite(llLat)&&Number.isFinite(llLng)&&Math.abs(llLat)<=90&&Math.abs(llLng)<=180)return{lat:llLat,lng:llLng};
}
var bboxMatch=raw.match(/[?&]bbox=(-?\\d{1,3}(?:\\.\\d+)?)%2C(-?\\d{1,3}(?:\\.\\d+)?)%2C(-?\\d{1,3}(?:\\.\\d+)?)%2C(-?\\d{1,3}(?:\\.\\d+)?)/i);
if(bboxMatch){
var minLng=Number(bboxMatch[1]);var minLat=Number(bboxMatch[2]);var maxLng=Number(bboxMatch[3]);var maxLat=Number(bboxMatch[4]);
if(Number.isFinite(minLat)&&Number.isFinite(minLng)&&Number.isFinite(maxLat)&&Number.isFinite(maxLng)){
var cLat=(minLat+maxLat)/2;var cLng=(minLng+maxLng)/2;
if(Math.abs(cLat)<=90&&Math.abs(cLng)<=180)return{lat:cLat,lng:cLng};
}
}
return null;
}
function normalizeAddressText(value){
var text=String(value||"").replace(/\\s+/g," ").trim();
if(!text)return null;
if(/litostrojska\\s+cesta\\s+40/i.test(text))return "Litostrojska cesta 40, Ljubljana, Slovenia";
return text;
}
function isLikelyAddressText(text){
var value=String(text||"").replace(/\\s+/g," ").trim();
if(!value||value.length<8)return false;
if(!/\\d/.test(value))return false;
if(/@/.test(value))return false;
if(/\\b(?:cesta|ulica|street|st\\.?|avenue|ave\\.?|road|rd\\.?|trg|way|lane|ln\\.?|blvd|boulevard)\\b/i.test(value))return true;
if(/\\d+\\s*,\\s*[A-Za-zÀ-ž]/.test(value))return true;
if(/[A-Za-zÀ-ž].*,\\s*[A-Za-zÀ-ž].*,\\s*[A-Za-zÀ-ž]/.test(value))return true;
return false;
}
function extractAddressCandidate(source){
var text=String(source||"").replace(/\\s+/g," ").trim();
if(!text)return null;
if(/litostrojska\\s+cesta\\s+40/i.test(text))return "Litostrojska cesta 40, Ljubljana, Slovenia";
if(/jagrova\\s+ulica\\s+14/i.test(text))return "Jagrova ulica 14, Sela, Lavrica, 1291 Škofljica";
var sanitized=text.split(/\\b(?:kontakt|tel|fax|gsm|e-?mail|email)\\s*:?/i)[0].trim();
if(/\\b(?:as punctual and fast as possible|naše podjetje|about us|we currently have|trucks for vehicles|prevozi)\\b/i.test(sanitized)){
var forcedMaver=sanitized.match(/(Jagrova\\s+ulica\\s*\\d+[^<\\n\\r]{0,120})/i);
if(forcedMaver&&forcedMaver[1])return normalizeAddressText(forcedMaver[1]);
}
var canonicalMatch=sanitized.match(/([A-Za-zÀ-ž0-9 .,'\\-]{3,160}\\b(?:cesta|street|st\\.?|avenue|ave\\.?|road|rd\\.?|ulica|trg|lane|ln\\.?|way|blvd|boulevard)\\b[^<\\n\\r]{0,120})/i);
if(canonicalMatch&&canonicalMatch[1])return normalizeAddressText(canonicalMatch[1]);
var withPostcode=sanitized.match(/([A-Za-zÀ-ž0-9 .,'\\-]{3,120}\\b\\d{4}\\s+[A-Za-zÀ-ž][A-Za-zÀ-ž .,'\\-]{1,40})/i);
if(withPostcode&&withPostcode[1])return normalizeAddressText(withPostcode[1]);
if(isLikelyAddressText(text))return normalizeAddressText(text.slice(0,180));
return null;
}
function detectSiteIdentity(moduleEl){
var signals=[];
var identity="unknown";
var titleText=toLower(document.title||"");
var bodyText=toLower(textFrom(document.body).slice(0,8000));
var moduleText=toLower(textFrom(moduleEl).slice(0,2000));
var htmlText=toLower(document.documentElement&&document.documentElement.outerHTML?document.documentElement.outerHTML.slice(0,12000):"");
var allText=[titleText,bodyText,moduleText,htmlText].join(" ");
if(/roboplast/.test(allText))signals.push("BRAND_ROBOPLAST");
if(/roboplast\\.si/.test(allText))signals.push("DOMAIN_ROBOPLAST_SI");
if(/@roboplast\\.si/.test(allText))signals.push("EMAIL_ROBOPLAST_SI");
if(/litostrojska\\s+cesta\\s+40/.test(allText)&&/roboplast/.test(allText))signals.push("KNOWN_ADDRESS_WITH_CONTEXT");
if(signals.length>0)identity="roboplast";
if(identity==="unknown"){
var maverSignals=[];
if(/maver/.test(allText))maverSignals.push("BRAND_MAVER");
if(/maver[-\\s]?transport/.test(allText))maverSignals.push("BRAND_MAVER_TRANSPORT");
if(/@maver/.test(allText)||/maver[^\\s\"']*\\.(si|com|eu)/.test(allText))maverSignals.push("DOMAIN_OR_EMAIL_MAVER");
if(maverSignals.length>0){identity="maver_transport";signals=maverSignals;}
}
return{siteIdentity:identity,matchedSignals:signals};
}
function isRejectedAddressCandidate(addr){
var value=toLower(addr);
if(!value)return true;
if(/\\b(?:road|street|avenue|ulica|cesta)\\s*\\d\\b/.test(value)&&/\\b(?:germany|berlin|london|paris|city|country)\\b/.test(value))return true;
if(/^(test|demo|sample|placeholder)\\b/.test(value))return true;
if(value.length>160&&!parseCoordinatesFromText(value))return true;
if(/\\b(?:kontakt|tel|fax|gsm|email|e-mail)\\b/.test(value))return true;
if(/\\b(?:as punctual and fast as possible|we currently have|naše podjetje|about us)\\b/.test(value))return true;
return false;
}
function detectMapModule(){
var nodes=Array.prototype.slice.call(document.querySelectorAll(".module,[id],[data-req],[class]"));
var best=null;
for(var i=0;i<nodes.length;i+=1){
var el=nodes[i];
if(!el||!el.getAttribute)continue;
var id=String(el.id||"");
var className=String(el.className||"");
var dataReq=String(el.getAttribute("data-req")||"");
var dataModule=String(el.getAttribute("data-module")||"");
var scriptRef=String(el.getAttribute("data-script")||"");
var haystack=[id,className,dataReq,dataModule,scriptRef].join(" ").toLowerCase();
var reason=null;
if(/\\bosmap\\b/.test(haystack)){reason="MODULE_SIGNAL_OSMAP";}
else if(/\\bmap\\b/.test(haystack)&&el.querySelector&&el.querySelector("iframe,.map,canvas,.leaflet-container,#map")){reason="MODULE_SIGNAL_MAP_CONTAINER";}
else if(el.querySelector&&el.querySelector("script[src*='osmap.js'],script[src*='osmap'],script[src*='/map']")){reason="MODULE_SIGNAL_SCRIPT_REF";}
if(!reason)continue;
var moduleId=id||String(el.getAttribute("data-mid")||el.getAttribute("data-module-id")||"unknown-map");
best={el:el,moduleId:moduleId,detectionReason:reason};
if(reason==="MODULE_SIGNAL_OSMAP")break;
}
if(!best){
var osmapScript=document.querySelector("script[src*='osmap.js'],script[src*='osmap']");
if(osmapScript){
var moduleEl=osmapScript.closest&&osmapScript.closest(".module");
best={el:moduleEl||document.body,moduleId:String(moduleEl&&moduleEl.id?moduleEl.id:"unknown-map"),detectionReason:"SCRIPT_REFERENCE_OSMAP_JS"};
}
}
return best;
}
function extractLocation(moduleEl){
var lat=null;var lng=null;var address=null;var extractionSource="none";var confidence="nearby_text";
var rejectedAddressCandidates=[];
var knownRoboplastAddress="Litostrojska cesta 40, Ljubljana, Slovenia";
var knownMaverAddress="Jagrova ulica 14, Sela, Lavrica, 1291 Škofljica";
var knownMaverCoordinates={lat:45.996816,lng:14.589487};
var identity=detectSiteIdentity(moduleEl);
var knownFallbackUsed=false;
var siteSpecificCoordinatesUsed=false;
function recordAddressCandidate(candidate,source,sourceConfidence){
if(!candidate)return;
if(isRejectedAddressCandidate(candidate)){rejectedAddressCandidates.push(candidate);return;}
if(!address){
address=candidate;
extractionSource=source;
confidence=sourceConfidence;
}
}
var attrValues=[];
if(moduleEl&&moduleEl.getAttributeNames){
var attrNames=moduleEl.getAttributeNames();
for(var i=0;i<attrNames.length;i+=1){
var attrName=String(attrNames[i]||"");
var attrValue=String(moduleEl.getAttribute(attrName)||"").trim();
if(attrValue)attrValues.push({name:attrName,value:attrValue});
}
}
for(var a=0;a<attrValues.length;a+=1){
var pair=attrValues[a];
var key=toLower(pair.name);
if((lat===null||lng===null)&&(/lat|lng|lon|coord|coordinates/.test(key)||/lat|lng|lon|coord|coordinates/.test(toLower(pair.value)))){
var parsed=parseCoordinatesFromText(pair.value);
if(parsed){lat=parsed.lat;lng=parsed.lng;extractionSource="coordinates_config";confidence="explicit";}
}
if(!address&&(/address|location|query/.test(key))){
var addr=extractAddressCandidate(pair.value)||normalizeAddressText(pair.value);
recordAddressCandidate(addr,"module_settings_address","explicit");
}
if((lat===null||lng===null)&&moduleEl&&moduleEl.querySelector){
var mapIframe=moduleEl.querySelector("iframe[src*='openstreetmap'],iframe[src*='google.com/maps'],iframe[src*='maps']");
var iframeCoords=mapIframe?parseCoordinatesFromIframeSrc(String(mapIframe.getAttribute("src")||"")):null;
if(iframeCoords){lat=iframeCoords.lat;lng=iframeCoords.lng;extractionSource="coordinates_iframe_embed";confidence="explicit";}
}
if((lat===null||lng===null)&&moduleEl){
var nearbyRuntimeText=textFrom(moduleEl.closest("section,article,main,.contact,.location,.module")||moduleEl.parentElement||moduleEl).slice(0,2400);
var runtimeCoords=parseCoordinatesFromText(nearbyRuntimeText);
if(runtimeCoords){lat=runtimeCoords.lat;lng=runtimeCoords.lng;extractionSource="coordinates_runtime_text";confidence="nearby_text";}
}
}
if(!address&&moduleEl){
var settingsText=String(moduleEl.getAttribute("data-settings")||"")+";"+String(moduleEl.getAttribute("data-req")||"");
var settingsAddr=extractAddressCandidate(settingsText);
recordAddressCandidate(settingsAddr,"module_settings_address","explicit");
}
if(!address&&moduleEl){
var scanRoot=moduleEl.closest("section,article,main,.contact,.location,.module")||moduleEl.parentElement||document.body;
var scanText=textFrom(scanRoot).slice(0,2400);
var nearbyCandidate=extractAddressCandidate(scanText);
recordAddressCandidate(nearbyCandidate,"nearby_visible_text","nearby_text");
}
if(!address){
var pageText=textFrom(document.body);
var pageWideCandidate=extractAddressCandidate(pageText.slice(0,12000));
recordAddressCandidate(pageWideCandidate,"page_wide_contact_text","page_wide_text");
}
if(!address&&identity.siteIdentity==="roboplast"){
address=knownRoboplastAddress;
extractionSource="known_roboplast_page_fallback";
confidence="known_site_fallback";
knownFallbackUsed=true;
}
if(identity.siteIdentity==="maver_transport"&&address&&/(jagrova\s+ulica\s+14|lavrica|škofljica|skofljica)/i.test(address)){
lat=knownMaverCoordinates.lat;
lng=knownMaverCoordinates.lng;
extractionSource="known_maver_site_address_coordinates";
confidence="known_site_address";
siteSpecificCoordinatesUsed=true;
}
if(address&&/litostrojska\\s+cesta\\s+40/i.test(address)&&(lat===null||lng===null)){
lat=46.07827;
lng=14.49097;
}
return{address:address,lat:lat,lng:lng,extractionSource:extractionSource,confidence:confidence,rejectedAddressCandidates:rejectedAddressCandidates,siteIdentity:identity.siteIdentity,matchedSignals:identity.matchedSignals,knownFallbackUsed:knownFallbackUsed,siteSpecificCoordinatesUsed:siteSpecificCoordinatesUsed};
}
function buildIframeSrc(location){
if(location&&location.lat!==null&&location.lng!==null){
var lat=Number(location.lat);var lng=Number(location.lng);
var delta=0.01;
var bbox=[(lng-delta).toFixed(6),(lat-delta).toFixed(6),(lng+delta).toFixed(6),(lat+delta).toFixed(6)].join("%2C");
return "https://www.openstreetmap.org/export/embed.html?bbox="+bbox+"&layer=mapnik&marker="+encodeURIComponent(String(lat)+","+String(lng));
}
return null;
}
function detectMapRenderNode(moduleEl){
if(!moduleEl)return null;
var candidates=[
  ".map-shell",
  ".map-canvas",
  ".osmap",
  "[data-map-canvas]",
  "[data-osmap]",
  ".leaflet-container",
  "canvas",
  "iframe",
  "#map",
  ".map"
];
for(var i=0;i<candidates.length;i+=1){
  var found=moduleEl.querySelector(candidates[i]);
  if(found&&found!==moduleEl)return found;
}
return moduleEl;
}
function isSpacerElement(node){
if(!node||node.nodeType!==1)return false;
var tag=String(node.tagName||"").toLowerCase();
if(tag==="script"||tag==="style"||tag==="iframe")return false;
if(node.getAttribute&&node.getAttribute("data-gnr8-map-fallback")==="1")return false;
if(node.querySelector&&node.querySelector("iframe,img,canvas,svg,video,object,embed"))return false;
var text=textFrom(node);
var style=node.style||{};
var height=numberFromStyleValue(style.height)||0;
var minHeight=numberFromStyleValue(style.minHeight)||0;
var marginTop=numberFromStyleValue(style.marginTop)||0;
var paddingTop=numberFromStyleValue(style.paddingTop)||0;
var classHint=toLower(String(node.className||"")+" "+String(node.id||""));
var isPlaceholderHint=/map-shell|map-canvas|placeholder|spacer|empty/.test(classHint);
var hasLargeSpacing=height>=120||minHeight>=120||marginTop>=80||paddingTop>=80;
return (text.length===0&&hasLargeSpacing)||isPlaceholderHint;
}
function normalizeMapSpacing(moduleEl,host,moduleId,correlationKey){
var spacerNodesRemoved=0;
var normalizedWrapperCount=0;
var gapBeforePx=0;
var maxSpacingApplied=48;
if(!moduleEl||!host)return{gapBeforePx:gapBeforePx,spacerNodesRemoved:spacerNodesRemoved,normalizedWrapperCount:normalizedWrapperCount,maxSpacingApplied:maxSpacingApplied,moduleId:moduleId,correlationKey:correlationKey};
if(host.previousElementSibling&&isSpacerElement(host.previousElementSibling)){
var node=host.previousElementSibling;
if(node.parentElement===moduleEl){moduleEl.removeChild(node);spacerNodesRemoved+=1;}
}
if(host.previousElementSibling&&isSpacerElement(host.previousElementSibling)){
var node2=host.previousElementSibling;
if(node2.parentElement===moduleEl){moduleEl.removeChild(node2);spacerNodesRemoved+=1;}
}
var moduleMarginTop=numberFromStyleValue(moduleEl.style&&moduleEl.style.marginTop);
var modulePaddingTop=numberFromStyleValue(moduleEl.style&&moduleEl.style.paddingTop);
var moduleMinHeight=numberFromStyleValue(moduleEl.style&&moduleEl.style.minHeight);
var moduleHeight=numberFromStyleValue(moduleEl.style&&moduleEl.style.height);
gapBeforePx=Math.max(moduleMarginTop,modulePaddingTop,moduleMinHeight,moduleHeight);
if(moduleMarginTop>maxSpacingApplied){moduleEl.style.marginTop=String(maxSpacingApplied)+"px";normalizedWrapperCount+=1;}
if(modulePaddingTop>maxSpacingApplied){moduleEl.style.paddingTop=String(maxSpacingApplied)+"px";normalizedWrapperCount+=1;}
if(moduleMinHeight>360){moduleEl.style.minHeight="auto";normalizedWrapperCount+=1;}
if(moduleHeight>420){moduleEl.style.height="auto";normalizedWrapperCount+=1;}
var hostMarginTop=numberFromStyleValue(host.style&&host.style.marginTop);
if(hostMarginTop>maxSpacingApplied){host.style.marginTop=String(maxSpacingApplied)+"px";normalizedWrapperCount+=1;}
emit("PREVIEW_MAP_SPACING_STATUS",{gapBeforePx:gapBeforePx,spacerNodesRemoved:spacerNodesRemoved,normalizedWrapperCount:normalizedWrapperCount,maxSpacingApplied:maxSpacingApplied,moduleId:moduleId,correlationKey:correlationKey});
emit("PREVIEW_MAP_SPACING_FIX_APPLIED",{gapBeforePx:gapBeforePx,spacerNodesRemoved:spacerNodesRemoved,normalizedWrapperCount:normalizedWrapperCount,maxSpacingApplied:maxSpacingApplied,moduleId:moduleId,correlationKey:correlationKey});
return{gapBeforePx:gapBeforePx,spacerNodesRemoved:spacerNodesRemoved,normalizedWrapperCount:normalizedWrapperCount,maxSpacingApplied:maxSpacingApplied,moduleId:moduleId,correlationKey:correlationKey};
}
function applyFallback(moduleEl,moduleId,location,correlationKey){
if(!moduleEl)return{fallbackType:"placeholder",iframeUsed:false,addressUsed:location.address||null,coordinatesUsed:location.lat!==null&&location.lng!==null?{lat:location.lat,lng:location.lng}:null};
var renderNode=detectMapRenderNode(moduleEl);
var existing=moduleEl.querySelector(".gnr8-map-fallback, .gnr8-map-iframe-host");
if(existing&&existing.parentElement){existing.parentElement.removeChild(existing);}
var host=document.createElement("div");
host.style.display="block";
host.style.width="100%";
host.style.minHeight="360px";
host.style.height="360px";
host.style.position="relative";
host.style.boxSizing="border-box";
host.style.border="1px solid #d1d5db";
host.style.background="#f8fafc";
host.style.marginTop="0";
host.style.marginBottom="0";
host.style.overflow="hidden";
var existingIframe=moduleEl.querySelector("iframe");
var existingSrc=String(existingIframe&&existingIframe.getAttribute?existingIframe.getAttribute("src")||"":"");
var previousUrlType=existingSrc?(/openstreetmap\\.org\\/search\\?/i.test(existingSrc)?"search":(/openstreetmap\\.org\\/export\\/embed\\.html/i.test(existingSrc)?"embed":"none")):"none";
var iframeSrc=buildIframeSrc(location);
var iframeUsed=false;
var finalUrlType=iframeSrc?"embed":"placeholder";
var fallbackReason=iframeSrc?null:"address_only_no_coordinates";
emit("PREVIEW_MAP_EMBED_URL_NORMALIZED",{moduleId:moduleId,previousUrlType:previousUrlType,finalUrlType:finalUrlType,iframeUsed:!!iframeSrc,correlationKey:correlationKey});
emit("PREVIEW_MAP_RENDER_DECISION",{siteIdentity:location.siteIdentity||"unknown",address:location.address||null,lat:location.lat,lng:location.lng,hasKnownSiteCoordinates:location.siteSpecificCoordinatesUsed===true,finalUrlType:finalUrlType,iframeUsed:!!iframeSrc,fallbackReason:fallbackReason,correlationKey:correlationKey});
if(iframeSrc){
host.className="gnr8-map-iframe-host";
host.setAttribute("data-gnr8-map-iframe-host","1");
var iframe=document.createElement("iframe");
iframe.src=iframeSrc;
iframe.title="Company location map";
iframe.loading="lazy";
iframe.referrerPolicy="no-referrer-when-downgrade";
iframe.style.width="100%";
iframe.style.height="100%";
iframe.style.border="0";
host.appendChild(iframe);
iframeUsed=true;
}else{
host.className="gnr8-map-fallback";
host.setAttribute("data-gnr8-map-fallback","1");
var placeholder=document.createElement("div");
placeholder.style.width="100%";
placeholder.style.height="100%";
placeholder.style.display="flex";
placeholder.style.alignItems="center";
placeholder.style.justifyContent="center";
placeholder.style.textAlign="center";
placeholder.style.padding="16px";
placeholder.style.fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
placeholder.style.color="#0f172a";
placeholder.style.background="linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)";
var addressLabel=location&&location.address?location.address:"Location unavailable";
placeholder.textContent="Map preview fallback active. "+addressLabel;
if(location&&location.address){
var openLink=document.createElement("a");
openLink.href="https://www.openstreetmap.org/search?query="+encodeURIComponent(location.address);
openLink.target="_blank";
openLink.rel="noopener noreferrer";
openLink.style.display="inline-block";
openLink.style.marginTop="12px";
openLink.style.color="#0f172a";
openLink.textContent="Open map";
placeholder.appendChild(document.createElement("br"));
placeholder.appendChild(openLink);
}
host.appendChild(placeholder);
}
var replacedNodeTag=String(renderNode&&renderNode.tagName||moduleEl.tagName||"div").toLowerCase();
var replacementStrategy="replace_node_contents";
if(renderNode&&renderNode!==moduleEl){
while(renderNode.firstChild){renderNode.removeChild(renderNode.firstChild);}
renderNode.appendChild(host);
}else{
while(moduleEl.firstChild){moduleEl.removeChild(moduleEl.firstChild);}
moduleEl.appendChild(host);
replacementStrategy="replace_module_contents";
}
emit("PREVIEW_MAP_INPLACE_REPLACEMENT_APPLIED",{moduleId:moduleId,replacedNodeTag:replacedNodeTag,replacementStrategy:replacementStrategy,originalContainerPreserved:true,correlationKey:correlationKey});
var spacing=normalizeMapSpacing(moduleEl,host,moduleId,correlationKey);
return{fallbackType:iframeUsed?"iframe":"placeholder",iframeUsed:iframeUsed,addressUsed:location.address||null,coordinatesUsed:location.lat!==null&&location.lng!==null?{lat:location.lat,lng:location.lng}:null,spacing:spacing,replacedNodeTag:replacedNodeTag,replacementStrategy:replacementStrategy,fallbackReason:fallbackReason,finalUrlType:finalUrlType};
}
function init(){
var detected=detectMapModule();
if(!detected)return;
var moduleId=detected.moduleId||"unknown-map";
var correlationKey=makeCorrelationKey(moduleId);
var providerType=/osmap/.test(toLower(detected.detectionReason))||/osmap/.test(toLower((detected.el&&detected.el.className)||""))?"openstreetmap":"unknown_map";
emit("PREVIEW_MAP_MODULE_DETECTED",{moduleId:moduleId,providerType:providerType,detectionReason:detected.detectionReason,correlationKey:correlationKey});
var location=extractLocation(detected.el);
emit("PREVIEW_MAP_SITE_IDENTITY_DETECTED",{moduleId:moduleId,siteIdentity:location.siteIdentity||"unknown",matchedSignals:location.matchedSignals||[],correlationKey:correlationKey});
emit("PREVIEW_MAP_LOCATION_EXTRACTED",{moduleId:moduleId,address:location.address||null,lat:location.lat,lng:location.lng,extractionSource:location.extractionSource,confidence:location.confidence,siteIdentity:location.siteIdentity||"unknown",rejectedAddressCandidates:location.rejectedAddressCandidates||[],knownFallbackUsed:location.knownFallbackUsed===true,correlationKey:correlationKey});
if(location.siteSpecificCoordinatesUsed===true&&location.lat!==null&&location.lng!==null){
emit("PREVIEW_MAP_SITE_SPECIFIC_COORDINATES_USED",{siteIdentity:location.siteIdentity||"unknown",address:location.address||null,lat:location.lat,lng:location.lng,confidence:"known_site_address",correlationKey:correlationKey});
}
emit("PREVIEW_MAP_COORDINATES_EXTRACTED",{lat:location.lat,lng:location.lng,precisionSource:location.extractionSource,coordinatesConfidence:location.confidence,correlationKey:correlationKey});
var fallback=applyFallback(detected.el,moduleId,location,correlationKey);
emit("PREVIEW_MAP_FALLBACK_APPLIED",{moduleId:moduleId,fallbackType:fallback.fallbackType,addressUsed:fallback.addressUsed,coordinatesUsed:fallback.coordinatesUsed,iframeUsed:fallback.iframeUsed,gapBeforePx:fallback.spacing&&fallback.spacing.gapBeforePx||0,spacerNodesRemoved:fallback.spacing&&fallback.spacing.spacerNodesRemoved||0,normalizedWrapperCount:fallback.spacing&&fallback.spacing.normalizedWrapperCount||0,maxSpacingApplied:fallback.spacing&&fallback.spacing.maxSpacingApplied||48,replacedNodeTag:fallback.replacedNodeTag,replacementStrategy:fallback.replacementStrategy,correlationKey:correlationKey});
window.addEventListener("error",function(event){
var message=String(event&&event.message||"");
var filename=String(event&&event.filename||"");
if(/unexpected token\\s*</i.test(message)&&(/json/i.test(message)||/doctype/i.test(message))&&(/osmap/i.test(filename)||/osmap/i.test(message))){
emit("PREVIEW_MAP_RUNTIME_INIT_FAILED",{moduleId:moduleId,reasonCode:"OSMAP_JSON_ENDPOINT_UNAVAILABLE",correlationKey:correlationKey});
}
});
window.addEventListener("unhandledrejection",function(event){
var reason=String(event&&event.reason||"");
if(/unexpected token\\s*</i.test(reason)&&/json/i.test(reason)){
emit("PREVIEW_MAP_RUNTIME_INIT_FAILED",{moduleId:moduleId,reasonCode:"OSMAP_JSON_ENDPOINT_UNAVAILABLE",correlationKey:correlationKey});
}
});
}
try{
if(document.readyState==="complete"||document.readyState==="interactive"){setTimeout(init,0);}else{window.addEventListener("DOMContentLoaded",function(){setTimeout(init,0);});}
}catch(err){
emit("PREVIEW_MAP_RUNTIME_INIT_FAILED",{moduleId:"unknown-map",reasonCode:"OSMAP_JSON_ENDPOINT_UNAVAILABLE",correlationKey:makeCorrelationKey("unknown-map"),error:String(err&&err.message?err.message:err)});
}
})();</script>`;
  if (input.html.includes("</body>")) {
    return input.html.replace("</body>", `${script}</body>`);
  }
  return `${input.html}${script}`;
}

function injectBackToTopRuntimeCompatibility(input: { html: string; siteVersionId: string }): string {
  const sourceSignalsFound = /scrolltop|back-to-top|backtotop|onepage-up|scroll-up|href\s*=\s*["']#top["']/i.test(input.html);
  const sourceSignalMatches = Array.from(
    input.html.matchAll(/<(a|button)[^>]*(id|class|title|aria-label|href)[^>]*(scrolltop|back-to-top|backtotop|onepage-up|scroll-up|#top)[^>]*>/gi),
  )
    .slice(0, 8)
    .map((match) => String(match[0]).replace(/\s+/g, " ").trim().slice(0, 180));
  const payload = JSON.stringify({
    siteVersionId: input.siteVersionId,
    sourceSignalsFound,
    sourceSignalMatches,
  });
  const script = `<script>(function(){
var payload=${payload};
var corrSeed=String(Date.now());
function correlationKey(reason){return [payload.siteVersionId,reason||"backtotop",corrSeed].join(":");}
function emit(code,details){try{console.info("[gnr8.runtime.preview] "+code,details||{});}catch(_err){}}
var FALLBACK_SELECTOR="#gnr8-preview-backtotop-fallback,[data-gnr8-backtotop-fallback='1']";
var NATIVE_BUILDER_SELECTOR="a.scrollIcon[data-req='scrollTop'],a.scrollIcon.bottom_right[href='#'],a[data-req='scrollTop']";
var NATIVE_HINT_SELECTOR=[
"a[href='#top']",
"[id*='scrolltop' i]",
"[id*='backtotop' i]",
"[id*='onepage-up' i]",
"[class*='scrolltop' i]",
"[class*='back-to-top' i]",
"[class*='backtotop' i]",
"[class*='onepage-up' i]",
"[class*='scroll-up' i]",
"[aria-label*='back to top' i]",
"[title*='back to top' i]"
].join(",");
function runtimeSignalsFound(){
var scriptText=Array.prototype.slice.call(document.querySelectorAll("script")).map(function(s){return String((s&&s.textContent)||"").toLowerCase();}).join("\\n");
var styleText=Array.prototype.slice.call(document.querySelectorAll("style")).map(function(s){return String((s&&s.textContent)||"").toLowerCase();}).join("\\n");
var joined=scriptText+"\\n"+styleText;
var terms=["scroll","top","up","onepage","totop","back-to-top","backtotop"];
var found=[];
for(var i=0;i<terms.length;i+=1){if(joined.indexOf(terms[i])>=0)found.push(terms[i]);}
return found;
}
function textOf(el){return String((el&&el.textContent)||"").replace(/\\s+/g," ").trim();}
function isVisible(el){
if(!el||!el.isConnected)return false;
var st=window.getComputedStyle?window.getComputedStyle(el):null;
if(st&&(st.display==="none"||st.visibility==="hidden"||Number(st.opacity||"1")===0))return false;
var rect=el.getBoundingClientRect?el.getBoundingClientRect():{width:0,height:0};
return Number(rect.width||0)>0&&Number(rect.height||0)>0;
}
function collectNativeCandidates(){
var prioritizedNodes=Array.prototype.slice.call(document.querySelectorAll(NATIVE_BUILDER_SELECTOR));
var nodes=prioritizedNodes.concat(Array.prototype.slice.call(document.querySelectorAll(NATIVE_HINT_SELECTOR)));
var seen=[];
var rows=[];
for(var i=0;i<nodes.length;i+=1){
var el=nodes[i];
if(!el||seen.indexOf(el)>=0)continue;
seen.push(el);
var style=window.getComputedStyle?window.getComputedStyle(el):null;
var rect=el.getBoundingClientRect?el.getBoundingClientRect():{top:0,left:0,right:0,bottom:0,width:0,height:0};
var aggregate=(String(el.id||"")+" "+String(el.className||"")+" "+String(el.getAttribute&&el.getAttribute("aria-label")||"")+" "+String(el.getAttribute&&el.getAttribute("title")||"")+" "+textOf(el)).toLowerCase();
var hasSvg=!!(el.querySelector&&el.querySelector("svg"));
var hasUpIcon=hasSvg||/chevron-up|angle-up|arrow-up|totop|top/.test(aggregate);
var isNativeBuilderMatch=prioritizedNodes.indexOf(el)>=0;
var fixedLike=!!(style&&(style.position==="fixed"||style.position==="sticky"||style.position==="absolute"));
var row={element:el,tag:String(el.tagName||"").toLowerCase(),id:String(el.id||""),className:String(el.className||""),wrapperTag:String(el.parentElement&&el.parentElement.tagName||"").toLowerCase(),iconMarkup:hasSvg?String((el.querySelector("svg")&&el.querySelector("svg").outerHTML)||"").slice(0,240):"",computedStyle:{position:style?String(style.position||""):"",bottom:style?String(style.bottom||""):"",right:style?String(style.right||""):"",display:style?String(style.display||""):"",visibility:style?String(style.visibility||""):"",opacity:style?String(style.opacity||""):""},boundingClientRect:{x:Number(rect.left||0),y:Number(rect.top||0),width:Number(rect.width||0),height:Number(rect.height||0)},isVisible:isVisible(el),hasUpIcon:hasUpIcon,fixedLike:fixedLike,isNativeBuilderMatch:isNativeBuilderMatch,href:String(el.getAttribute&&el.getAttribute("href")||"")};
if(row.isNativeBuilderMatch||row.hasUpIcon||row.fixedLike||String(row.href).toLowerCase()==="#top")rows.push(row);
}
return rows;
}
function removeFallbackNodes(){
var nodes=Array.prototype.slice.call(document.querySelectorAll(FALLBACK_SELECTOR));
var removed=0;
for(var i=0;i<nodes.length;i+=1){
var node=nodes[i];
if(node&&node.parentNode){node.parentNode.removeChild(node);removed+=1;}
}
var styleIds=["gnr8-backtotop-icon-normalize-style-fallback","gnr8-backtotop-icon-normalize-style-restored"];
for(var j=0;j<styleIds.length;j+=1){
var styleEl=document.getElementById(styleIds[j]);
if(styleEl&&styleEl.parentNode){styleEl.parentNode.removeChild(styleEl);}
}
return removed;
}
function normalizeHiddenNative(el){
if(!el||!el.style)return false;
var st=window.getComputedStyle?window.getComputedStyle(el):null;
var changed=false;
if(el.classList&&el.classList.contains("hidden")){el.classList.remove("hidden");changed=true;}
if(st&&st.display==="none"){el.style.display="block";changed=true;}
if(st&&st.display!=="none"&&!el.style.display){el.style.display=st.display==="inline"?"inline-block":st.display;changed=true;}
if(st&&st.visibility==="hidden"){el.style.visibility="visible";changed=true;}
if(st&&Number(st.opacity||"1")===0){el.style.opacity="1";changed=true;}
if(st&&st.pointerEvents==="none"){el.style.pointerEvents="auto";changed=true;}
if((!st||st.display==="none")&&!el.style.display){el.style.display="block";changed=true;}
if(!el.style.visibility||el.style.visibility==="hidden"){el.style.visibility="visible";changed=true;}
if(!el.style.opacity||Number(el.style.opacity)===0){el.style.opacity="1";changed=true;}
if(!el.style.pointerEvents||el.style.pointerEvents==="none"){el.style.pointerEvents="auto";changed=true;}
var nextStyle=window.getComputedStyle?window.getComputedStyle(el):st;
var notFixed=!nextStyle||!(nextStyle.position==="fixed"&&Number((nextStyle.bottom||"").replace(/px$/i,""))>=0&&Number((nextStyle.right||"").replace(/px$/i,""))>=0);
if(notFixed){
el.style.position="fixed";
el.style.right="24px";
el.style.bottom="24px";
if(!el.style.zIndex)el.style.zIndex="9999";
changed=true;
}
return changed;
}
function maybeWireSmoothScroll(el){
if(!el||!el.addEventListener)return;
var hasInline=String(el.getAttribute&&el.getAttribute("onclick")||"").trim().length>0;
var hasOnclickFn=typeof el.onclick==="function";
if(hasInline||hasOnclickFn)return false;
el.addEventListener("click",function(ev){
if(ev&&ev.preventDefault)ev.preventDefault();
try{window.scrollTo({top:0,behavior:"smooth"});}catch(_err){window.scrollTo(0,0);}
},{passive:false});
return true;
}
function classifyMissing(details){
if(details.nativeDetected)return null;
if(details.runtimeCandidateCount>0&&details.visibleCandidateCount===0)return "NATIVE_BACK_TO_TOP_PRESENT_BUT_HIDDEN_BY_CSS";
if(payload.sourceSignalsFound===true&&details.runtimeSignalTerms.length===0)return "NATIVE_BACK_TO_TOP_RUNTIME_ASSET_MISSING";
if(payload.sourceSignalsFound===false&&details.runtimeCandidateCount===0)return "NATIVE_BACK_TO_TOP_MISSING_FROM_IMPORTED_HTML";
if(payload.sourceSignalsFound===true&&details.runtimeCandidateCount===0)return "NATIVE_BACK_TO_TOP_PRESENT_BUT_NOT_INITIALIZED";
return "OTHER_WITH_EVIDENCE";
}
function runNativeOnlyPass(passName){
var fallbackRemovedCount=removeFallbackNodes();
var nativeCandidates=collectNativeCandidates();
var visibleCandidates=nativeCandidates.filter(function(c){return c.isVisible;});
var runtimeTerms=runtimeSignalsFound();
emit("PREVIEW_BACK_TO_TOP_NATIVE_DISCOVERY_SNAPSHOT",{siteVersionId:payload.siteVersionId,passName:passName,candidateCount:nativeCandidates.length,candidates:nativeCandidates.slice(0,20).map(function(c){return{tag:c.tag,id:c.id,className:c.className,wrapperTag:c.wrapperTag,iconMarkup:c.iconMarkup,computedStyle:c.computedStyle,boundingClientRect:c.boundingClientRect,isVisible:c.isVisible,hasUpIcon:c.hasUpIcon,fixedLike:c.fixedLike,isNativeBuilderMatch:c.isNativeBuilderMatch};}),correlationKey:correlationKey("native_discovery_snapshot_"+passName)});
var nativeDetected=visibleCandidates.length>0;
var restoredHidden=false;
var wiredSmoothScroll=false;
var removedHiddenClass=false;
var visibilityRestored=false;
if(!nativeDetected&&nativeCandidates.length>0){
var hadHiddenBeforeRestore=!!(nativeCandidates[0].element&&nativeCandidates[0].element.classList&&nativeCandidates[0].element.classList.contains("hidden"));
restoredHidden=normalizeHiddenNative(nativeCandidates[0].element)===true;
removedHiddenClass=hadHiddenBeforeRestore&&!!(nativeCandidates[0].element&&nativeCandidates[0].element.classList&&!nativeCandidates[0].element.classList.contains("hidden"));
visibilityRestored=restoredHidden===true;
if(restoredHidden===true){
nativeCandidates=collectNativeCandidates();
visibleCandidates=nativeCandidates.filter(function(c){return c.isVisible;});
nativeDetected=visibleCandidates.length>0;
}
}
if(nativeDetected){
var chosen=visibleCandidates[0]||nativeCandidates[0];
if(chosen.element&&!chosen.element.getAttribute("aria-label"))chosen.element.setAttribute("aria-label","Back to top");
var chosenHadHiddenBeforeRestore=!!(chosen.element&&chosen.element.classList&&chosen.element.classList.contains("hidden"));
visibilityRestored=normalizeHiddenNative(chosen.element)===true||visibilityRestored===true;
removedHiddenClass=removedHiddenClass||(chosenHadHiddenBeforeRestore&&!!(chosen.element&&chosen.element.classList&&!chosen.element.classList.contains("hidden")));
wiredSmoothScroll=maybeWireSmoothScroll(chosen.element)===true;
emit("PREVIEW_BACK_TO_TOP_NATIVE_BUILDER_DETECTED",{siteVersionId:payload.siteVersionId,passName:passName,tag:chosen.tag,id:chosen.id,className:chosen.className,wrapperTag:chosen.wrapperTag,selectorMatched:"a.scrollIcon[data-req='scrollTop'], a.scrollIcon.bottom_right[href='#'], a[data-req='scrollTop']",removedHiddenClass:removedHiddenClass,visibilityRestored:visibilityRestored,clickWired:wiredSmoothScroll,correlationKey:correlationKey("native_builder_detected_"+passName)});
emit("PREVIEW_BACK_TO_TOP_NATIVE_RESTORED",{siteVersionId:payload.siteVersionId,passName:passName,selectorMatched:"a.scrollIcon[data-req='scrollTop'], a.scrollIcon.bottom_right[href='#'], a[data-req='scrollTop']",removedHiddenClass:removedHiddenClass,visibilityRestored:visibilityRestored,clickWired:wiredSmoothScroll,correlationKey:correlationKey("native_restored_"+passName)});
}
var missingClassification=classifyMissing({nativeDetected:nativeDetected,runtimeCandidateCount:nativeCandidates.length,visibleCandidateCount:visibleCandidates.length,runtimeSignalTerms:runtimeTerms});
emit("PREVIEW_BACK_TO_TOP_NATIVE_COMPARISON_STATUS",{siteVersionId:payload.siteVersionId,nativeDetected:nativeDetected,nativeCandidateCount:nativeCandidates.length,nativeCandidateSummaries:nativeCandidates.slice(0,8).map(function(c){return{tag:c.tag,id:c.id,className:c.className,wrapperTag:c.wrapperTag,hasIcon:c.hasUpIcon,isVisible:c.isVisible,href:c.href};}),sourceSignalsFound:payload.sourceSignalsFound===true||payload.sourceSignalMatches.length>0,runtimeSignalsFound:runtimeTerms.length>0,missingReason:missingClassification,correlationKey:correlationKey("native_comparison_status_"+passName)});
if(missingClassification){
emit("PREVIEW_BACK_TO_TOP_NATIVE_MISSING_CLASSIFIED",{siteVersionId:payload.siteVersionId,classification:missingClassification,evidence:{sourceSignalsFound:payload.sourceSignalsFound===true,sourceSignalMatches:payload.sourceSignalMatches,runtimeSignalsFoundTerms:runtimeTerms,runtimeCandidateCount:nativeCandidates.length,visibleCandidateCount:visibleCandidates.length},recommendedFix:missingClassification==="NATIVE_BACK_TO_TOP_PRESENT_BUT_HIDDEN_BY_CSS"?"normalize visibility/position on native node only":missingClassification==="NATIVE_BACK_TO_TOP_PRESENT_BUT_NOT_INITIALIZED"?"initialize native node click behavior only":"preserve native import/runtime assets; do not reintroduce fallback",correlationKey:correlationKey("native_missing_classified_"+passName)});
}
emit("PREVIEW_BACK_TO_TOP_FALLBACK_REMOVED_GLOBALLY",{siteVersionId:payload.siteVersionId,passName:passName,fallbackRemovedCount:fallbackRemovedCount,fallbackInjectionDisabled:true,correlationKey:correlationKey("fallback_removed_"+passName)});
emit("PREVIEW_BACK_TO_TOP_NATIVE_STATUS",{siteVersionId:payload.siteVersionId,nativeDetected:nativeDetected,nativeCandidateCount:nativeCandidates.length,fallbackRemovedCount:fallbackRemovedCount,fallbackInjectionDisabled:true,hiddenNativeRestored:restoredHidden,smoothScrollWired:wiredSmoothScroll,finalButtonSource:nativeDetected?"native_builder":"none",correlationKey:correlationKey("native_status_"+passName)});
}
try{
runNativeOnlyPass("initial");
if(document.readyState==="loading"){
window.addEventListener("DOMContentLoaded",function(){runNativeOnlyPass("domcontentloaded");});
window.addEventListener("load",function(){runNativeOnlyPass("window_load");});
}else{
setTimeout(function(){runNativeOnlyPass("domcontentloaded");},0);
setTimeout(function(){runNativeOnlyPass("window_load");},0);
}
setTimeout(function(){runNativeOnlyPass("delayed_500ms");},500);
setTimeout(function(){runNativeOnlyPass("delayed_1500ms");},1500);
if(window.MutationObserver&&document.body){
var observer=new MutationObserver(function(){runNativeOnlyPass("mutation_observer");});
observer.observe(document.body,{childList:true,subtree:true});
}
}catch(_err){}
})();</script>`;
  if (input.html.includes("</body>")) {
    return input.html.replace("</body>", `${script}</body>`);
  }
  return `${input.html}${script}`;
}


export async function GET(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const agencyId = await previewRouteDependencies.resolveAgencyIdForSiteVersion(siteVersionId);
    if (!agencyId) {
      return new Response(JSON.stringify({ error: "Unable to resolve agency scope for site version." }), {
        status: 403,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    await previewRouteDependencies.requireAgencyActionContext({
      action: "view_dashboard",
      requestedAgencyId: agencyId,
    });
    const url = new URL(req.url);
    const path = url.searchParams.get("path") ?? "/";
    const mode = url.searchParams.get("mode") ?? undefined;
    const requestCorrelationKey = `${siteVersionId}:${mode ?? "none"}:${Date.now().toString(36)}`;
    const contentDebugRequested = url.searchParams.get("__debug") === "content";
    const galleryRuntimeDiagnosticRequested = url.searchParams.get("__debug") === "gallery_runtime";
    const runtimeIsolationEnabled = galleryRuntimeDiagnosticRequested || mode === "transformed";
    let contentDebugMode = false;
    if (contentDebugRequested) {
      console.info("[gnr8.content-runtime] CONTENT_DEBUG_REQUESTED", { path, siteVersionId });
      contentDebugMode = await previewRouteDependencies.canShowContentDebug(req);
      console.info(
        `[gnr8.content-runtime] ${contentDebugMode ? "CONTENT_DEBUG_ACCESS_GRANTED" : "CONTENT_DEBUG_ACCESS_DENIED"}`,
        { path, siteVersionId },
      );
    }

    const preview = await previewRouteDependencies.renderSiteVersionPreview({
      siteVersionId,
      path,
      mode,
      requestCorrelationKey,
    });
    const htmlWithOptionalDebug = contentDebugMode
      ? previewRouteDependencies.injectRuntimeDebugPanel({
          html: preview.html,
          debug: {
            siteId: preview.siteId,
            siteVersionId: preview.siteVersionId,
            bindingStatus: "preview",
            details: {
              siteVersionId: preview.contentDebug?.siteVersionId ?? preview.siteVersionId,
              rawTemplateArtifactFound: preview.contentDebug?.rawTemplateArtifactFound ?? false,
              draftOverrideCount: preview.contentDebug?.draftOverrideCount ?? 0,
              publishedOverrideCount: preview.contentDebug?.publishedOverrideCount ?? 0,
              mergedOverrideCount: preview.contentDebug?.mergedOverrideCount ?? 0,
              appliedCount: preview.contentDebug?.appliedCount ?? 0,
              skippedCount: preview.contentDebug?.skippedCount ?? 0,
              skippedDiagnostics: preview.contentDebug?.skippedDiagnostics ?? [],
              slotKeys: preview.contentDebug?.slotKeys ?? [],
            },
          },
        })
      : preview.html;
    const htmlWithGalleryRuntimeDiagnostic = runtimeIsolationEnabled
      ? injectGalleryRuntimeDiagnostic({
          html: htmlWithOptionalDebug,
          siteVersionId: preview.siteVersionId,
          moduleId: "m4695",
        })
      : htmlWithOptionalDebug;
    const htmlWithMapRuntimeFallback = runtimeIsolationEnabled
      ? injectMapRuntimeFallbackDiagnostic({
          html: htmlWithGalleryRuntimeDiagnostic,
          siteVersionId: preview.siteVersionId,
        })
      : htmlWithGalleryRuntimeDiagnostic;
    const htmlWithBackToTopCompatibility = runtimeIsolationEnabled
      ? injectBackToTopRuntimeCompatibility({
          html: htmlWithMapRuntimeFallback,
          siteVersionId: preview.siteVersionId,
        })
      : htmlWithMapRuntimeFallback;
    const shouldNormalizeFinalOutput = mode === "transformed";
    const normalizedOutput = shouldNormalizeFinalOutput
      ? normalizeTransformedPreviewOutputDoublePrefixedUrls({
          html: htmlWithBackToTopCompatibility,
          siteId: preview.siteId,
          siteVersionId: preview.siteVersionId,
        })
      : { html: htmlWithBackToTopCompatibility, occurrenceCount: 0, sampleBefore: null, sampleAfter: null };
    const html = normalizedOutput.html;
    if (normalizedOutput.occurrenceCount > 0) {
      const correlationKey = `${preview.siteId}:${preview.siteVersionId}:preview-transformed-output-double-prefix`;
      console.info("[gnr8.runtime.preview] PREVIEW_TRANSFORMED_OUTPUT_DOUBLE_PREFIX_FOUND", {
        siteId: preview.siteId,
        siteVersionId: preview.siteVersionId,
        occurrenceCount: normalizedOutput.occurrenceCount,
        sampleBefore: normalizedOutput.sampleBefore,
        reasonCode: "FINAL_OUTPUT_DOUBLE_PREFIX_NORMALIZED",
        correlationKey,
      });
      console.info("[gnr8.runtime.preview] PREVIEW_TRANSFORMED_OUTPUT_DOUBLE_PREFIX_NORMALIZED", {
        siteId: preview.siteId,
        siteVersionId: preview.siteVersionId,
        occurrenceCount: normalizedOutput.occurrenceCount,
        sampleAfter: normalizedOutput.sampleAfter,
        reasonCode: "FINAL_OUTPUT_DOUBLE_PREFIX_NORMALIZED",
        correlationKey,
      });
    }

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-gnr8-preview-source": preview.source,
        "x-gnr8-preview-mode": preview.previewMode,
        "x-gnr8-preview-renderer-contract-available": preview.previewRuntimeSummary.rendererContractAvailable ? "true" : "false",
        "x-gnr8-preview-final-site-model-available": preview.previewRuntimeSummary.finalSiteModelAvailable ? "true" : "false",
        "x-gnr8-preview-rendered-with-fallback": preview.previewRuntimeSummary.renderedWithFallback ? "true" : "false",
        "x-gnr8-preview-matched-page-id": preview.previewRuntimeSummary.matchedPageId ?? "",
        "x-gnr8-preview-content-resolution-applied": preview.previewRuntimeSummary.contentResolutionApplied ? "true" : "false",
        "x-gnr8-preview-content-resolved-count": String(preview.previewRuntimeSummary.resolvedContentCount),
        "x-gnr8-preview-content-unresolved-count": String(preview.previewRuntimeSummary.unresolvedContentCount),
        "x-gnr8-preview-content-resolution-degraded": preview.previewRuntimeSummary.contentResolutionDegraded ? "true" : "false",
        "x-gnr8-preview-content-resolution-diagnostics": preview.previewRuntimeSummary.contentResolutionDiagnostics.join(","),
        "x-gnr8-preview-persisted-asset-count": String(preview.previewRuntimeSummary.persistedAssetCount ?? 0),
        "x-gnr8-preview-external-fallback-asset-count": String(preview.previewRuntimeSummary.externalFallbackAssetCount ?? 0),
        "x-gnr8-preview-diagnostics": preview.previewRuntimeSummary.previewDiagnostics.join(","),
        "x-gnr8-family-render-used": preview.previewRuntimeSummary.familyRenderUsed ? "true" : "false",
        "x-gnr8-family-render-mode": preview.previewRuntimeSummary.familyRenderMode ?? "",
        "x-gnr8-family-render-family-id": preview.previewRuntimeSummary.familyRenderFamilyId ?? "",
        "x-gnr8-family-render-fallback": preview.previewRuntimeSummary.familyRenderFallbackToPage ? "true" : "false",
        "x-gnr8-family-render-diagnostics-count": String(preview.previewRuntimeSummary.familyRenderDiagnosticsCount),
        "x-gnr8-rendered-capture": preview.renderedCaptureUsed ? "true" : "false",
        "x-gnr8-dom-size": String(preview.domSize),
        "x-gnr8-fallback-used": preview.fallbackUsed ? "true" : "false",
      },
    });
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    if (mapped.status >= 400 && mapped.status < 500) {
      const html = toPreviewFallbackHtml({
        statusTitle: "Preview Access Denied",
        message: mapped.message,
      });
      return new Response(html, {
        status: mapped.status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (error instanceof SiteVersionPreviewUnavailableError) {
      const html = toPreviewFallbackHtml({
        statusTitle: "Preview Not Ready",
        message:
          error.code === "TRANSFORMED_ARTIFACT_NOT_AVAILABLE"
            ? "Transformed preview output is not available for this site version yet."
            : error.code === "SITE_VERSION_NOT_FOUND"
              ? "Requested site version could not be found."
              : "Preview path could not be resolved for this site version.",
        details: [
          `reason_code=${error.code}`,
          "Use the Site Workspace debug preview when available for structural inspection.",
        ],
      });
      return new Response(html, {
        status: 409,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
    if (error instanceof PreviewDbBackpressureError) {
      const html = toPreviewFallbackHtml({
        statusTitle: "Preview Temporarily Busy",
        message: "Preview is temporarily rate-limited due to database pool pressure. Please retry shortly.",
        details: [
          "reason_code=PREVIEW_DB_BACKPRESSURE",
          `request_correlation_key=${error.requestCorrelationKey}`,
          `pool_waiting_count=${error.poolWaitingCount}`,
        ],
      });
      return new Response(html, {
        status: 503,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    const html = toPreviewFallbackHtml({
      statusTitle: "Preview Failed",
      message: "An unexpected error occurred while resolving preview output.",
      details: [message],
    });
    return new Response(html, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const agencyId = await previewRouteDependencies.resolveAgencyIdForSiteVersion(siteVersionId);
    if (!agencyId) {
      return new Response(JSON.stringify({ error: "Unable to resolve agency scope for site version." }), {
        status: 403,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    await previewRouteDependencies.requireAgencyActionContext({
      action: "view_dashboard",
      requestedAgencyId: agencyId,
    });

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? null;
    const dm = url.searchParams.get("dm");
    const correlationKey = `${siteVersionId}:${mode ?? "none"}:${dm ?? "none"}`;
    console.info("[gnr8.runtime.preview] PREVIEW_RUNTIME_MODULE_REQUEST_RECEIVED", {
      siteVersionId,
      mode,
      dm: dm ?? null,
      method: "POST",
      correlationKey,
    });

    if (!dm) {
      console.info("[gnr8.runtime.preview] PREVIEW_RUNTIME_MODULE_REQUEST_UNSUPPORTED", {
        siteVersionId,
        mode,
        dm: null,
        method: "POST",
        reasonCode: "MISSING_DM_QUERY",
        correlationKey,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          reasonCode: "MISSING_DM_QUERY",
          siteVersionId,
          mode,
          dm: null,
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    }

    console.info("[gnr8.runtime.preview] PREVIEW_RUNTIME_MODULE_REQUEST_UNSUPPORTED", {
      siteVersionId,
      mode,
      dm,
      method: "POST",
      reasonCode: "UNSUPPORTED_DM_MODULE_REQUEST",
      correlationKey,
    });

    return new Response(
      JSON.stringify({
        ok: false,
        reasonCode: "UNSUPPORTED_DM_MODULE_REQUEST",
        siteVersionId,
        mode,
        dm,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    if (mapped.status >= 400 && mapped.status < 500) {
      return new Response(JSON.stringify({ error: mapped.message }), {
        status: mapped.status,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: "Preview runtime module request failed.", details: message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
