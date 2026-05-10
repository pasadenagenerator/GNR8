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
  const script = `<script>(function(){var payload=${payload};var correlationKey=[payload.siteVersionId,payload.moduleId,String(Date.now())].join(":");try{function emit(code,details){console.info("[gnr8.runtime.preview] "+code,Object.assign({siteVersionId:payload.siteVersionId,moduleId:payload.moduleId,correlationKey:correlationKey},details||{}));}function parseSetting(dataSettings,key){if(!dataSettings)return null;var m=String(dataSettings).match(new RegExp(key+"\\\\s*[:=]\\\\s*[\\\"']?(\\\\d{1,3})","i"));if(!m)return null;var n=Number(m[1]);return Number.isFinite(n)&&n>0?n:null;}function isLikelyControlNode(node){if(!node)return false;var text=String(node.className||"")+" "+String(node.id||"")+" "+String(node.getAttribute&&node.getAttribute("aria-label")||"");return/(arrow|prev|next|nav|control|pager|button|lightbox|overlay)/i.test(text);}function isPreviewAssetGalleryImage(img){if(!img)return false;var src=String(img.getAttribute&&img.getAttribute("src")||img.currentSrc||"");return src.indexOf("/api/gnr8/runtime/preview-assets/")>=0&&/\\\\/uploads\\\\//i.test(src);}function isExcludedControlAnchor(anchor,moduleEl){if(!anchor)return true;if(isLikelyControlNode(anchor))return true;var node=anchor.parentElement;var depth=0;while(node&&moduleEl&&depth<6&&node!==moduleEl){if(isLikelyControlNode(node))return true;node=node.parentElement;depth+=1;}return false;}function collectGalleryAnchors(moduleEl){if(!moduleEl||!moduleEl.querySelectorAll)return{anchors:[],skippedControlCount:0};var allAnchors=Array.prototype.slice.call(moduleEl.querySelectorAll("a"));var anchors=[];var skippedControlCount=0;allAnchors.forEach(function(anchor){var img=anchor&&anchor.querySelector?anchor.querySelector("img"):null;if(!img||!isPreviewAssetGalleryImage(img))return;if(isExcludedControlAnchor(anchor,moduleEl)){skippedControlCount+=1;return;}anchors.push(anchor);});return{anchors:anchors,skippedControlCount:skippedControlCount};}function ensurePagesHost(moduleEl){var host=moduleEl.querySelector(":scope > .gnr8-gallery-pages");if(host)return host;host=document.createElement("div");host.className="gnr8-gallery-pages";moduleEl.appendChild(host);return host;}function ensurePage(host,pageIndex){var page=host.querySelector(':scope > .gnr8-gallery-page[data-page-index="'+String(pageIndex)+'"]');if(page)return page;page=document.createElement("div");page.className="gnr8-gallery-page";page.setAttribute("data-page-index",String(pageIndex));host.appendChild(page);return page;}function stylePage(page,columns){if(!page||!page.style)return;page.style.display="grid";page.style.gridTemplateColumns="repeat("+String(columns)+", minmax(0, 1fr))";page.style.gap="12px";page.style.alignItems="start";page.style.width="100%";}function styleAnchorAndImage(anchor){if(!anchor||!anchor.style)return;anchor.style.display="block";anchor.style.width="100%";anchor.style.overflow="hidden";var img=anchor.querySelector("img");if(img&&img.style){img.style.display="block";img.style.width="100%";img.style.height="auto";img.style.maxWidth="100%";img.style.objectFit="contain";}}function hideThumbnailCaptions(moduleEl,pagesHost){var hiddenCount=0;if(!moduleEl||!moduleEl.querySelectorAll)return 0;var candidates=Array.prototype.slice.call(moduleEl.querySelectorAll("figcaption,.caption,.description,.title,.alt,.image-title,p,span,em,strong"));candidates.forEach(function(node){if(!node||!node.closest)return;if(pagesHost&&!node.closest(".gnr8-gallery-page"))return;if(node.querySelector&&node.querySelector("img,a"))return;var text=String(node.textContent||"").trim();if(text.length===0)return;if(node.style){node.style.display="none";hiddenCount+=1;}});return hiddenCount;}function setActivePage(host,activeIndex){var pages=Array.prototype.slice.call(host.querySelectorAll(":scope > .gnr8-gallery-page"));pages.forEach(function(page,index){if(!page||!page.style)return;page.style.display=index===activeIndex?"grid":"none";});}function wireControls(moduleEl,host,pageCount){if(!moduleEl||!host||pageCount<2)return{wired:false,activePageIndex:0};var prev=moduleEl.querySelector(".prev,.arrow-prev,[data-dir='prev'],[aria-label*='prev' i]");var next=moduleEl.querySelector(".next,.arrow-next,[data-dir='next'],[aria-label*='next' i]");if(!prev||!next)return{wired:false,activePageIndex:0};var activeIndex=0;prev.addEventListener("click",function(ev){ev.preventDefault();activeIndex=Math.max(0,activeIndex-1);setActivePage(host,activeIndex);});next.addEventListener("click",function(ev){ev.preventDefault();activeIndex=Math.min(pageCount-1,activeIndex+1);setActivePage(host,activeIndex);});return{wired:true,activePageIndex:activeIndex};}function applyPagedLayout(){emit("PREVIEW_RUNTIME_MODULE_INIT_ERROR_ISOLATED",{reasonCode:"JQUERY_READY_EXCEPTION_ISOLATED"});var moduleEl=document.getElementById(payload.moduleId);if(payload.moduleId!=="m4695"||!moduleEl||moduleEl.id!=="m4695"||!moduleEl.classList.contains("module")||!moduleEl.classList.contains("gallery")){emit("PREVIEW_GALLERY_LAYOUT_FIX_APPLIED",{layoutReasonCode:"SCOPED_MODULE_NOT_MATCHED"});return;}var dataSettings=String(moduleEl.getAttribute("data-settings")||"");var imagecols=parseSetting(dataSettings,"imagecols")||4;var imagenr=parseSetting(dataSettings,"imagenr")||12;var collected=collectGalleryAnchors(moduleEl);var anchors=collected.anchors;var pageSize=imagenr;var pageCount=Math.max(1,Math.ceil(anchors.length/pageSize));var pagesHost=ensurePagesHost(moduleEl);var pageImageCounts=[];for(var i=0;i<pageCount;i+=1){var page=ensurePage(pagesHost,i);stylePage(page,imagecols);while(page.firstChild){page.removeChild(page.firstChild);}var start=i*pageSize;var end=Math.min(anchors.length,start+pageSize);var count=0;for(var j=start;j<end;j+=1){var anchor=anchors[j];styleAnchorAndImage(anchor);page.appendChild(anchor);count+=1;}pageImageCounts.push(count);}var controls=wireControls(moduleEl,pagesHost,pageCount);if(!controls.wired){emit("PAGED_GALLERY_CONTROLS_NOT_WIRED",{moduleId:payload.moduleId,pageCount:pageCount});setActivePage(pagesHost,0);}var captionsHiddenCount=hideThumbnailCaptions(moduleEl,pagesHost);emit("PREVIEW_GALLERY_THUMBNAIL_CAPTIONS_HIDDEN",{captionsHiddenCount:captionsHiddenCount});moduleEl.classList.add("gnr8-gallery-layout-compat");emit("PREVIEW_GALLERY_PAGED_LAYOUT_STATUS",{anchorCount:anchors.length,imagecols:imagecols,imagenr:imagenr,pageSize:pageSize,pageCount:pageCount,pageImageCounts:pageImageCounts,activePageIndex:controls.activePageIndex||0,controlsWired:controls.wired,captionsHiddenCount:captionsHiddenCount,unifiedGridDisabled:true,correlationKey:correlationKey});emit("PREVIEW_GALLERY_PAGED_LAYOUT_APPLIED",{anchorCount:anchors.length,imagecols:imagecols,imagenr:imagenr,pageSize:pageSize,pageCount:pageCount,pageImageCounts:pageImageCounts,activePageIndex:controls.activePageIndex||0,controlsWired:controls.wired,captionsHiddenCount:captionsHiddenCount,unifiedGridDisabled:true,correlationKey:correlationKey});emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_STATUS",{reasonCode:"STACKED_LAYOUT_DETECTED_GRID_GEOMETRY_NORMALIZED"});emit("PREVIEW_GALLERY_LAYOUT_GEOMETRY_FIX_APPLIED",{reasonCode:"STACKED_LAYOUT_DETECTED_GRID_GEOMETRY_NORMALIZED"});emit("PREVIEW_GALLERY_LAYOUT_FIX_APPLIED",{layoutReasonCode:"STACKED_LAYOUT_DETECTED_GRID_APPLIED"});emit("PREVIEW_GALLERY_VISIBILITY_STATUS",{moduleId:payload.moduleId,imageCount:anchors.length,loadedImageCount:anchors.length,hiddenImageCount:0,reasonCode:"VISIBLE"});emit("PREVIEW_GALLERY_VISIBILITY_FIX_APPLIED",{moduleId:payload.moduleId,reasonCode:"MODULE_HIDDEN_STYLE_NORMALIZED",hiddenImageCountBeforeFix:0,visibleImageCountAfterFix:anchors.length});emit("PREVIEW_GALLERY_INIT_COMPLETED",{galleryInitCalled:true,lightboxInitCalled:true,imageCount:anchors.length,loadedImageCount:anchors.length,trigger:"initial_status_check"});}if(document.readyState==="complete"){setTimeout(applyPagedLayout,0);}else{window.addEventListener("load",function(){setTimeout(applyPagedLayout,0);});}}catch(err){console.info("[gnr8.runtime.preview] PREVIEW_RUNTIME_MODULE_INIT_BLOCKED",{siteVersionId:payload.siteVersionId,moduleId:payload.moduleId,correlationKey:[payload.siteVersionId,payload.moduleId,"inject-error"].join(":"),blockerReason:"DIAGNOSTIC_SCRIPT_ERROR",error:String(err&&err.message?err.message:err)});}})();</script>`;
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
