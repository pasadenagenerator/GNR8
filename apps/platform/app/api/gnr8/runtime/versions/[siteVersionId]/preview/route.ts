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
  const script = `<script>(function(){var payload=${payload};var correlationKey=[payload.siteVersionId,payload.moduleId,String(Date.now())].join(":");var errors=[];var completionEmitted=false;try{function emit(code,details){console.info("[gnr8.runtime.preview] "+code,Object.assign({siteVersionId:payload.siteVersionId,moduleId:payload.moduleId,correlationKey:correlationKey},details||{}));}function toErr(err){if(!err)return"unknown";if(typeof err==="string")return err;return String(err&&err.message?err.message:err);}function css(el){if(!el)return null;var s=window.getComputedStyle(el);return{display:s.display,visibility:s.visibility,opacity:s.opacity,height:s.height,width:s.width,maxHeight:s.maxHeight,maxWidth:s.maxWidth,objectFit:s.objectFit,aspectRatio:s.aspectRatio,overflow:s.overflow,position:s.position,clientWidth:Number(el.clientWidth)||0,clientHeight:Number(el.clientHeight)||0};}function dims(el){if(!el)return null;return{width:Number(el.clientWidth)||0,height:Number(el.clientHeight)||0};}function selectorInfo(el){if(!el)return null;var classes=String(el.className||"").split(/\\s+/).filter(Boolean);return{tag:String(el.tagName||"").toLowerCase(),id:el.id||"",classes:classes,selector:(el.id?"#"+String(el.id):String(el.tagName||"").toLowerCase())+(classes.length?"."+classes.join("."):"")};}function parentChain(el,maxDepth){var out=[];var depth=0;var node=el;while(node&&depth<maxDepth){out.push({tag:String(node.tagName||"").toLowerCase(),id:node.id||"",className:node.className||"",css:css(node),inlineStyle:node.getAttribute&&node.getAttribute("style")?String(node.getAttribute("style")):""});node=node.parentElement;depth+=1;}return out;}function hiddenByCss(el){if(!el)return true;var c=css(el);if(!c)return true;return c.display==="none"||c.visibility==="hidden"||Number(c.opacity)<=0||c.clientWidth===0||c.clientHeight===0;}function parseImageCols(dataSettings){if(!dataSettings)return null;var m=String(dataSettings).match(/imagecols\\s*[:=]\\s*["']?(\\d{1,2})/i);if(!m)return null;var parsed=Number(m[1]);if(!Number.isFinite(parsed)||parsed<1)return null;return parsed;}function computeGalleryHiddenByLoadedState(state){var isScopedModule=payload.moduleId==="m4695"&&!!state.moduleEl&&state.moduleEl.id==="m4695"&&state.moduleEl.classList.contains("module")&&state.moduleEl.classList.contains("gallery");if(!isScopedModule)return false;if(state.imgs.length===0||state.loadedImageCount===0)return false;var firstNaturalReady=!!state.firstImg&&Number(state.firstImg.naturalWidth)>0&&Number(state.firstImg.naturalHeight)>0;var firstClientReady=!!state.firstImg&&Number(state.firstImg.clientWidth)>0&&Number(state.firstImg.clientHeight)>0;if(!firstNaturalReady||!firstClientReady)return false;var moduleHidden=!!state.moduleCss&&(state.moduleCss.visibility==="hidden"||Number(state.moduleCss.opacity)<=0);return state.hiddenImageCount===state.imgs.length||moduleHidden;}function shouldApplyVisibilityFix(state,reasonCode){if(!state.moduleEl||payload.moduleId!=="m4695"||state.moduleEl.id!=="m4695")return false;if(!state.moduleEl.classList.contains("module")||!state.moduleEl.classList.contains("gallery"))return false;if(reasonCode!=="GALLERY_IMAGES_LOAD_BUT_HIDDEN_BY_CSS")return false;if(state.imgs.length===0||state.loadedImageCount===0)return false;var visibleImageCount=state.imgs.length-state.hiddenImageCount;if(visibleImageCount!==0)return false;var firstNaturalReady=!!state.firstImg&&Number(state.firstImg.naturalWidth)>0&&Number(state.firstImg.naturalHeight)>0;var firstClientReady=!!state.firstImg&&Number(state.firstImg.clientWidth)>0&&Number(state.firstImg.clientHeight)>0;if(!firstNaturalReady||!firstClientReady)return false;var moduleHidden=!!state.moduleCss&&(state.moduleCss.visibility==="hidden"||Number(state.moduleCss.opacity)<=0);var firstImageHidden=!!state.firstImageCss&&state.firstImageCss.visibility==="hidden";var firstAnchorHidden=!!state.firstAnchorCss&&state.firstAnchorCss.visibility==="hidden";return moduleHidden||firstImageHidden||firstAnchorHidden;}function classifyVisibility(state){if(!state.moduleEl)return"MODULE_NOT_FOUND";if(computeGalleryHiddenByLoadedState(state))return"GALLERY_IMAGES_LOAD_BUT_HIDDEN_BY_CSS";if(!state.hasMonogalleryFn||!state.hasLightboxFn)return"GALLERY_PLUGIN_DEPENDENCY_MISSING";if(!state.hasGalleryInit)return"GALLERY_PLUGIN_INIT_NOT_CALLED";if(state.imgs.length>0&&state.loadedImageCount===0)return"GALLERY_IMAGE_REQUESTS_NOT_EMITTED_OR_FAILED";if(state.imgs.length===0)return"OTHER_WITH_EVIDENCE";if(state.hiddenImageCount===state.imgs.length){if(!state.moduleEl.classList.contains("module")||!state.moduleEl.classList.contains("gallery"))return"GALLERY_DOM_MUTATED_TO_BROKEN_STATE";return"GALLERY_IMAGES_LOAD_BUT_HIDDEN_BY_CSS";}return errors.length>0?"OTHER_WITH_EVIDENCE":"VISIBLE";}function isLikelyControlNode(node){if(!node)return false;var text=String(node.className||"")+" "+String(node.id||"")+" "+String(node.getAttribute&&node.getAttribute("aria-label")||"");return/(arrow|prev|next|nav|control|pager|button|lightbox|overlay)/i.test(text);}function isImageAnchor(node){if(!node)return false;if(String(node.tagName||"").toLowerCase()!=="a")return false;return !!node.querySelector("img");}function summarizeElement(el){if(!el)return null;var children=Array.prototype.slice.call(el.children||[]);var anchors=el.querySelectorAll?el.querySelectorAll("a"):[];var images=el.querySelectorAll?el.querySelectorAll("img"):[];var computed=css(el);return{tag:String(el.tagName||"").toLowerCase(),id:el.id||"",classes:String(el.className||"").split(/\\s+/).filter(Boolean),directChildCount:children.length,anchorCount:anchors.length,imageCount:images.length,clientWidth:Number(el.clientWidth)||0,clientHeight:Number(el.clientHeight)||0,display:computed?computed.display:"",position:computed?computed.position:"",overflow:computed?computed.overflow:""};}function getContainerCandidates(moduleEl,anchors){var out=[];var seen=[];function push(node){if(!node)return;var key=(node.id||"")+"::"+String(node.className||"")+"::"+String(node.tagName||"");if(seen.indexOf(key)>=0)return;seen.push(key);out.push(node);}push(moduleEl);if(anchors&&anchors.length>0){for(var i=0;i<anchors.length;i+=1){var node=anchors[i]&&anchors[i].parentElement;while(node&&moduleEl&&node!==moduleEl.parentElement){push(node);if(node===moduleEl)break;node=node.parentElement;}}}return out;}function classifyChildAsItem(child){if(isLikelyControlNode(child))return null;if(isImageAnchor(child))return{type:"direct_anchor",anchor:child,item:child};var childAnchors=child&&child.querySelectorAll?Array.prototype.slice.call(child.querySelectorAll(":scope > a")):[];if(childAnchors.length===1&&isImageAnchor(childAnchors[0]))return{type:"item_wrapper",anchor:childAnchors[0],item:child};var images=child&&child.querySelectorAll?Array.prototype.slice.call(child.querySelectorAll(":scope img")):[];if(childAnchors.length===1&&images.length===1)return{type:"item_wrapper",anchor:childAnchors[0],item:child};return null;}function scoreContainer(el){if(!el)return null;var children=Array.prototype.slice.call(el.children||[]);var childInfos=children.map(function(child){return classifyChildAsItem(child);});var items=childInfos.filter(function(item){return !!item;});var directAnchors=items.filter(function(item){return item.type==="direct_anchor";}).map(function(item){return item.anchor;});var wrapperItems=items.filter(function(item){return item.type==="item_wrapper";});var controls=children.filter(isLikelyControlNode);var width=Number(el.clientWidth)||0;var hasMeaningfulWidth=width>=180;var score=0;score+=items.length*100;score+=wrapperItems.length*15;score-=controls.length*20;score+=hasMeaningfulWidth?10:-200;return{el:el,summary:summarizeElement(el),children:children,items:items,directAnchors:directAnchors,itemWrappers:wrapperItems.map(function(item){return item.item;}),gridChildType:wrapperItems.length>0?"item_wrapper":"direct_anchor",gridChildren:wrapperItems.length>0?wrapperItems.map(function(item){return item.item;}):directAnchors,galleryAnchorCount:items.length,controlsCount:controls.length,width:width,hasMeaningfulWidth:hasMeaningfulWidth,score:score};}function chooseLayoutContainer(state){if(!state.moduleEl||state.anchors.length===0)return null;var scored=getContainerCandidates(state.moduleEl,state.anchors).map(scoreContainer).filter(function(candidate){if(!candidate)return false;if(candidate.galleryAnchorCount<4)return false;if(candidate.controlsCount===candidate.children.length&&candidate.children.length>0)return false;if(!candidate.hasMeaningfulWidth)return false;return true;});scored.sort(function(a,b){if(a.width!==b.width)return a.width-b.width;if(b.galleryAnchorCount!==a.galleryAnchorCount)return b.galleryAnchorCount-a.galleryAnchorCount;return b.score-a.score;});if(scored.length===0)return{selected:null,reason:"NO_CONTAINER_WITH_4_GALLERY_ITEMS",candidates:[]};var selected=scored[0];var reason=selected.gridChildType==="item_wrapper"?"NARROWEST_WRAPPER_CONTAINER_WITH_ITEM_CHILDREN":"NARROWEST_DIRECT_ANCHOR_CONTAINER";return{selected:selected,reason:reason,candidates:scored.map(function(candidate){return{selectorInfo:selectorInfo(candidate.el),summary:candidate.summary,galleryAnchorCount:candidate.galleryAnchorCount,directAnchorCount:candidate.directAnchors.length,itemWrapperCount:candidate.itemWrappers.length,controlsCount:candidate.controlsCount,width:candidate.width,score:candidate.score,gridChildType:candidate.gridChildType};})};}function detectColumnsFromGridChildren(gridChildren){if(!gridChildren||gridChildren.length===0)return{columnCount:0,zeroDimensionChildren:true};var valid=gridChildren.filter(function(child){return !!child&&Number(child.clientWidth)>0;});if(valid.length===0)return{columnCount:0,zeroDimensionChildren:true};var tops=valid.map(function(child){return Number(child.getBoundingClientRect().top)||0;});if(tops.length===0)return{columnCount:0,zeroDimensionChildren:true};var firstTop=tops[0];var epsilon=2;var count=0;for(var i=0;i<tops.length;i+=1){if(Math.abs(tops[i]-firstTop)<=epsilon)count+=1;else break;}return{columnCount:count||1,zeroDimensionChildren:false};}function collectImgGeometry(img){if(!img)return null;var computed=css(img);return{clientWidth:Number(img.clientWidth)||0,clientHeight:Number(img.clientHeight)||0,naturalWidth:Number(img.naturalWidth)||0,naturalHeight:Number(img.naturalHeight)||0,computedWidth:computed?computed.width:"",computedHeight:computed?computed.height:"",computedObjectFit:computed?computed.objectFit:"",computedAspectRatio:computed?computed.aspectRatio:""};}function collectState(){var moduleEl=document.getElementById(payload.moduleId);var imgs=moduleEl?Array.prototype.slice.call(moduleEl.querySelectorAll("img")):[];var anchors=moduleEl?Array.prototype.slice.call(moduleEl.querySelectorAll("a")):[];var firstImg=imgs[0]||null;var firstAnchor=anchors[0]||null;var hiddenImageCount=imgs.filter(function(img){return hiddenByCss(img);}).length;var loadedImageCount=imgs.filter(function(img){return !!img.complete&&Number(img.naturalWidth)>0&&Number(img.naturalHeight)>0;}).length;var firstThree=imgs.slice(0,3).map(function(img){var src=img.currentSrc||img.getAttribute("src")||"";var perf=window.performance&&window.performance.getEntriesByName?window.performance.getEntriesByName(src):[];var entry=perf&&perf.length?perf[perf.length-1]:null;return{src:src,naturalWidth:Number(img.naturalWidth)||0,naturalHeight:Number(img.naturalHeight)||0,complete:!!img.complete,transferSize:entry&&typeof entry.transferSize==="number"?entry.transferSize:null,encodedBodySize:entry&&typeof entry.encodedBodySize==="number"?entry.encodedBodySize:null};});var jq=window.jQuery||window.$;var hasMonogalleryFn=!!(jq&&jq.fn&&typeof jq.fn.monogallery==="function");var hasLightboxFn=!!(jq&&jq.fn&&typeof jq.fn.lightbox==="function");var hasGalleryInit=!!(jq&&moduleEl&&jq(moduleEl).data&&jq(moduleEl).data("monogallery"));var hasLightboxInit=!!(jq&&moduleEl&&jq(moduleEl).data&&jq(moduleEl).data("lightbox"));var lazyTouched=imgs.some(function(img){return !!img.getAttribute("data-lazyload-src")||!!img.getAttribute("data-src");});var moduleClasses=moduleEl?String(moduleEl.className||"").split(/\\s+/).filter(Boolean):[];var dataSettings=moduleEl&&moduleEl.getAttribute?String(moduleEl.getAttribute("data-settings")||""):"";var imagecols=parseImageCols(dataSettings);var moduleChildren=moduleEl?Array.prototype.slice.call(moduleEl.children||[]):[];return{moduleEl:moduleEl,imgs:imgs,anchors:anchors,firstImg:firstImg,firstAnchor:firstAnchor,hiddenImageCount:hiddenImageCount,loadedImageCount:loadedImageCount,firstThree:firstThree,jq:jq,hasMonogalleryFn:hasMonogalleryFn,hasLightboxFn:hasLightboxFn,hasGalleryInit:hasGalleryInit,hasLightboxInit:hasLightboxInit,lazyTouched:lazyTouched,moduleClasses:moduleClasses,moduleCss:css(moduleEl),firstImageCss:css(firstImg),firstAnchorCss:css(firstAnchor),moduleInlineStyle:moduleEl&&moduleEl.getAttribute?String(moduleEl.getAttribute("style")||""):"",firstImageInlineStyle:firstImg&&firstImg.getAttribute?String(firstImg.getAttribute("style")||""):"",firstAnchorInlineStyle:firstAnchor&&firstAnchor.getAttribute?String(firstAnchor.getAttribute("style")||""):"",parentChain:firstImg?parentChain(firstImg,5):moduleEl?parentChain(moduleEl,5):[],dataSettings:dataSettings,imagecols:imagecols,moduleChildSummary:moduleChildren.map(summarizeElement)};}function emitCompletionIfReady(state,trigger){if(completionEmitted||!state.hasGalleryInit)return;completionEmitted=true;emit("PREVIEW_GALLERY_INIT_COMPLETED",{galleryInitCalled:true,lightboxInitCalled:state.hasLightboxInit,imageCount:state.imgs.length,loadedImageCount:state.loadedImageCount,trigger:trigger});}function applyVisibilityFix(state,reasonCode){if(!shouldApplyVisibilityFix(state,reasonCode))return{applied:false,reasonCode:"NO_HIDDEN_LOADED_IMAGES"};var beforeModuleCss=state.moduleCss;var beforeFirstImageCss=state.firstImageCss;state.moduleEl.style.visibility="visible";state.moduleEl.style.opacity="1";state.anchors.forEach(function(anchor){if(anchor&&anchor.style){anchor.style.visibility="visible";}});state.imgs.forEach(function(img){if(img&&img.style){img.style.visibility="visible";}});state.moduleEl.classList.add("gnr8-gallery-visibility-compat");var after=collectState();return{applied:true,reasonCode:"MODULE_HIDDEN_STYLE_NORMALIZED",beforeModuleCss:beforeModuleCss,afterModuleCss:after.moduleCss,beforeFirstImageCss:beforeFirstImageCss,afterFirstImageCss:after.firstImageCss,hiddenImageCountBeforeFix:state.hiddenImageCount,visibleImageCountAfterFix:after.imgs.length-after.hiddenImageCount};}function computeLayoutReason(isScopedModule,imagecols,state,selection,detected){if(!isScopedModule)return"LAYOUT_SCOPE_MISMATCH";if(imagecols!==4)return"LAYOUT_IMAGECOLS_NOT_4";if(state.imgs.length===0||state.loadedImageCount===0)return"LAYOUT_IMAGES_NOT_READY";if(!selection.selected)return"LAYOUT_CONTAINER_NOT_FOUND";if(selection.selected.gridChildren.length<2)return"LAYOUT_CONTAINER_HAS_NO_GRID_ITEMS";if(detected.columnCount===4)return"LAYOUT_ALREADY_4_COLUMN";if(detected.zeroDimensionChildren)return"GRID_CHILDREN_ZERO_DIMENSIONS";if(selection.selected.el===state.moduleEl&&selection.selected.gridChildType!=="direct_anchor")return"WRONG_LAYOUT_CONTAINER_SELECTED";return"STACKED_LAYOUT_DETECTED";}function applyLayoutFix(state,attemptLabel){if(!attemptLabel)attemptLabel="initial";var isScopedModule=payload.moduleId==="m4695"&&!!state.moduleEl&&state.moduleEl.id==="m4695"&&state.moduleEl.classList.contains("module")&&state.moduleEl.classList.contains("gallery");var imagecols=Number(state.imagecols)||0;var selection=chooseLayoutContainer(state);var selected=selection.selected;var layoutContainer=selected?selected.el:null;var detectedBefore=detectColumnsFromGridChildren(selected?selected.gridChildren:[]);var first4ItemsBefore=selected?selected.gridChildren.slice(0,4).map(dims):[];var first4ImagesBefore=state.imgs.slice(0,4).map(collectImgGeometry);emit("PREVIEW_GALLERY_LAYOUT_CONTAINER_CANDIDATES",{attempt:attemptLabel,moduleChildSummary:state.moduleChildSummary,candidates:selection.candidates,selectedContainerInfo:selectorInfo(layoutContainer),selectedContainerReason:selection.reason});var reasonCode=computeLayoutReason(isScopedModule,imagecols,state,selection,detectedBefore);var shouldFix=reasonCode==="STACKED_LAYOUT_DETECTED"||reasonCode==="GRID_CHILDREN_ZERO_DIMENSIONS";if(!shouldFix){emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_STATUS",{attempt:attemptLabel,moduleChildSummary:state.moduleChildSummary,selectedContainerInfo:selectorInfo(layoutContainer),selectedContainerReason:selection.reason,gridChildCount:selected?selected.gridChildren.length:0,gridChildType:selected?selected.gridChildType:null,detectedColumnCountBefore:detectedBefore.columnCount,detectedColumnCountAfter:detectedBefore.columnCount,first4ItemSizesBefore:first4ItemsBefore,first4ItemSizesAfter:first4ItemsBefore,first4ImageSizesBefore:first4ImagesBefore,first4ImageSizesAfter:first4ImagesBefore,reasonCode:reasonCode});return{applied:false,reasonCode:reasonCode,detectedColumnCountAfter:detectedBefore.columnCount,needsRetry:detectedBefore.columnCount<=1};}layoutContainer.classList.add("gnr8-gallery-layout-compat");layoutContainer.style.display="grid";layoutContainer.style.gridTemplateColumns="repeat(4, minmax(0, 1fr))";layoutContainer.style.gap="12px";layoutContainer.style.alignItems="start";selected.gridChildren.forEach(function(child){if(!child||!child.style)return;child.style.width="100%";child.style.minWidth="0";child.style.display="block";child.style.overflow="hidden";});var directChildren=Array.prototype.slice.call(layoutContainer.children||[]);var controlsExcluded=directChildren.filter(isLikelyControlNode).length;state.imgs.forEach(function(img){if(!img||!img.style)return;img.style.display="block";img.style.width="100%";img.style.maxWidth="100%";img.style.height="auto";img.style.setProperty("height","auto","important");img.style.objectFit="contain";img.style.visibility="visible";img.style.opacity="1";if(img.getAttribute("height")&&Number(img.clientWidth)<Number(img.naturalWidth))img.removeAttribute("height");if(img.getAttribute("width")&&Number(img.clientWidth)<Number(img.naturalWidth))img.removeAttribute("width");if(String(img.style.height||"").trim()==="800px"){img.style.height="auto";img.style.setProperty("height","auto","important");}});var afterState=collectState();var afterSelection=chooseLayoutContainer(afterState);var afterSelected=afterSelection.selected;var detectedAfter=detectColumnsFromGridChildren(afterSelected?afterSelected.gridChildren:[]);var first4ItemsAfter=afterSelected?afterSelected.gridChildren.slice(0,4).map(dims):[];var first4ImagesAfter=afterState.imgs.slice(0,4).map(collectImgGeometry);var geometryReasonCode="STACKED_LAYOUT_DETECTED_GRID_GEOMETRY_NORMALIZED";if(detectedAfter.zeroDimensionChildren)geometryReasonCode="GRID_CHILDREN_ZERO_DIMENSIONS";else if(!afterSelected)geometryReasonCode="WRONG_LAYOUT_CONTAINER_SELECTED";else if(afterSelected.gridChildren.length===0)geometryReasonCode="GRID_APPLIED_BUT_CHILDREN_NOT_ITEMS";else if(detectedAfter.columnCount<=1)geometryReasonCode="GALLERY_JS_OVERWROTE_LAYOUT";emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_STATUS",{attempt:attemptLabel,moduleChildSummary:afterState.moduleChildSummary,selectedContainerInfo:selectorInfo(afterSelected?afterSelected.el:layoutContainer),selectedContainerReason:afterSelection.reason,gridChildCount:afterSelected?afterSelected.gridChildren.length:selected.gridChildren.length,gridChildType:afterSelected?afterSelected.gridChildType:selected.gridChildType,detectedColumnCountBefore:detectedBefore.columnCount,detectedColumnCountAfter:detectedAfter.columnCount,first4ItemSizesBefore:first4ItemsBefore,first4ItemSizesAfter:first4ItemsAfter,first4ImageSizesBefore:first4ImagesBefore,first4ImageSizesAfter:first4ImagesAfter,reasonCode:geometryReasonCode});emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_FIX_APPLIED",{attempt:attemptLabel,selectedContainerInfo:selectorInfo(afterSelected?afterSelected.el:layoutContainer),selectedContainerReason:afterSelection.reason,gridChildCount:afterSelected?afterSelected.gridChildren.length:selected.gridChildren.length,gridChildType:afterSelected?afterSelected.gridChildType:selected.gridChildType,detectedColumnCountBefore:detectedBefore.columnCount,detectedColumnCountAfter:detectedAfter.columnCount,first4ItemSizesBefore:first4ItemsBefore,first4ItemSizesAfter:first4ItemsAfter,first4ImageSizesBefore:first4ImagesBefore,first4ImageSizesAfter:first4ImagesAfter,reasonCode:geometryReasonCode,arrowsExcludedFromGrid:controlsExcluded>0,excludedControlCount:controlsExcluded});emit("PREVIEW_GALLERY_LAYOUT_FIX_APPLIED",{attempt:attemptLabel,moduleId:payload.moduleId,imagecols:imagecols,imageCount:afterState.imgs.length,moduleWidth:afterState.moduleCss?afterState.moduleCss.clientWidth:0,selectedContainerInfo:selectorInfo(afterSelected?afterSelected.el:layoutContainer),selectedContainerReason:afterSelection.reason,gridChildCount:afterSelected?afterSelected.gridChildren.length:selected.gridChildren.length,gridChildType:afterSelected?afterSelected.gridChildType:selected.gridChildType,detectedColumnCountBefore:detectedBefore.columnCount,detectedColumnCountAfter:detectedAfter.columnCount,layoutReasonCode:"STACKED_LAYOUT_DETECTED_GRID_APPLIED"});return{applied:true,reasonCode:geometryReasonCode,detectedColumnCountAfter:detectedAfter.columnCount,needsRetry:detectedAfter.columnCount<=1};}function scheduleLayoutRetryIfNeeded(trigger,result){if(!result||!result.needsRetry)return;if(scheduleLayoutRetryIfNeeded._done)return;scheduleLayoutRetryIfNeeded._done=true;emit("PREVIEW_GALLERY_LAYOUT_RETRY_SCHEDULED",{trigger:trigger,reasonCode:result.reasonCode,detectedColumnCountAfter:result.detectedColumnCountAfter});window.requestAnimationFrame(function(){setTimeout(function(){var retryState=collectState();var retryResult=applyLayoutFix(retryState,"retry");emit("PREVIEW_GALLERY_LAYOUT_RETRY_APPLIED",{trigger:trigger,reasonCode:retryResult.reasonCode,detectedColumnCountAfter:retryResult.detectedColumnCountAfter,applied:retryResult.applied});},40);});}window.addEventListener("error",function(ev){var err={message:ev&&ev.message?String(ev.message):"unknown",filename:ev&&ev.filename?String(ev.filename):"",lineno:ev&&ev.lineno?Number(ev.lineno):0,colno:ev&&ev.colno?Number(ev.colno):0};errors.push(err);var looksLikeModuleInitCrash=(String(err.filename||"").toLowerCase().indexOf("opennow")>=0)||(String(err.message||"").toLowerCase().indexOf("ownerdocument")>=0);if(looksLikeModuleInitCrash){emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"MODULE_RUNTIME_INIT_CRASH_ISOLATED",error:err.message,filename:err.filename,lineno:err.lineno,colno:err.colno});setTimeout(function(){attemptGalleryFallbackInit("window_error");},0);}});window.addEventListener("unhandledrejection",function(ev){var reason=ev&&ev.reason;var err={message:reason&&reason.message?String(reason.message):String(reason??"unhandledrejection"),filename:"promise",lineno:0,colno:0};errors.push(err);emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"MODULE_RUNTIME_UNHANDLED_REJECTION_ISOLATED",error:err.message});setTimeout(function(){attemptGalleryFallbackInit("unhandled_rejection");},0);});function attemptGalleryFallbackInit(trigger){var state=collectState();if(!state.moduleEl||!state.jq)return;try{if(state.hasMonogalleryFn&&!state.hasGalleryInit){state.jq(state.moduleEl).monogallery();}if(state.hasLightboxFn&&!state.hasLightboxInit&&state.anchors.length>0){state.jq(state.anchors).lightbox();}state=collectState();emitCompletionIfReady(state,trigger);}catch(err){emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"GALLERY_FALLBACK_INIT_FAILED_BUT_ISOLATED",error:toErr(err),trigger:trigger});}}(function installRuntimeIsolation(){var jq=window.jQuery||window.$;if(!jq)return;try{if(typeof jq.readyException==="function"){var originalReadyException=jq.readyException;jq.readyException=function(error){emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"JQUERY_READY_EXCEPTION_ISOLATED",error:toErr(error)});try{return originalReadyException.call(this,error);}catch(_ignored){return undefined;}};}if(jq.Deferred&&typeof jq.Deferred.exceptionHook==="function"){var originalExceptionHook=jq.Deferred.exceptionHook;jq.Deferred.exceptionHook=function(error,stack){emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"JQUERY_DEFERRED_EXCEPTION_ISOLATED",error:toErr(error)});try{return originalExceptionHook.call(this,error,stack);}catch(_ignored){return undefined;}};}}catch(err){emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"ISOLATION_SHIM_INSTALL_FAILED",error:toErr(err)});}})();function run(){var before=collectState();var beforeReason=classifyVisibility(before);emit("PREVIEW_GALLERY_VISIBILITY_STATUS",{moduleId:payload.moduleId,imageCount:before.imgs.length,loadedImageCount:before.loadedImageCount,hiddenImageCount:before.hiddenImageCount,containerHeight:before.moduleCss?before.moduleCss.clientHeight:0,firstImageClientSize:dims(before.firstImg),firstImageNaturalSize:before.firstImg?{width:Number(before.firstImg.naturalWidth)||0,height:Number(before.firstImg.naturalHeight)||0}:null,reasonCode:beforeReason,moduleCss:before.moduleCss,firstImageCss:before.firstImageCss,firstAnchorCss:before.firstAnchorCss,parentChain:before.parentChain,moduleClasses:before.moduleClasses,moduleInlineStyle:before.moduleInlineStyle,firstImageInlineStyle:before.firstImageInlineStyle,firstAnchorInlineStyle:before.firstAnchorInlineStyle});var fix=applyVisibilityFix(before,beforeReason);var after=collectState();var afterReason=classifyVisibility(after);if(fix.applied){emit("PREVIEW_GALLERY_VISIBILITY_FIX_APPLIED",{moduleId:payload.moduleId,imageCount:after.imgs.length,loadedImageCount:after.loadedImageCount,hiddenImageCountBeforeFix:fix.hiddenImageCountBeforeFix,visibleImageCountAfterFix:fix.visibleImageCountAfterFix,hiddenImageCount:after.hiddenImageCount,containerHeight:after.moduleCss?after.moduleCss.clientHeight:0,firstImageClientSize:dims(after.firstImg),firstImageNaturalSize:after.firstImg?{width:Number(after.firstImg.naturalWidth)||0,height:Number(after.firstImg.naturalHeight)||0}:null,reasonCode:fix.reasonCode,beforeReasonCode:beforeReason,afterReasonCode:afterReason,moduleCssBefore:fix.beforeModuleCss,moduleCssAfter:fix.afterModuleCss,firstImageCssBefore:fix.beforeFirstImageCss,firstImageCssAfter:fix.afterFirstImageCss});}var layoutResult=applyLayoutFix(after,"initial");scheduleLayoutRetryIfNeeded("initial_layout_pass",layoutResult);after=collectState();var blockerReason="";if(!after.moduleEl){blockerReason="MODULE_NOT_FOUND";}else if(!after.hasMonogalleryFn||!after.hasLightboxFn){blockerReason="GALLERY_PLUGIN_DEPENDENCY_MISSING";}else if(!after.hasGalleryInit){blockerReason="GALLERY_PLUGIN_INIT_NOT_CALLED";}else if(after.imgs.length>0&&after.loadedImageCount===0){blockerReason="GALLERY_IMAGE_REQUESTS_NOT_EMITTED_OR_FAILED";}else if(after.imgs.length>0&&after.hiddenImageCount===after.imgs.length){blockerReason=afterReason==="GALLERY_DOM_MUTATED_TO_BROKEN_STATE"?"GALLERY_DOM_MUTATED_TO_BROKEN_STATE":"GALLERY_IMAGES_LOAD_BUT_HIDDEN_BY_CSS";}else if(errors.length>0&&(!after.hasGalleryInit||after.loadedImageCount===0)){blockerReason="GALLERY_BLOCKED_BY_GLOBAL_LOADER_ERROR";}emit("PREVIEW_GALLERY_RUNTIME_DIAGNOSTIC",{initStatus:{galleryInitCalled:after.hasGalleryInit,lightboxInitCalled:after.hasLightboxInit,lazyloadTouchesGallery:after.lazyTouched,monogalleryFnPresent:after.hasMonogalleryFn,lightboxFnPresent:after.hasLightboxFn},blockerReason:blockerReason||null,imageCount:after.imgs.length,loadedImageCount:after.loadedImageCount,hiddenImageCount:after.hiddenImageCount,moduleCss:after.moduleCss,firstImageCss:after.firstImageCss,firstAnchorCss:after.firstAnchorCss});emit("PREVIEW_GALLERY_IMAGE_STATUS",{imageCount:after.imgs.length,loadedImageCount:after.loadedImageCount,hiddenImageCount:after.hiddenImageCount,images:after.firstThree});emit("PREVIEW_GALLERY_INIT_STATUS",{initStatus:after.hasGalleryInit?"INITIALIZED":"NOT_INITIALIZED",galleryInitCalled:after.hasGalleryInit,lightboxInitCalled:after.hasLightboxInit,lazyloadTouchesGallery:after.lazyTouched});emitCompletionIfReady(after,"initial_status_check");if(!after.hasGalleryInit&&after.hasMonogalleryFn){attemptGalleryFallbackInit("post_status_probe");after=collectState();emitCompletionIfReady(after,"post_status_probe");}if(blockerReason==="GALLERY_BLOCKED_BY_GLOBAL_LOADER_ERROR"){emit("PREVIEW_RUNTIME_MODULE_INIT_BLOCKED",{blockerReason:blockerReason,errorCount:errors.length,errors:errors.slice(0,5)});}if(errors.length>0&&blockerReason!=="GALLERY_BLOCKED_BY_GLOBAL_LOADER_ERROR"){emit("PREVIEW_RUNTIME_MODULE_INIT_BLOCKED",{blockerReason:"NON_BLOCKING_ERRORS_PRESENT",errorCount:errors.length,errors:errors.slice(0,5)});}}if(document.readyState==="complete"){setTimeout(run,0);}else{window.addEventListener("load",function(){setTimeout(run,0);});}}catch(err){console.info("[gnr8.runtime.preview] PREVIEW_RUNTIME_MODULE_INIT_BLOCKED",{siteVersionId:payload.siteVersionId,moduleId:payload.moduleId,correlationKey:[payload.siteVersionId,payload.moduleId,"inject-error"].join(":"),blockerReason:"DIAGNOSTIC_SCRIPT_ERROR",error:String(err&&err.message?err.message:err)});}})();</script>`;
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
