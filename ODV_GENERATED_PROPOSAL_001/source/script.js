(function () {
  var root = document.documentElement;
  root.dataset.generatedProposal = "ODV_GENERATED_PROPOSAL_001";
  root.dataset.quarantineState = "quarantined";
  root.dataset.sourceExportId = "odv-export-25b18a7102ed29c2";

  var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav a[href^="#"]'));

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      links.forEach(function (item) {
        item.removeAttribute("aria-current");
      });
      link.setAttribute("aria-current", "location");
    });
  });
}());
