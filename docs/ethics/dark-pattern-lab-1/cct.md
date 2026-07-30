# Promise 1: Equal Visual Weight Promise
This promise ensures that the user's choice is not biased by "Visual Hierarchy" (misdirection dark pattern where the 'Accept' button is bright and the 'Decline' button is grey).

# Promise 2: No Friction Asymmetry Promise
This promise ensures that saying "No" is just as easy as saying "Yes" (the "Decline" path doesn't have several "Are you sure?" modals).

| Clause | Control | Test | Enforcement point |
| --- | --- | --- | --- | 
| "The 'Accept' and 'Continue without' buttons must have identical CSS values for background color, font weight, and dimensions" | A shared UI ConsentButton component that inherits a single style definition for both options. | Automated CSS Audit: A test script queries the computed style of both elements. It returns a "Fail" if the background-color or height/width properties differ by more than 0. | Global CSS / Styled Components library. | 
| "The 'Continue without data sharing' path must reach the 'Preference Saved' state in exactly one click" | The UI logic maps both button click events directly to the final SavePreference function without any interstitial logic. | E2E Interaction Test: A Playwright/Cypress test simulates a user click on the 'Decline' button and asserts the presence of the "Preference Saved" message; fails if any other modal or 'Confirm' button appears first. | Frontend Application Router / State Transition logic. | 