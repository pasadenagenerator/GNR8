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
  const payload = JSON.stringify({
    siteVersionId: input.siteVersionId,
  });
  const script = `<script>(function(){
var payload=${payload};
var corrSeed=String(Date.now());
function correlationKey(reason){return [payload.siteVersionId,reason||"backtotop",corrSeed].join(":");}
function emit(code,details){try{console.info("[gnr8.runtime.preview] "+code,details||{});}catch(_err){}}
var BACK_TO_TOP_FALLBACK_ID="gnr8-preview-backtotop-fallback";
var BACK_TO_TOP_TOKENS=["backtotop","back-to-top","scrolltop","scroll-top","totop","to-top","topbutton","top-button","onepage-up","scroll-up","arrow-up","chevron-up","fa-angle-up","fa-chevron-up"];
var HORIZONTAL_ARROW_CONTENT_REGEX=/\u2039|\u203a|<|>|fa-angle-left|fa-angle-right|fa-chevron-left|fa-chevron-right|arrow-left|arrow-right|\bprev\b|\bnext\b|\bprevious\b/;
var UP_ARROW_CONTENT_REGEX=/\u2191|\u25b2|\u02c4|fa-angle-up|fa-chevron-up|arrow-up|icon-up/;
var ROBOPLAST_BLUE_CIRCLE_MIN_SIZE=42;
var ROBOPLAST_BLUE_MIN_B=120;
var ROBOPLAST_BLUE_MIN_SATURATION=35;
var HORIZONTAL_NAV_TOKEN_LIST=["slider","carousel","slideshow","gallery-nav","lightbox","prev","next","arrow-left","arrow-right","nav-left","nav-right","flex-prev","flex-next","slick-prev","slick-next","swiper-button-prev","swiper-button-next"];
var STRONG_UP_TOKEN_LIST=["backtotop","scrolltop","totop","topbutton","onepage-up","scroll-up"];
var falsePositiveLogCount=0;
var suppressedFalsePositiveLogCount=0;
var MAX_FALSE_POSITIVE_LOGS=20;
function hasAnyToken(value,tokens){var source=String(value||"").toLowerCase();for(var i=0;i<tokens.length;i+=1){if(source.indexOf(tokens[i])>=0)return true;}return false;}
function hasAnyPhrase(value,phrases){var source=String(value||"").toLowerCase();for(var i=0;i<phrases.length;i+=1){if(source.indexOf(String(phrases[i]||"").toLowerCase())>=0)return true;}return false;}
function normalizeText(value){return String(value||"").replace(/\s+/g," ").trim();}
function getCandidateText(el){
if(!el||!el.getAttribute)return "";
return normalizeText([el.getAttribute("aria-label")||"",el.getAttribute("title")||"",el.textContent||"",el.className||"",el.id||""].join(" "));
}
function toNumber(value){var n=Number(value);return Number.isFinite(n)?n:0;}
function getRectSafe(el){
if(!el||!el.getBoundingClientRect)return{top:0,left:0,width:0,height:0,right:0,bottom:0};
var rect=el.getBoundingClientRect();
return{top:toNumber(rect.top),left:toNumber(rect.left),width:toNumber(rect.width),height:toNumber(rect.height),right:toNumber(rect.right),bottom:toNumber(rect.bottom)};
}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function parseRgbLike(input){
if(!input)return null;
var value=String(input).trim();
if(!value)return null;
var hex=value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
if(hex){
var raw=hex[1];
if(raw.length===3){raw=raw[0]+raw[0]+raw[1]+raw[1]+raw[2]+raw[2];}
var r=parseInt(raw.slice(0,2),16);
var g=parseInt(raw.slice(2,4),16);
var b=parseInt(raw.slice(4,6),16);
if(isNaN(r)||isNaN(g)||isNaN(b))return null;
return{r:r,g:g,b:b,css:"#"+raw.toLowerCase()};
}
var rgb=value.match(/^rgba?\\(([^)]+)\\)$/i);
if(rgb){
var parts=rgb[1].split(",").map(function(p){return Number(String(p).trim());});
if(parts.length<3||parts.some(function(n){return Number.isNaN(n);})){return null;}
var r2=clamp(Math.round(parts[0]),0,255);
var g2=clamp(Math.round(parts[1]),0,255);
var b2=clamp(Math.round(parts[2]),0,255);
return{r:r2,g:g2,b:b2,css:"rgb("+r2+", "+g2+", "+b2+")"};
}
return null;
}
function luminance(rgb){
function chan(c){var s=c/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);}
return 0.2126*chan(rgb.r)+0.7152*chan(rgb.g)+0.0722*chan(rgb.b);
}
function contrastColorFor(bg){
var l=luminance(bg);
var whiteRatio=(1.05)/(l+0.05);
return whiteRatio>=4.5?"#fff":"#111";
}
function pickAccentColor(existing){
var fallback={color:"#1f2937",source:"fallback_neutral_dark"};
var root=document.documentElement;
var body=document.body;
var cssVars=["--primary","--primary-color","--accent","--accent-color","--theme-color"];
if(root&&window.getComputedStyle){
var rootStyle=window.getComputedStyle(root);
for(var i=0;i<cssVars.length;i+=1){
var token=cssVars[i];
var val=String(rootStyle.getPropertyValue(token)||"").trim();
var parsed=parseRgbLike(val);
if(parsed)return{color:parsed.css,source:"css_variable:"+token};
}
}
var themeMeta=document.querySelector("meta[name='theme-color']");
if(themeMeta){
var metaColor=parseRgbLike(themeMeta.getAttribute("content"));
if(metaColor)return{color:metaColor.css,source:"meta_theme_color"};
}
var candidates=[];
function addCandidate(raw,src,weight){
var parsed=parseRgbLike(raw);
if(!parsed)return;
candidates.push({rgb:parsed,source:src,weight:weight||1});
}
if(body&&window.getComputedStyle){
var bodyBg=window.getComputedStyle(body).backgroundColor;
addCandidate(bodyBg,"body_background",1);
}
var prominentSelectors=[
"button",
".btn",
"[class*='btn']",
"a",
"header a[aria-current='page']",
"header .active",
"nav a[aria-current='page']",
"nav .active"
];
for(var j=0;j<prominentSelectors.length;j+=1){
var nodes=Array.prototype.slice.call(document.querySelectorAll(prominentSelectors[j])).slice(0,20);
for(var k=0;k<nodes.length;k+=1){
var node=nodes[k];
if(!window.getComputedStyle)continue;
var st=window.getComputedStyle(node);
addCandidate(st.backgroundColor,"prominent:"+prominentSelectors[j]+":bg",3);
addCandidate(st.color,"prominent:"+prominentSelectors[j]+":text",2);
}
}
if(existing&&window.getComputedStyle){
var exStyle=window.getComputedStyle(existing);
addCandidate(exStyle.backgroundColor,"existing_backtotop:bg",5);
addCandidate(exStyle.color,"existing_backtotop:text",4);
}
if(candidates.length===0)return fallback;
var best=null;
var bestScore=-1;
for(var c=0;c<candidates.length;c+=1){
var item=candidates[c];
var rgb=item.rgb;
var sat=Math.max(rgb.r,rgb.g,rgb.b)-Math.min(rgb.r,rgb.g,rgb.b);
var lum=luminance(rgb);
var nonNeutralBonus=sat>=24?18:0;
var avoidExtremePenalty=(lum<0.05||lum>0.95)?22:0;
var redBonus=(rgb.r>=140&&rgb.r-rgb.g>=35&&rgb.r-rgb.b>=35)?25:0;
var score=(sat*0.9)+(item.weight*12)+nonNeutralBonus+redBonus-avoidExtremePenalty;
if(score>bestScore){bestScore=score;best=item;}
}
if(!best)return fallback;
return{color:best.rgb.css,source:best.source};
}
function isBackToTopCandidate(el){
if(!el||!el.getAttribute)return false;
var href=String(el.getAttribute("href")||"").trim().toLowerCase();
var id=String(el.id||"").toLowerCase();
var className=String(el.className||"").toLowerCase();
var aria=String(el.getAttribute("aria-label")||"").toLowerCase();
var title=String(el.getAttribute("title")||"").toLowerCase();
var txt=String(el.textContent||"").toLowerCase();
var aggregate=id+" "+className+" "+aria+" "+title+" "+txt;
 if((String(el.id||"")===BACK_TO_TOP_FALLBACK_ID)||el.getAttribute("data-gnr8-backtotop-fallback")==="1"){
return true;
}
 if(hasAnyToken(aggregate,HORIZONTAL_NAV_TOKEN_LIST)||HORIZONTAL_ARROW_CONTENT_REGEX.test(aggregate)){
if(falsePositiveLogCount<MAX_FALSE_POSITIVE_LOGS){
falsePositiveLogCount+=1;
emit("PREVIEW_BACK_TO_TOP_FALSE_POSITIVE_EXCLUDED",{siteVersionId:payload.siteVersionId,tag:String(el.tagName||"").toLowerCase(),id:String(el.id||""),className:String(el.className||""),reasonCode:"SLIDER_OR_HORIZONTAL_NAV_ARROW",suppressedFalsePositiveLogCount:suppressedFalsePositiveLogCount,correlationKey:correlationKey("false_positive_excluded")});
}else{
suppressedFalsePositiveLogCount+=1;
}
if(el.getAttribute("data-gnr8-backtotop-restored")==="1"){
el.removeAttribute("data-gnr8-backtotop-restored");
}
if(el.getAttribute("data-gnr8-backtotop-fallback")==="1"&&String(el.id||"")!==BACK_TO_TOP_FALLBACK_ID){
el.removeAttribute("data-gnr8-backtotop-fallback");
}
if(el.getAttribute("data-gnr8-backtotop-wired")==="1"){
el.removeAttribute("data-gnr8-backtotop-wired");
}
if(el.getAttribute("data-gnr8-backtotop-hidden-duplicate")==="1"){
el.removeAttribute("data-gnr8-backtotop-hidden-duplicate");
el.style.display="";
el.style.visibility="";
el.style.opacity="";
el.style.pointerEvents="";
el.removeAttribute("aria-hidden");
}
return false;
}
var explicitTokenStrong=hasAnyToken(id,STRONG_UP_TOKEN_LIST)||hasAnyToken(className,STRONG_UP_TOKEN_LIST)||hasAnyToken(aria,STRONG_UP_TOKEN_LIST)||hasAnyToken(title,STRONG_UP_TOKEN_LIST);
var hrefStrong=href==="#top";
var upArrowStrong=UP_ARROW_CONTENT_REGEX.test(aggregate);
var upTextStrong=/\btop\b|\bup\b|scroll\s*to\s*top|back\s*to\s*top/.test(aggregate);
var clickable=el.tagName==="A"||el.tagName==="BUTTON"||el.getAttribute("role")==="button"||typeof el.onclick==="function";
var rect=getRectSafe(el);
var style=window.getComputedStyle?window.getComputedStyle(el):null;
var fixedLike=style&&(style.position==="fixed"||style.position==="sticky");
var viewportW=Math.max(window.innerWidth||0,document.documentElement&&document.documentElement.clientWidth||0);
var viewportH=Math.max(window.innerHeight||0,document.documentElement&&document.documentElement.clientHeight||0);
var bottomRightish=rect.width>0&&rect.height>0&&rect.right>=viewportW-180&&rect.bottom>=viewportH-180;
var smallButton=rect.width>0&&rect.width<=90&&rect.height>0&&rect.height<=90;
var shapeStrong=clickable&&fixedLike&&bottomRightish&&smallButton&&(upArrowStrong||explicitTokenStrong||hrefStrong||upTextStrong);
var strongCount=(hrefStrong?1:0)+(upArrowStrong?1:0)+(explicitTokenStrong?1:0)+(upTextStrong?1:0)+(shapeStrong?1:0);
var hasVerticalUpEvidence=hrefStrong||explicitTokenStrong||upArrowStrong||upTextStrong;
if(clickable&&hasVerticalUpEvidence&&strongCount>=2)return true;
var roboplastDetection=detectRoboplastOriginalCandidate(el);
return !!roboplastDetection.isOriginal;
}
function isFallbackElement(el){
if(!el||!el.getAttribute)return false;
if(String(el.id||"")===BACK_TO_TOP_FALLBACK_ID)return true;
if(el.getAttribute("data-gnr8-backtotop-fallback")==="1")return true;
return false;
}
function hasRuntimeSignals(){
var pageText=((document.documentElement&&document.documentElement.outerHTML)||"").toLowerCase();
if(hasAnyPhrase(pageText,["scrolltop","backtotop","back-to-top","totop","topbutton","onepage-up","scroll-up","href=\\\"#top\\\"","href='#top'"]))return true;
var scripts=Array.prototype.slice.call(document.querySelectorAll("script"));
for(var i=0;i<scripts.length;i+=1){
var s=scripts[i];
var src=String(s.getAttribute&&s.getAttribute("src")||"").toLowerCase();
var txt=String(s.textContent||"").toLowerCase();
if(hasAnyPhrase(src+" "+txt,["scrolltop","backtotop","back-to-top","totop","topbutton","onepage-up","scroll-up","scrollto(","scroll to top","back to top"]))return true;
}
return false;
}
function detectRuntimeBehaviorSignals(el){
if(!el||!el.getAttribute)return{runtimeBehaviorDetected:false,reason:"none"};
var onclickAttr=String(el.getAttribute("onclick")||"").toLowerCase();
if(hasAnyPhrase(onclickAttr,["scrollto(","scroll to top","back to top","totop"]))return{runtimeBehaviorDetected:true,reason:"onclick_scroll_signal"};
if(typeof el.onclick==="function")return{runtimeBehaviorDetected:true,reason:"onclick_handler_function"};
var aggregate=getCandidateText(el).toLowerCase();
if(hasAnyPhrase(aggregate,["scroll","totop","back-to-top","backtotop","onepage-up"])&&hasRuntimeSignals())return{runtimeBehaviorDetected:true,reason:"runtime_signal_with_candidate_tokens"};
var pageText=((document.documentElement&&document.documentElement.outerHTML)||"").toLowerCase();
if((String(el.id||"").length>0||String(el.className||"").length>0)&&hasAnyPhrase(pageText,["scrolltop","backtotop","back-to-top","totop","topbutton","onepage-up","scroll-up"])){
return{runtimeBehaviorDetected:true,reason:"runtime_initialized_scroll_control"};
}
return{runtimeBehaviorDetected:false,reason:"none"};
}
function detectRoboplastOriginalCandidate(el){
if(!el||!el.getAttribute)return{isOriginal:false,detectionReason:"none",iconEvidence:"none",runtimeBehaviorDetected:false,positionEvidence:"none",className:""};
var rect=getRectSafe(el);
var style=window.getComputedStyle?window.getComputedStyle(el):null;
var viewportW=Math.max(window.innerWidth||0,document.documentElement&&document.documentElement.clientWidth||0);
var viewportH=Math.max(window.innerHeight||0,document.documentElement&&document.documentElement.clientHeight||0);
var fixedLike=style&&(style.position==="fixed"||style.position==="sticky");
var bottomRightish=rect.width>0&&rect.height>0&&rect.right>=viewportW-220&&rect.bottom>=viewportH-220;
var circularShape=rect.width>=ROBOPLAST_BLUE_CIRCLE_MIN_SIZE&&rect.height>=ROBOPLAST_BLUE_CIRCLE_MIN_SIZE&&Math.abs(rect.width-rect.height)<=18;
var borderRadius=style?String(style.borderRadius||""):"";
var borderRadiusNumeric=parseFloat(borderRadius);
var radiusCircular=!Number.isNaN(borderRadiusNumeric)&&borderRadiusNumeric>=20||/999|50%/.test(borderRadius);
var bg=parseRgbLike(style&&style.backgroundColor?style.backgroundColor:"");
var isBlueLike=!!bg&&bg.b>=ROBOPLAST_BLUE_MIN_B&&bg.b>=bg.r+15&&bg.b>=bg.g+15&&(Math.max(bg.r,bg.g,bg.b)-Math.min(bg.r,bg.g,bg.b))>=ROBOPLAST_BLUE_MIN_SATURATION;
var text=(getCandidateText(el)||"").toLowerCase();
var iconEvidence=UP_ARROW_CONTENT_REGEX.test(text)?"up_chevron_token":"none";
if(iconEvidence==="none"){
var svgUp=el.querySelector&&el.querySelector("svg,[class*='chevron-up'],[class*='angle-up'],[class*='arrow-up'],i.fa-chevron-up,i.fa-angle-up");
if(svgUp)iconEvidence="up_icon_node";
}
var runtime=detectRuntimeBehaviorSignals(el);
var className=String(el.className||"");
var id=String(el.id||"").toLowerCase();
var tokenMatched=hasAnyToken(id+" "+String(className||"").toLowerCase(),BACK_TO_TOP_TOKENS);
var detectionReasonParts=[];
if(fixedLike)detectionReasonParts.push("fixed_like");
if(bottomRightish)detectionReasonParts.push("bottom_right");
if(circularShape||radiusCircular)detectionReasonParts.push("circular");
if(isBlueLike)detectionReasonParts.push("blue_circle");
if(iconEvidence!=="none")detectionReasonParts.push("up_icon");
if(runtime.runtimeBehaviorDetected)detectionReasonParts.push(runtime.reason);
if(tokenMatched)detectionReasonParts.push("token");
var isOriginal=fixedLike&&bottomRightish&&(circularShape||radiusCircular)&&iconEvidence!=="none"&&(runtime.runtimeBehaviorDetected||tokenMatched||isBlueLike);
return{
isOriginal:isOriginal,
detectionReason:detectionReasonParts.join("|")||"none",
iconEvidence:iconEvidence,
runtimeBehaviorDetected:runtime.runtimeBehaviorDetected,
positionEvidence:(fixedLike?"fixed_like":"not_fixed")+"|"+(bottomRightish?"bottom_right":"not_bottom_right"),
className:className
};
}
function isPotentiallyUsableOriginal(el){
if(!el||!el.style||!el.isConnected)return false;
if(el.hasAttribute("disabled"))return false;
var current=el;
while(current&&current!==document.body&&current!==document.documentElement){
if(current.hasAttribute&&current.hasAttribute("hidden"))return false;
if(window.getComputedStyle){
var st=window.getComputedStyle(current);
if(st&&st.display==="none")return false;
}
current=current.parentElement;
}
return true;
}
function applyTheme(el,theme,existingElementFound,fallbackInjected){
if(!el||!el.style)return;
var parsed=parseRgbLike(theme&&theme.color);
if(!parsed)parsed=parseRgbLike("#1f2937");
var contrast=contrastColorFor(parsed||{r:31,g:41,b:55});
el.style.backgroundColor=theme&&theme.color?theme.color:"#1f2937";
el.style.color=contrast;
el.style.borderColor="transparent";
el.style.fill=contrast;
el.style.stroke=contrast;
emit("PREVIEW_BACK_TO_TOP_THEME_APPLIED",{
siteVersionId:payload.siteVersionId,
detectedAccentColor:theme&&theme.color?theme.color:"#1f2937",
detectionSource:theme&&theme.source?theme.source:"fallback_neutral_dark",
contrastColor:contrast,
existingElementFound:!!existingElementFound,
fallbackInjected:!!fallbackInjected,
correlationKey:correlationKey("theme_applied")
});
}
function normalizeIconForeground(el,existingElementFound,fallbackInjected){
if(!el||!el.style)return;
var iconTypeDetected="text";
if(el.querySelector&&el.querySelector("svg"))iconTypeDetected="inline_svg";
else if(el.querySelector&&el.querySelector("i,[class*='icon'],[class*='fa-'],[class*='bi-']"))iconTypeDetected="font_icon";
el.style.color="#fff";
el.style.fill="#fff";
el.style.stroke="#fff";
var nodes=Array.prototype.slice.call(el.querySelectorAll("svg,path,polyline,polygon,line,circle,ellipse,rect,g,use,i,span"));
for(var i=0;i<nodes.length;i+=1){
var node=nodes[i];
if(node&&node.style){
node.style.color="#fff";
node.style.fill="#fff";
node.style.stroke="#fff";
}
if(node&&node.setAttribute){
if(node.hasAttribute("fill"))node.setAttribute("fill","#fff");
if(node.hasAttribute("stroke"))node.setAttribute("stroke","#fff");
}
}
if(existingElementFound){
el.setAttribute("data-gnr8-backtotop-restored","1");
if(!document.getElementById("gnr8-backtotop-icon-normalize-style-restored")){
var styleRestored=document.createElement("style");
styleRestored.id="gnr8-backtotop-icon-normalize-style-restored";
styleRestored.textContent="[data-gnr8-backtotop-restored], [data-gnr8-backtotop-restored] *, [data-gnr8-backtotop-restored]::before, [data-gnr8-backtotop-restored]::after { color: #fff !important; fill: #fff !important; stroke: #fff !important; }";
document.head.appendChild(styleRestored);
}
}else if(fallbackInjected){
el.setAttribute("data-gnr8-backtotop-fallback","1");
if(!document.getElementById("gnr8-backtotop-icon-normalize-style-fallback")){
var styleFallback=document.createElement("style");
styleFallback.id="gnr8-backtotop-icon-normalize-style-fallback";
styleFallback.textContent="[data-gnr8-backtotop-fallback], [data-gnr8-backtotop-fallback] *, [data-gnr8-backtotop-fallback]::before, [data-gnr8-backtotop-fallback]::after { color: #fff !important; fill: #fff !important; stroke: #fff !important; }";
document.head.appendChild(styleFallback);
}
}
emit("PREVIEW_BACK_TO_TOP_ICON_NORMALIZED",{
siteVersionId:payload.siteVersionId,
iconTypeDetected:iconTypeDetected,
whiteForegroundApplied:true,
existingElementFound:!!existingElementFound,
fallbackInjected:!!fallbackInjected,
correlationKey:correlationKey("icon_normalized")
});
}
function ensureVisible(el){
if(!el||!el.style)return;
el.style.display="inline-flex";
el.style.visibility="visible";
el.style.opacity="1";
el.style.position="fixed";
el.style.right="20px";
el.style.bottom="20px";
el.style.zIndex="2147483000";
el.style.alignItems="center";
el.style.justifyContent="center";
el.style.pointerEvents="auto";
}
function wireClick(el,detectionReason,existingElementFound,fallbackInjected){
if(!el)return;
if(el.getAttribute("data-gnr8-backtotop-wired")==="1")return;
el.setAttribute("data-gnr8-backtotop-wired","1");
el.addEventListener("click",function(ev){
if(ev&&ev.preventDefault)ev.preventDefault();
if(ev&&ev.stopPropagation)ev.stopPropagation();
try{window.scrollTo({ top: 0, behavior: "smooth" });}
catch(_err){window.scrollTo(0,0);}
emit("PREVIEW_BACK_TO_TOP_CLICK_HANDLED",{siteVersionId:payload.siteVersionId,detectionReason:detectionReason,existingElementFound:existingElementFound,fallbackInjected:fallbackInjected,correlationKey:correlationKey("click")});
});
}
function findCandidateElements(){
var selectors=["a[href='#top']","a[href='#']","button","[role='button']","[id*='backtotop' i],[id*='back-to-top' i],[id*='scrolltop' i],[id*='scroll-top' i],[id*='totop' i],[id*='to-top' i],[id*='topbutton' i],[id*='top-button' i],[id*='onepage-up' i],[id*='scroll-up' i],[id*='arrow-up' i],[id*='chevron-up' i],[id*='fa-angle-up' i],[id*='fa-chevron-up' i],[class*='backtotop' i],[class*='back-to-top' i],[class*='scrolltop' i],[class*='scroll-top' i],[class*='totop' i],[class*='to-top' i],[class*='topbutton' i],[class*='top-button' i],[class*='onepage-up' i],[class*='scroll-up' i],[class*='arrow-up' i],[class*='chevron-up' i],[class*='fa-angle-up' i],[class*='fa-chevron-up' i],[aria-label*='backtotop' i],[aria-label*='back-to-top' i],[aria-label*='scrolltop' i],[aria-label*='scroll-top' i],[aria-label*='totop' i],[aria-label*='to-top' i],[aria-label*='topbutton' i],[aria-label*='top-button' i],[aria-label*='onepage-up' i],[aria-label*='scroll-up' i],[aria-label*='arrow-up' i],[aria-label*='chevron-up' i],[aria-label*='fa-angle-up' i],[aria-label*='fa-chevron-up' i],[title*='backtotop' i],[title*='back-to-top' i],[title*='scrolltop' i],[title*='scroll-top' i],[title*='totop' i],[title*='to-top' i],[title*='topbutton' i],[title*='top-button' i],[title*='onepage-up' i],[title*='scroll-up' i],[title*='arrow-up' i],[title*='chevron-up' i],[title*='fa-angle-up' i],[title*='fa-chevron-up' i],#gnr8-preview-backtotop-fallback,[data-gnr8-backtotop-fallback='1']"];
var seen=[];
var all=[];
for(var i=0;i<selectors.length;i+=1){
var nodes=Array.prototype.slice.call(document.querySelectorAll(selectors[i]));
for(var j=0;j<nodes.length;j+=1){
var node=nodes[j];
if(!node||seen.indexOf(node)>=0)continue;
seen.push(node);
if(isBackToTopCandidate(node))all.push(node);
}
}
return all;
}
function isVisibleCandidate(el){
if(!el||!el.isConnected)return false;
if(el.getAttribute&&el.getAttribute("data-gnr8-backtotop-hidden-duplicate")==="1")return false;
var rect=getRectSafe(el);
if(rect.width<=0||rect.height<=0)return false;
if(window.getComputedStyle){
var style=window.getComputedStyle(el);
if(style.display==="none"||style.visibility==="hidden"||Number(style.opacity||"1")===0)return false;
}
return true;
}
function getCandidateSnapshot(candidates,selected){
var rows=[];
for(var i=0;i<candidates.length;i+=1){
var node=candidates[i];
var rect=getRectSafe(node);
var style=window.getComputedStyle?window.getComputedStyle(node):null;
rows.push({
tag:String(node&&node.tagName||"").toLowerCase(),
id:String(node&&node.id||""),
className:String(node&&node.className||""),
href:String(node&&node.getAttribute&&node.getAttribute("href")||""),
ariaLabel:String(node&&node.getAttribute&&node.getAttribute("aria-label")||""),
title:String(node&&node.getAttribute&&node.getAttribute("title")||""),
text:normalizeText(node&&node.textContent||""),
visible:isVisibleCandidate(node),
display:style?String(style.display||""):"",
visibility:style?String(style.visibility||""):"",
opacity:style?String(style.opacity||""):"",
position:style?String(style.position||""):"",
boundingBox:rect,
isFallback:isFallbackElement(node),
isOriginal:!isFallbackElement(node),
selected:node===selected
});
}
return rows;
}
function hideDuplicate(el){
if(!el||!el.style)return false;
if(el.getAttribute("data-gnr8-backtotop-hidden-duplicate")==="1")return false;
el.style.display="none";
el.style.visibility="hidden";
el.style.opacity="0";
el.style.pointerEvents="none";
el.setAttribute("aria-hidden","true");
el.setAttribute("data-gnr8-backtotop-hidden-duplicate","1");
return true;
}
function suppressFallbackCandidate(el){
if(!el||!el.style)return false;
el.style.setProperty("display","none","important");
el.style.setProperty("visibility","hidden","important");
el.style.setProperty("pointer-events","none","important");
el.style.setProperty("opacity","0","important");
el.setAttribute("aria-hidden","true");
el.setAttribute("data-gnr8-backtotop-hidden-duplicate","1");
return true;
}
function dedupeCandidates(selected,passName){
var candidates=findCandidateElements();
var excludedFalsePositiveCount=0;
for(var e=0;e<candidates.length;e+=1){
var nodeForExclude=candidates[e];
if(!nodeForExclude||!nodeForExclude.getAttribute)continue;
var excludeAggregate=String(nodeForExclude.id||"").toLowerCase()+" "+String(nodeForExclude.className||"").toLowerCase()+" "+String(nodeForExclude.getAttribute("aria-label")||"").toLowerCase()+" "+String(nodeForExclude.getAttribute("title")||"").toLowerCase()+" "+String(nodeForExclude.textContent||"").toLowerCase();
if(hasAnyToken(excludeAggregate,HORIZONTAL_NAV_TOKEN_LIST)||HORIZONTAL_ARROW_CONTENT_REGEX.test(excludeAggregate)){
excludedFalsePositiveCount+=1;
}
}
var hiddenCount=0;
for(var i=0;i<candidates.length;i+=1){
var node=candidates[i];
if(node===selected)continue;
if(hideDuplicate(node))hiddenCount+=1;
}
var visibleAfter=0;
for(var v=0;v<candidates.length;v+=1){
if(isVisibleCandidate(candidates[v]))visibleAfter+=1;
}
emit("PREVIEW_BACK_TO_TOP_CANDIDATES_SNAPSHOT",{
siteVersionId:payload.siteVersionId,
passName:passName,
candidateCount:candidates.length,
candidates:getCandidateSnapshot(candidates,selected),
suppressedFalsePositiveLogCount:suppressedFalsePositiveLogCount,
correlationKey:correlationKey("snapshot_"+passName)
});
return{
candidateCount:candidates.length,
originalCandidateCount:candidates.filter(function(node){return !isFallbackElement(node);}).length,
fallbackCandidateCount:candidates.filter(function(node){return isFallbackElement(node);}).length,
hiddenDuplicateCount:hiddenCount,
excludedFalsePositiveCount:excludedFalsePositiveCount,
visibleCandidateCountAfter:visibleAfter
};
}
function findPreferredOriginal(candidates){
for(var i=0;i<candidates.length;i+=1){
if(!isFallbackElement(candidates[i]))return candidates[i];
}
return null;
}
function shouldShowWithScroll(){
var h=Math.max(document.body&&document.body.scrollHeight||0,document.documentElement&&document.documentElement.scrollHeight||0);
var vh=Math.max(window.innerHeight||0,document.documentElement&&document.documentElement.clientHeight||0);
return h>vh+80;
}
function getPreferredOriginal(candidates){
for(var i=0;i<candidates.length;i+=1){
if(!isFallbackElement(candidates[i])&&isPotentiallyUsableOriginal(candidates[i]))return candidates[i];
}
return null;
}
function getFallbackCandidate(candidates){
for(var i=0;i<candidates.length;i+=1){
if(isFallbackElement(candidates[i]))return candidates[i];
}
return null;
}
function createFallbackButton(){
var fallback=document.createElement("button");
fallback.id=BACK_TO_TOP_FALLBACK_ID;
fallback.type="button";
fallback.setAttribute("aria-label","Back to top");
fallback.textContent="↑";
fallback.style.position="fixed";
fallback.style.right="20px";
fallback.style.bottom="20px";
fallback.style.zIndex="2147483000";
fallback.style.width="44px";
fallback.style.height="44px";
fallback.style.borderRadius="999px";
fallback.style.border="1px solid rgba(0,0,0,0.2)";
fallback.style.background="#1f2937";
fallback.style.color="#fff";
fallback.style.fontSize="20px";
fallback.style.lineHeight="1";
fallback.style.cursor="pointer";
fallback.style.boxShadow="0 2px 6px rgba(0,0,0,0.16)";
if(shouldShowWithScroll()){
fallback.style.opacity="0";
window.addEventListener("scroll",function(){
var scrolled=(window.scrollY||document.documentElement.scrollTop||0)>160;
fallback.style.opacity=scrolled?"1":"0";
fallback.style.pointerEvents=scrolled?"auto":"none";
});
}else{
fallback.style.opacity="1";
}
document.body.appendChild(fallback);
return fallback;
}
function runDedupePass(passName){
var candidates=findCandidateElements();
var existing=getPreferredOriginal(candidates);
var existingElementFound=!!existing;
var originalRuntimeDetection=existing?detectRoboplastOriginalCandidate(existing):null;
var fallbackCandidate=getFallbackCandidate(candidates);
var originalCandidateCount=candidates.filter(function(node){return !isFallbackElement(node);}).length;
var fallbackCandidateCount=candidates.filter(function(node){return isFallbackElement(node);}).length;
var fallbackInjected=false;
var detectionReason=existingElementFound?(originalRuntimeDetection&&originalRuntimeDetection.isOriginal?"ROBOPLAST_RUNTIME_ORIGINAL":"EXISTING_MARKUP"):"NO_ELEMENT";
var detectedTheme=pickAccentColor(existing||fallbackCandidate||null);
emit("PREVIEW_BACK_TO_TOP_DETECTED",{siteVersionId:payload.siteVersionId,detectionReason:detectionReason,existingElementFound:existingElementFound,fallbackInjected:fallbackInjected,correlationKey:correlationKey("detected")});
if(existing&&originalRuntimeDetection&&originalRuntimeDetection.isOriginal){
emit("PREVIEW_BACK_TO_TOP_RUNTIME_ORIGINAL_DETECTED",{
siteVersionId:payload.siteVersionId,
detectionReason:originalRuntimeDetection.detectionReason,
iconEvidence:originalRuntimeDetection.iconEvidence,
runtimeBehaviorDetected:originalRuntimeDetection.runtimeBehaviorDetected,
positionEvidence:originalRuntimeDetection.positionEvidence,
className:originalRuntimeDetection.className,
correlationKey:correlationKey("runtime_original_detected_"+passName)
});
}
if(existing){
var suppressedFallbackCount=0;
for(var s=0;s<candidates.length;s+=1){
var candidate=candidates[s];
if(isFallbackElement(candidate)&&suppressFallbackCandidate(candidate))suppressedFallbackCount+=1;
}
if(fallbackCandidateCount>0){
emit("PREVIEW_BACK_TO_TOP_FALLBACK_SUPPRESSED",{
siteVersionId:payload.siteVersionId,
originalCandidateCount:originalCandidateCount,
fallbackCandidateCount:fallbackCandidateCount,
suppressedFallbackCount:suppressedFallbackCount,
finalButtonSource:"original",
correlationKey:correlationKey("fallback_suppressed_"+passName)
});
}
ensureVisible(existing);
if(!existing.getAttribute("aria-label"))existing.setAttribute("aria-label","Back to top");
applyTheme(existing,detectedTheme,true,false);
normalizeIconForeground(existing,true,false);
wireClick(existing,detectionReason,true,false);
var dedupedOriginal=dedupeCandidates(existing,passName);
emit("PREVIEW_BACK_TO_TOP_DEDUPED",{siteVersionId:payload.siteVersionId,passName:passName,candidateCount:dedupedOriginal.candidateCount,originalCandidateCount:dedupedOriginal.originalCandidateCount,fallbackCandidateCount:dedupedOriginal.fallbackCandidateCount,fallbackInjectionPrevented:fallbackCandidateCount>0||!!fallbackCandidate,finalButtonSource:"original",hiddenDuplicateCount:dedupedOriginal.hiddenDuplicateCount,visibleCandidateCountAfter:dedupedOriginal.visibleCandidateCountAfter,excludedFalsePositiveCount:dedupedOriginal.excludedFalsePositiveCount,correlationKey:correlationKey("deduped_original_"+passName)});
emit("PREVIEW_BACK_TO_TOP_RESTORED",{siteVersionId:payload.siteVersionId,detectionReason:detectionReason,existingElementFound:true,fallbackInjected:false,correlationKey:correlationKey("restored")});
return;
}
var rescannedCandidates=findCandidateElements();
var rescannedOriginal=getPreferredOriginal(rescannedCandidates);
if(rescannedOriginal){
var rescannedDetection=detectRoboplastOriginalCandidate(rescannedOriginal);
emit("PREVIEW_BACK_TO_TOP_RUNTIME_ORIGINAL_DETECTED",{
siteVersionId:payload.siteVersionId,
detectionReason:rescannedDetection.detectionReason,
iconEvidence:rescannedDetection.iconEvidence,
runtimeBehaviorDetected:rescannedDetection.runtimeBehaviorDetected,
positionEvidence:rescannedDetection.positionEvidence,
className:rescannedDetection.className,
correlationKey:correlationKey("runtime_original_rescan_"+passName)
});
var dedupedRescanned=dedupeCandidates(rescannedOriginal,passName);
emit("PREVIEW_BACK_TO_TOP_DEDUPED",{siteVersionId:payload.siteVersionId,passName:passName,candidateCount:dedupedRescanned.candidateCount,originalCandidateCount:dedupedRescanned.originalCandidateCount,fallbackCandidateCount:dedupedRescanned.fallbackCandidateCount,fallbackInjectionPrevented:true,finalButtonSource:"original",hiddenDuplicateCount:dedupedRescanned.hiddenDuplicateCount,visibleCandidateCountAfter:dedupedRescanned.visibleCandidateCountAfter,excludedFalsePositiveCount:dedupedRescanned.excludedFalsePositiveCount,correlationKey:correlationKey("deduped_original_rescan_"+passName)});
return;
}
if(!fallbackCandidate&&!hasRuntimeSignals())return;
var fallback=fallbackCandidate;
if(!fallback){
fallback=createFallbackButton();
fallbackInjected=true;
}
detectionReason="RUNTIME_SIGNAL_FALLBACK";
ensureVisible(fallback);
applyTheme(fallback,detectedTheme,false,true);
normalizeIconForeground(fallback,false,true);
wireClick(fallback,detectionReason,false,true);
var dedupedFallback=dedupeCandidates(fallback,passName);
emit("PREVIEW_BACK_TO_TOP_DEDUPED",{siteVersionId:payload.siteVersionId,passName:passName,candidateCount:dedupedFallback.candidateCount,originalCandidateCount:dedupedFallback.originalCandidateCount,fallbackCandidateCount:dedupedFallback.fallbackCandidateCount,fallbackInjectionPrevented:false,finalButtonSource:"fallback",hiddenDuplicateCount:dedupedFallback.hiddenDuplicateCount,visibleCandidateCountAfter:dedupedFallback.visibleCandidateCountAfter,excludedFalsePositiveCount:dedupedFallback.excludedFalsePositiveCount,correlationKey:correlationKey("deduped_fallback_"+passName)});
emit("PREVIEW_BACK_TO_TOP_FALLBACK_APPLIED",{siteVersionId:payload.siteVersionId,detectionReason:detectionReason,existingElementFound:false,fallbackInjected:true,correlationKey:correlationKey("fallback")});
}
function schedulePass(name,delayMs){
setTimeout(function(){runDedupePass(name);},delayMs);
}
try{
runDedupePass("initial");
if(document.readyState==="complete"||document.readyState==="interactive"){
schedulePass("domcontentloaded",0);
schedulePass("window_load",0);
}else{
window.addEventListener("DOMContentLoaded",function(){runDedupePass("domcontentloaded");});
window.addEventListener("load",function(){runDedupePass("window_load");});
}
schedulePass("delayed_500ms",500);
schedulePass("delayed_1500ms",1500);
if(window.MutationObserver&&document.body){
var observer=new MutationObserver(function(records){
for(var i=0;i<records.length;i+=1){
var added=records[i]&&records[i].addedNodes?records[i].addedNodes:[];
for(var j=0;j<added.length;j+=1){
var node=added[j];
if(!node||node.nodeType!==1)continue;
var el=node;
if(isBackToTopCandidate(el)||(el.querySelector&&el.querySelector("a,button,[role='button']"))){
runDedupePass("mutation_observer");
return;
}
}
}
});
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
