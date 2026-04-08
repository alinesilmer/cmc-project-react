Act as a senior frontend architect specializing in React + TypeScript refactoring, performance, and secure export flows.

I will give you my `FilterModal` folder. It currently manages filtering plus PDF/Excel downloads from filtered data.

I need you to:
- audit it deeply
- detect bugs, inconsistencies, and fragile logic
- fix everything necessary
- optimize performance
- improve security/defensive programming
- modularize it smartly so files stay under 200 lines when possible

### Main requirements
- Filtering must be correct and stable
- PDF export must work correctly
- Excel export must work correctly
- Exported data must match the filtered data shown in UI
- Code must be production-ready
- Code must be easy to maintain and review later

### Refactor standards
- separate concerns cleanly
- extract helpers/hooks/services/types where useful
- remove duplicate logic
- reduce file size and complexity
- avoid unnecessary re-renders and recomputations
- add proper error handling and guard clauses
- preserve existing behavior unless fixing a real bug

### Output format
1. Audit findings
2. Proposed folder structure
3. Full final code for all changed files
4. Short explanation of important fixes

### Important
- Do not stop at suggestions
- Do not return incomplete code
- Do not leave TODOs unless absolutely unavoidable
- Make reasonable engineering decisions yourself
- Prefer robust, clean, practical solutions over theoretical ones

I’ll paste the current folder now.