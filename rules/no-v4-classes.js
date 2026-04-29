"use strict";

function maskNonTemplateRegions(source) {
  let s = source;
  s = s.replace(/^---[\s\S]*?^---\s*\r?\n/m, (m) => " ".repeat(m.length));
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) =>
    " ".repeat(m.length),
  );
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) =>
    " ".repeat(m.length),
  );
  return s;
}

function replaceDirectionalSpacing(whole) {
  const m = whole.match(/^(m|p)(l|r)-(?:(sm|md|lg|xl)-)?([0-5]|auto)$/);
  if (!m) {
    return null;
  }
  const [, property, side, breakpoint, value] = m;
  const newSide = side === "l" ? "s" : "e";
  const bpPart = breakpoint ? `${breakpoint}-` : "";
  return `${property}${newSide}-${bpPart}${value}`;
}

function replaceBorderDirection(whole) {
  const m = whole.match(/^border-(left|right)(-0)?$/);
  if (!m) {
    return null;
  }
  const [, side, zeroSuffix = ""] = m;
  return `border-${side === "left" ? "start" : "end"}${zeroSuffix}`;
}

function replaceRoundedDirection(whole) {
  if (whole === "rounded-left") {
    return "rounded-start";
  }
  if (whole === "rounded-right") {
    return "rounded-end";
  }
  return null;
}

const SIMPLE_CLASS_REPLACEMENTS = {
  "sr-only": "visually-hidden",
  "sr-only-focusable": "visually-hidden-focusable",
  "text-left": "text-start",
  "text-right": "text-end",
  "float-left": "float-start",
  "float-right": "float-end",
  "dropdown-menu-left": "dropdown-menu-start",
  "dropdown-menu-right": "dropdown-menu-end",
  "text-monospace": "font-monospace",
  "font-italic": "fst-italic",
  "no-gutters": "g-0",
  "badge-primary": "bg-primary",
  "badge-secondary": "bg-secondary",
  "badge-success": "bg-success",
  "badge-danger": "bg-danger",
  "badge-warning": "bg-warning text-dark",
  "badge-info": "bg-info text-dark",
  "badge-light": "bg-light text-dark",
  "badge-dark": "bg-dark",
  "form-control-file": "form-control",
  "form-control-range": "form-range",
  "custom-select": "form-select",
};

function replaceSimpleClass(whole) {
  return SIMPLE_CLASS_REPLACEMENTS[whole] ?? null;
}

function replaceFontWeight(whole) {
  const m = whole.match(/^font-weight-(light|normal|bold|bolder|lighter)$/);
  return m ? `fw-${m[1]}` : null;
}

function replaceDataAttrPrefix(whole) {
  return whole.replace("data-", "data-bs-");
}

const PATTERNS = [
  {
    regex: /\b(?:m|p)(?:l|r)-(?:(?:sm|md|lg|xl)-)?(?:[0-5]|auto)\b/g,
    describe:
      "v4 directional spacing utility; use start/end variants (ms-*, me-*, ps-*, pe-*)",
    fix: replaceDirectionalSpacing,
  },
  {
    regex: /\bborder-(?:left|right)(?:-0)?\b/g,
    describe: "v4 directional border utility; use border-start/border-end",
    fix: replaceBorderDirection,
  },
  {
    regex: /\brounded-(?:left|right)\b/g,
    describe: "v4 directional rounded utility; use rounded-start/rounded-end",
    fix: replaceRoundedDirection,
  },
  {
    regex:
      /\b(?:sr-only|sr-only-focusable|text-left|text-right|float-left|float-right|dropdown-menu-left|dropdown-menu-right|text-monospace|font-italic|no-gutters|badge-(?:primary|secondary|success|danger|warning|info|light|dark)|form-control-file|form-control-range|custom-select)\b/g,
    describe: "Bootstrap v4 class renamed or removed in v5",
    fix: replaceSimpleClass,
  },
  {
    regex: /\bfont-weight-(?:light|normal|bold|bolder|lighter)\b/g,
    describe: "v4 font-weight utility; use fw-*",
    fix: replaceFontWeight,
  },
  {
    regex:
      /\b(?:form-group|form-row|form-inline|custom-control|custom-control-inline|custom-control-input|custom-control-label|custom-checkbox|custom-radio|custom-switch|custom-file|custom-file-input|custom-file-label)\b/g,
    describe:
      "v4 form helper class removed in v5; migrate to grid spacing, .row, and .form-check/.form-switch patterns",
  },
  {
    regex: /\b(?:input-group-append|input-group-prepend)\b/g,
    describe:
      "v4 input-group append/prepend wrapper removed in v5; place .input-group-text or buttons directly",
  },
  {
    regex: /\b(?:media|media-body)\b/g,
    describe:
      "v4 media object removed in v5; use flex utilities and spacing utilities instead",
  },
  {
    regex: /\b(?:jumbotron|card-deck|card-columns)\b/g,
    describe:
      "v4 component helper removed in v5; use utility classes and the grid system",
  },
  {
    regex:
      /\b(?:embed-responsive(?:-item)?|embed-responsive-(?:21by9|16by9|4by3|1by1))\b/g,
    describe:
      "v4 embed-responsive helper replaced by ratio and ratio-* classes",
  },
  {
    regex: /data-(?:toggle|target|dismiss|spy|ride|offset|interval|parent)=/g,
    describe: "v4 JavaScript data attribute; use data-bs-* prefix in v5",
    fix: replaceDataAttrPrefix,
  },
];

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Bootstrap v4 class and data-* patterns in favor of Bootstrap v5.",
    },
    messages: {
      forbidden:
        "Bootstrap v4 migration pattern detected ({{hint}}). Use Bootstrap v5 equivalents.",
    },
    fixable: "code",
    schema: [],
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      Program() {
        const text = maskNonTemplateRegions(sourceCode.getText());
        const seen = new Set();

        for (const entry of PATTERNS) {
          const { regex, describe, fix: fixFn } = entry;
          const r = new RegExp(regex.source, regex.flags);
          let m;
          while ((m = r.exec(text))) {
            const start = m.index;
            if (seen.has(start)) {
              continue;
            }
            seen.add(start);
            const end = start + m[0].length;
            const matchedText = m[0];
            const replacement = fixFn ? fixFn(matchedText) : null;

            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(start),
                end: sourceCode.getLocFromIndex(end),
              },
              messageId: "forbidden",
              data: { hint: describe },
              ...(replacement != null && replacement !== matchedText
                ? {
                    fix(fixer) {
                      return fixer.replaceTextRange([start, end], replacement);
                    },
                  }
                : {}),
            });
          }
        }
      },
    };
  },
};
