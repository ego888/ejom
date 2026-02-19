/**
 * Parses search tokens where:
 * - plain terms are OR terms
 * - +term tokens are required AND terms
 */
export const parseAdvancedSearchTerms = (search = "") => {
  const tokens = String(search)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const andTerms = [];
  const orTerms = [];

  for (const token of tokens) {
    if (token.startsWith("+")) {
      const term = token.slice(1).trim();
      if (term) andTerms.push(term);
      continue;
    }
    orTerms.push(token);
  }

  return { andTerms, orTerms };
};

/**
 * Builds a SQL LIKE clause with bound params from an advanced search query.
 * Returns an empty clause if no valid terms are present.
 */
export const buildAdvancedLikeSearchClause = ({ search = "", columns = [] }) => {
  if (!Array.isArray(columns) || columns.length === 0) {
    return { clause: "", params: [] };
  }

  const { andTerms, orTerms } = parseAdvancedSearchTerms(search);
  if (!andTerms.length && !orTerms.length) {
    return { clause: "", params: [] };
  }

  const params = [];
  const buildTermClause = (term) => {
    const subClause = columns.map((column) => `${column} LIKE ?`).join(" OR ");
    const likeValue = `%${term}%`;
    for (let i = 0; i < columns.length; i += 1) {
      params.push(likeValue);
    }
    return `(${subClause})`;
  };

  const clauses = [];

  for (const term of andTerms) {
    clauses.push(buildTermClause(term));
  }

  if (orTerms.length) {
    clauses.push(`(${orTerms.map((term) => buildTermClause(term)).join(" OR ")})`);
  }

  return {
    clause: clauses.join(" AND "),
    params,
  };
};
