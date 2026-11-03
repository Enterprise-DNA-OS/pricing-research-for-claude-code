# Price perceptions and their limits

This implementation uses the four-question Van Westendorp method. The [vendor's manual calculation guide](https://conjointly.com/guides/manual-calculation-of-van-westendorp/) describes the cumulative-count convention. Checked 3 November 2026.

Eligible responses are complete, have all four nonnegative numeric prices in nondecreasing order and have no active review exclusion. Every eligible respondent has weight one. The price grid contains every distinct observed threshold. At each price, count too-cheap and cheap answers at or above it, and expensive and too-expensive answers at or below it. Divide each count by the eligible sample.

The four intersections pair too-cheap with expensive, cheap with too-expensive, too-cheap with too-expensive, and cheap with expensive. Intersections use straight-line interpolation between adjacent observed price levels. Flat equality returns both endpoints, not a chosen midpoint. The base labels the third pair extreme balance. It is not a profit, revenue or demand optimum.

The minimum sample is a local research policy set when creating the study. It is not a legal threshold or proof of statistical power. Summary intersections and pricing decisions are withheld below it. Raw exploratory curves remain visible with a warning. Each segment is checked independently against the same threshold. No confidence interval or population representativeness is claimed.

A saved decision records its exact sample IDs and hashes, method version, curve values, study units and summary. Subsequent exclusions do not recalculate that snapshot. Decisions concern the whole study; segment results can inform a separate research discussion but do not silently become a whole-study decision.

No imputation, weighting, pooling across studies, currency conversion, proprietary purchase-likelihood correction, automated price deployment or causal forecast is performed. Zero and tied thresholds are accepted as supplied, but the researcher must judge whether those answers make sense for the product and research design.
