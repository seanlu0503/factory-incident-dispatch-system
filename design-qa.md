# Design QA

final result: passed

## Reference

- Project: Factory Incident & Maintenance Dispatch System.
- Goal: A portfolio-ready manufacturing incident report and maintenance dispatch demo.
- Target use: public GitHub Pages link for job platforms and interviews.

## Checks

- Production build: passed with `npm.cmd run build`.
- Local server: passed, `http://127.0.0.1:5174` returned HTTP 200.
- Desktop visual QA: passed, captured `outputs/factory-incident-dispatch-desktop.png`.
- Mobile visual QA: passed after fixing headline wrapping and horizontal overflow, captured `outputs/factory-incident-dispatch-mobile.png`.
- Core interactions implemented:
  - create new incident report
  - filter incidents by line, status, and severity
  - select incident cards from dispatch board
  - assign owner
  - advance incident status
  - edit cause, action, and prevention fields
  - recalculate KPI and analytics from current incident data

## Notes

- Edge headless may emit Chromium task-manager warnings during screenshots; screenshots were still written successfully.
- This is a frontend portfolio demo using simulated data. No real factory, personal, customer, token, or credential data is included.
