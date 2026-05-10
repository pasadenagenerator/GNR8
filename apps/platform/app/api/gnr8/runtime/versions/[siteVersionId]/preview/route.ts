import { SiteVersionPreviewUnavailableError } from "@/gnr8/runtime/unified-render-preview";
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
function applyPagedLayout(){emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"JQUERY_READY_EXCEPTION_ISOLATED"});var moduleEl=document.getElementById(payload.moduleId);if(payload.moduleId!=="m4695"||!moduleEl||moduleEl.id!=="m4695"||!moduleEl.classList.contains("module")||!moduleEl.classList.contains("gallery")){emit("PREVIEW_GALLERY_LAYOUT_FIX_APPLIED",{layoutReasonCode:"SCOPED_MODULE_NOT_MATCHED"});return;}var dataSettings=String(moduleEl.getAttribute("data-settings")||"");var imagecols=parseSetting(dataSettings,"imagecols")||4;var imagenr=parseSetting(dataSettings,"imagenr")||12;var collected=collectGalleryAnchors(moduleEl);var anchors=collected.anchors;var pageSize=imagenr;var pageCount=Math.max(1,Math.ceil(anchors.length/pageSize));var pagesHost=ensurePagesHost(moduleEl);var pageImageCounts=[];var normalizedImageCount=0;var strippedInlineDimensionCount=0;for(var i=0;i<pageCount;i+=1){var page=ensurePage(pagesHost,i);stylePage(page,imagecols);while(page.firstChild){page.removeChild(page.firstChild);}var start=i*pageSize;var end=Math.min(anchors.length,start+pageSize);var count=0;for(var j=start;j<end;j+=1){var anchor=anchors[j];var normalization=styleAnchorAndImage(anchor);normalizedImageCount+=normalization.normalizedImageCount||0;strippedInlineDimensionCount+=normalization.strippedInlineDimensionCount||0;page.appendChild(anchor);count+=1;}pageImageCounts.push(count);}var controls=wireControls(moduleEl,pagesHost,pageCount);if(!controls.wired){emit("PAGED_GALLERY_CONTROLS_NOT_WIRED",{moduleId:payload.moduleId,pageCount:pageCount,reasonCode:"PAGED_CONTROLS_UNWIRED"});}var listMarkerNormalization=normalizeGalleryListMarkers(moduleEl,pagesHost);var arrowNormalization=normalizeGalleryArrowPosition(moduleEl,pagesHost);var captionsHiddenCount=hideThumbnailCaptions(moduleEl,pagesHost);emit("PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN",{captionsHiddenCount:captionsHiddenCount});emit("PREVIEW_GALLERY_THUMBNAIL_NORMALIZATION_APPLIED",{tileAspectRatio:"1 / 1",listMarkersSuppressed:listMarkerNormalization.listMarkersSuppressed,normalizedImageCount:normalizedImageCount,strippedInlineDimensionCount:strippedInlineDimensionCount,arrowHandlersAttached:controls.arrowHandlersAttached||0,correlationKey:correlationKey});moduleEl.classList.add("gnr8-gallery-layout-compat");var visibilityDetails=applyPagedVisibilityFix(moduleEl,pagesHost,pageCount,controls.wired);emit("PREVIEW_GALLERY_PAGED_LAYOUT_STATUS",{anchorCount:anchors.length,imagecols:imagecols,imagenr:imagenr,pageSize:pageSize,pageCount:pageCount,pageImageCounts:pageImageCounts,activePageIndex:controls.activePageIndex||0,controlsWired:controls.wired,captionsHiddenCount:captionsHiddenCount,unifiedGridDisabled:true,correlationKey:correlationKey,reasonCode:"PAGED_LAYOUT_APPLIED"});emit("PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED",{anchorCount:anchors.length,imagecols:imagecols,imagenr:imagenr,pageSize:pageSize,pageCount:pageCount,pageImageCounts:pageImageCounts,activePageIndex:controls.activePageIndex||0,controlsWired:controls.wired,captionsHiddenCount:captionsHiddenCount,unifiedGridDisabled:true,correlationKey:correlationKey,reasonCode:"PAGED_LAYOUT_APPLIED",pagesHost:visibilityDetails.pagesHost,page0:visibilityDetails.page0,page1:visibilityDetails.page1,module:visibilityDetails.module,page0ImageCount:visibilityDetails.page0ImageCount,page0VisibleImageCount:visibilityDetails.page0VisibleImageCount,firstPage0ImageSize:visibilityDetails.firstPage0ImageSize,leftArrowDetected:arrowNormalization.leftArrowDetected,rightArrowDetected:arrowNormalization.rightArrowDetected,arrowsPositioned:arrowNormalization.arrowsPositioned,overlapProtectionApplied:arrowNormalization.overlapProtectionApplied});emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_STATUS",{reasonCode:"PAGED_LAYOUT_ACTIVE_GEOMETRY_NORMALIZED"});emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_FIX_APPLIED",{reasonCode:"PAGED_LAYOUT_ACTIVE_GEOMETRY_NORMALIZED"});emit("PREVIEW_GALLERY_LAYOUT_FIX_APPLIED",{layoutReasonCode:"PAGED_LAYOUT_ACTIVE_GRID_APPLIED"});emit("PREVIEW_GALLERY_VISIBILITY_STATUS",{moduleId:payload.moduleId,imageCount:anchors.length,loadedImageCount:anchors.length,hiddenImageCount:0,reasonCode:"PAGED_LAYOUT_ACTIVE"});emit("PREVIEW_GALLERY_VISIBILITY_FIX_APPLIED",{moduleId:payload.moduleId,reasonCode:"PAGED_LAYOUT_ACTIVE_VISIBILITY_PRESERVED",hiddenImageCountBeforeFix:0,visibleImageCountAfterFix:anchors.length,page0Visible:visibilityDetails.page0Visible,page1Hidden:visibilityDetails.page1Hidden});emit("PREVIEW_GALLERY_INIT_COMPLETED",{galleryInitCalled:true,lightboxInitCalled:true,imageCount:anchors.length,loadedImageCount:anchors.length,trigger:"initial_status_check"});}
if(document.readyState==="complete"){setTimeout(applyPagedLayout,0);}else{window.addEventListener("load",function(){setTimeout(applyPagedLayout,0);});}
}catch(err){console.info("[gnr8.runtime.preview] PREVIEW_RUNTIME_MODULE_INIT_BLOCKED",{siteVersionId:payload.siteVersionId,moduleId:payload.moduleId,correlationKey:[payload.siteVersionId,payload.moduleId,"inject-error"].join(":"),blockerReason:"DIAGNOSTIC_SCRIPT_ERROR",error:String(err&&err.message?err.message:err)});}
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
    const shouldNormalizeFinalOutput = mode === "transformed";
    const normalizedOutput = shouldNormalizeFinalOutput
      ? normalizeTransformedPreviewOutputDoublePrefixedUrls({
          html: htmlWithGalleryRuntimeDiagnostic,
          siteId: preview.siteId,
          siteVersionId: preview.siteVersionId,
        })
      : { html: htmlWithGalleryRuntimeDiagnostic, occurrenceCount: 0, sampleBefore: null, sampleAfter: null };
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
