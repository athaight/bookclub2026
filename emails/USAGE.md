# Book Bros Email Template - Usage Guide

## Quick Start

This template uses [React Email](https://react.email/) components and is designed to work with [Resend](https://resend.com/).

### Installation

If you haven't already, install the required packages:

```bash
npm install @react-email/components resend
# or
pnpm add @react-email/components resend
```

### Previewing Emails Locally

```bash
npx react-email dev
```

This opens a local preview at `http://localhost:3000` where you can see your email renders.

---

## Template Structure

The template is built with modular, reusable components:

### Available Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `NewFeature` | Highlight a new feature | `name`, `description`, `details[]` (optional) |
| `Improvement` | Show improvements to existing features | `name`, `details[]` |
| `BugFix` | List bug fixes | `area`, `fixes[]` |
| `ComingSoonItem` | Tease upcoming features | `label` ("In Progress" \| "Future"), `name`, `description` (optional) |
| `FeatureSection` | Wrapper with a heading | `title`, `children` |

---

## Customizing for a New Email

### Step 1: Update the Config

```tsx
const config = {
  previewText: "Your inbox preview text here",
  greeting: "Hey Book Bros,",
  introText: "Your intro paragraph here.",
};
```

### Step 2: Mix and Match Sections

Simply add, remove, or reorder the components inside `<FeatureSection>`:

```tsx
{/* Only showing new features this time */}
<FeatureSection title="What's New in Book Bros!">
  <NewFeature
    name="Recommendations"
    description="Share book recommendations with your fellow bros!"
    details={[
      "Recommend any book from your library",
      "See what others have recommended for you",
      "One-click add to your reading list",
    ]}
  />
</FeatureSection>

{/* Skip the "Still Cooking" section entirely by removing it */}

{/* Or add multiple bug fix areas */}
<FeatureSection title="Bug Squashing">
  <BugFix
    area="Library Page"
    fixes={["Fixed sorting by date read", "Resolved duplicate book issue"]}
  />
  <BugFix
    area="Search"
    fixes={["Fixed crash when searching with special characters"]}
  />
</FeatureSection>
```

### Step 3: Enable Social Links (When Ready)

In the footer section, uncomment the social links block:

```tsx
{/* Social Links - Uncomment when ready */}
<Section style={socialLinksStyle}>
  <Link href="https://twitter.com/bookbros" style={socialLinkStyle}>Twitter</Link>
  <Text style={socialDividerStyle}> • </Text>
  <Link href="https://instagram.com/bookbros" style={socialLinkStyle}>Instagram</Link>
</Section>
```

And uncomment the corresponding styles at the bottom of the file.

### Step 4: Add Your Logo (When Ready)

Replace the text logo with an image:

```tsx
<Section style={headerStyle}>
  <Link href="https://bookbrosbookclub.com" style={logoLinkStyle}>
    <Img 
      src="https://bookbrosbookclub.com/logo.png" 
      width="40" 
      height="40" 
      alt="Book Bros" 
    />
    <Text style={logoTextStyle}>Book Bros Book Club</Text>
  </Link>
</Section>
```

---

## Sending with Resend

### Basic Send Example

```typescript
import { Resend } from 'resend';
import BookBrosUpdateEmail from './emails/BookBrosUpdate';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendUpdateEmail() {
  const { data, error } = await resend.emails.send({
    from: 'Andy <andy@bookbrosbookclub.com>', // Must be verified domain
    to: ['bro1@email.com', 'bro2@email.com', 'bro3@email.com'],
    subject: '📚 Book Bros Update: Wishlist & Improved Search!',
    react: BookBrosUpdateEmail({}),
  });

  if (error) {
    console.error('Failed to send:', error);
    return;
  }

  console.log('Email sent:', data?.id);
}
```

### With Custom Config

```typescript
import BookBrosUpdateEmail from './emails/BookBrosUpdate';

resend.emails.send({
  from: 'Andy <andy@bookbrosbookclub.com>',
  to: ['...'],
  subject: '📚 New Book Bros Feature: Recommendations!',
  react: BookBrosUpdateEmail({
    config: {
      previewText: "You can now share book recommendations!",
      greeting: "What's up Book Bros!",
      introText: "Big update today — the feature you've been waiting for is here.",
    },
  }),
});
```

---

## Color Reference

The template uses these colors (easy to customize in the styles section):

| Element | Color | Hex |
|---------|-------|-----|
| Header Background | Dark Navy | `#1a1a2e` |
| New Feature Accent | Indigo | `#6366f1` |
| Improvement Accent | Emerald | `#10b981` |
| Bug Fix Accent | Amber | `#f59e0b` |
| In Progress Accent | Violet | `#8b5cf6` |
| Future Accent | Slate | `#64748b` |
| Body Text | Gray | `#4a5568` |
| Background | Light Gray | `#f6f9fc` |

---

## File Structure Suggestion

```
your-project/
├── emails/
│   ├── BookBrosUpdate.tsx      # Main template
│   └── components/             # Optional: Extract components here
│       ├── NewFeature.tsx
│       ├── Improvement.tsx
│       └── ...
├── lib/
│   └── resend.ts               # Resend client setup
└── app/
    └── api/
        └── send-email/
            └── route.ts        # API route to trigger emails
```

---

## Tips

1. **Test before sending**: Always use `npx react-email dev` to preview
2. **Check spam filters**: Send a test to yourself first
3. **Keep it scannable**: The current structure works well—don't overload sections
4. **Mobile-friendly**: The template is responsive, but always test on mobile

Questions or issues? You know where to find me! 📚
