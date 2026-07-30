# Dark ToS Acceptance Design

### Screen Description

- Full-screen modal blocking the app.
- Big friendly headline:  
  “We’ve updated things to make your experience better
- Subtext (small, grey):  
  “Please take a moment to review our updated Terms.”

- Center of the screen:
  - Huge, bright blue [ Accept & Continue ] button
  - Under it, tiny grey link: “Review settings”
  - Even smaller, low-contrast link: “Maybe later”

- Fine print in a collapsed accordion: “By continuing, you agree to our updated Terms, including data sharing with trusted partners.”

- A fake progress bar at the top: “Final step! 1 of 1”

- Warning text near the bottom: “Not accepting may result in limited or interrupted access to features you rely on.”

- If user clicks “Review settings”:
  - They are taken to a long, dense wall of text.
  - The "Accept" button follows them (sticky footer).
  - The "Decline" option is hidden behind: “More options” → “Advanced” → “Manage data preferences”

- Decline flow:
  - Modal:  
    “Are you sure you want a worse experience?”  
    “You may lose personalization, recommendations, and important features.”

  Buttons:
  - [ Go Back and Accept ] (bright, large)
  - [ Continue with Limited Experience ] (small, grey, scary wording)

- Add time pressure:
  - Banner: “Please accept within 24 hours to avoid service disruption.”



## Techniques Used (Dark Patterns)

### 1. Visual Hierarchy Manipulation
- Accept button is bright, large, in the center
- Decline is grey, small, buried in menus

### 2. Language Manipulation
- “Accept & Continue” instead of “Accept data sharing”
- “Trusted partners” instead of “third parties”
- “Limited experience” instead of “no consent”

### 3. Friction Asymmetry
- Accept = 1 click
- Decline = 5+ clicks, multiple scary screens

### 4. Obscuring Important Terms
- Data sharing is:
  - In collapsed accordion
  - In long legal text
  - Never shown in a clear bullet point

### 5. Time Pressure
- Fake urgency: “24 hours or lose access”
- Fake progress: “Final step!”

### 6. Shame & Fear
- “Worse experience”
- “Lose features you rely on”
- “Interrupted service”

### 7. Misdirection
- Headline frames it as positive
- Sounds like a harmless update
- The real decision (data sharing) is hidden