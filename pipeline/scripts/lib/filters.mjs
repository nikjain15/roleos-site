// Title + location filters. Pure functions; consumed by scan + verify.

export function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());

  return (title) => {
    const lower = (title || '').toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

export function buildLocationFilter(locationFilter) {
  const include = (locationFilter?.include_keywords || []).map(k => k.toLowerCase());
  const flagUnclear = (locationFilter?.flag_unclear_keywords || []).map(k => k.toLowerCase());
  const excludeIfOnly = (locationFilter?.exclude_if_only || []).map(k => k.toLowerCase());

  return (location) => {
    const lower = (location || '').toLowerCase().trim();
    if (!lower) return { keep: true, unclear: true };

    const hasInclude = include.some(k => lower.includes(k));
    if (hasInclude) return { keep: true, unclear: false };

    const matchesExclude = excludeIfOnly.some(k => lower.includes(k));
    if (matchesExclude) return { keep: false, unclear: false };

    const matchesUnclearOnly = flagUnclear.some(k => lower.includes(k));
    if (matchesUnclearOnly) return { keep: true, unclear: true };

    return { keep: true, unclear: true };
  };
}
