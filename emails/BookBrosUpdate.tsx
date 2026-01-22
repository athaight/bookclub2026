import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// ============================================
// CONFIGURATION - Edit these for each email
// ============================================

interface EmailConfig {
  previewText: string;
  greeting?: string;
  introText: string;
}

// ============================================
// SECTION COMPONENTS - Mix and match as needed
// ============================================

interface FeatureSectionProps {
  title: string;
  children: React.ReactNode;
}

const FeatureSection = ({ title, children }: FeatureSectionProps) => (
  <Section style={sectionStyle}>
    <Heading as="h2" style={sectionHeadingStyle}>
      {title}
    </Heading>
    {children}
  </Section>
);

interface NewFeatureProps {
  name: string;
  description: string;
  details?: string[];
}

const NewFeature = ({ name, description, details }: NewFeatureProps) => (
  <div style={featureBlockStyle}>
    <Text style={featureLabelStyle}>✨ New Feature</Text>
    <Text style={featureNameStyle}>{name}</Text>
    <Text style={featureDescStyle}>{description}</Text>
    {details && details.length > 0 && (
      <ul style={listStyle}>
        {details.map((detail, index) => (
          <li key={index} style={listItemStyle}>
            {detail}
          </li>
        ))}
      </ul>
    )}
  </div>
);

interface ImprovementProps {
  name: string;
  details: string[];
}

const Improvement = ({ name, details }: ImprovementProps) => (
  <div style={featureBlockStyle}>
    <Text style={improvementLabelStyle}>⚡ Improved</Text>
    <Text style={featureNameStyle}>{name}</Text>
    <ul style={listStyle}>
      {details.map((detail, index) => (
        <li key={index} style={listItemStyle}>
          {detail}
        </li>
      ))}
    </ul>
  </div>
);

interface BugFixProps {
  area: string;
  fixes: string[];
}

const BugFix = ({ area, fixes }: BugFixProps) => (
  <div style={featureBlockStyle}>
    <Text style={bugfixLabelStyle}>🐛 Bug Fixes</Text>
    <Text style={featureNameStyle}>{area}</Text>
    <ul style={listStyle}>
      {fixes.map((fix, index) => (
        <li key={index} style={listItemStyle}>
          {fix}
        </li>
      ))}
    </ul>
  </div>
);

interface ComingSoonItemProps {
  label: "In Progress" | "Future";
  name: string;
  description?: string;
}

const ComingSoonItem = ({ label, name, description }: ComingSoonItemProps) => (
  <div style={comingSoonItemStyle}>
    <Text style={label === "In Progress" ? inProgressLabelStyle : futureLabelStyle}>
      {label === "In Progress" ? "🔧 In Progress" : "🔮 Future"}
    </Text>
    <Text style={comingSoonNameStyle}>{name}</Text>
    {description && <Text style={comingSoonDescStyle}>{description}</Text>}
  </div>
);

// ============================================
// MAIN EMAIL TEMPLATE
// ============================================

interface BookBrosUpdateEmailProps {
  config?: EmailConfig;
}

export const BookBrosUpdateEmail = ({
  config = {
    previewText: "Fresh updates to Book Bros are live!",
    greeting: "Hey Book Bros,",
    introText:
      "Some fresh updates to the site are live so here's a quick heads-up on what's new.",
  },
}: BookBrosUpdateEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{config.previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* ============ HEADER ============ */}
          <Section style={headerStyle}>
            <Link href="https://bookbrosbookclub.com" style={logoLinkStyle}>
              {/* Replace with actual logo when available */}
              {/* <Img src="https://bookbrosbookclub.com/logo.png" width="40" height="40" alt="Book Bros" /> */}
              <Text style={logoTextStyle}>📚 Book Bros Book Club</Text>
            </Link>
          </Section>

          {/* ============ GREETING ============ */}
          <Section style={contentStyle}>
            <Text style={greetingStyle}>{config.greeting}</Text>
            <Text style={introStyle}>{config.introText}</Text>
          </Section>

          {/* ============ WHAT'S NEW SECTION ============ */}
          <FeatureSection title="What's New in Book Bros!">
            <NewFeature
              name="Wishlist"
              description="You can now add books to your wishlist directly from any member's profile!"
              details={[
                "Click the bookmark icon next to any book you want to save for later",
                "When you're ready to read a wishlist book, move it to your library with one click",
              ]}
            />

            <Improvement
              name="Book Search"
              details={[
                "Search is now much smoother — no more lag while typing",
                "See more results (up to 30 books at a time)",
                'New "Load more results" button to find even more books',
                "Better author searches — searching for an author now shows more of their books",
              ]}
            />

            <BugFix
              area="Profiles Page"
              fixes={[
                "Fixed color mismatching between book genre color dots and pie chart colors",
              ]}
            />
          </FeatureSection>

          <Hr style={dividerStyle} />

          {/* ============ COMING SOON SECTION ============ */}
          <FeatureSection title="Still Cooking">
            <Text style={cookingIntroStyle}>I'm also actively working on:</Text>

            <ComingSoonItem
              label="In Progress"
              name="Recommendations"
              description="Sharing book recommendations with each other"
            />

            <ComingSoonItem
              label="In Progress"
              name="Profile Dashboard UI"
              description="Refining the overall look and feel"
            />

            <ComingSoonItem
              label="Future"
              name="Gamification v1.0: Badges"
            />
          </FeatureSection>

          <Hr style={dividerStyle} />

          {/* ============ CTA BUTTON ============ */}
          <Section style={ctaSectionStyle}>
            <Button style={ctaButtonStyle} href="https://bookbrosbookclub.com">
              Visit Book Bros Book Club
            </Button>
          </Section>

          {/* ============ CLOSING ============ */}
          <Section style={closingStyle}>
            <Text style={closingTextStyle}>
              If you spot anything weird, have ideas, or just want to say "hey, this
              rules," let me know.
            </Text>
            <Text style={closingTextStyle}>
              Thanks for being a bro and doing this site and club.
            </Text>
            <Text style={signoffStyle}>Here's to keeping the pages turning.</Text>
            <Text style={signatureStyle}>
              Webmaster and gay librarian,
              <br />
              <strong>Andy</strong>
            </Text>
          </Section>

          {/* ============ FOOTER ============ */}
          <Section style={footerStyle}>
            {/* Social Links - Uncomment when ready
            <Section style={socialLinksStyle}>
              <Link href="https://twitter.com/bookbros" style={socialLinkStyle}>Twitter</Link>
              <Text style={socialDividerStyle}> • </Text>
              <Link href="https://instagram.com/bookbros" style={socialLinkStyle}>Instagram</Link>
            </Section>
            */}
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} Book Bros Book Club
            </Text>
            <Link href="https://bookbrosbookclub.com" style={footerLinkStyle}>
              bookbrosbookclub.com
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BookBrosUpdateEmail;

// ============================================
// STYLES
// ============================================

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  margin: 0,
  padding: "40px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#1a1a2e",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const logoLinkStyle: React.CSSProperties = {
  textDecoration: "none",
};

const logoTextStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "600",
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  padding: "32px",
};

const greetingStyle: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const introStyle: React.CSSProperties = {
  color: "#4a5568",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 8px 0",
};

const sectionStyle: React.CSSProperties = {
  padding: "0 32px 24px 32px",
};

const sectionHeadingStyle: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0 0 20px 0",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: "8px",
};

const featureBlockStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "16px",
  borderLeft: "4px solid #6366f1",
};

const featureLabelStyle: React.CSSProperties = {
  color: "#6366f1",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const improvementLabelStyle: React.CSSProperties = {
  color: "#10b981",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const bugfixLabelStyle: React.CSSProperties = {
  color: "#f59e0b",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const inProgressLabelStyle: React.CSSProperties = {
  color: "#8b5cf6",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const futureLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const featureNameStyle: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const featureDescStyle: React.CSSProperties = {
  color: "#4a5568",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px 0",
};

const listStyle: React.CSSProperties = {
  margin: "8px 0 0 0",
  paddingLeft: "20px",
};

const listItemStyle: React.CSSProperties = {
  color: "#4a5568",
  fontSize: "14px",
  lineHeight: "1.6",
  marginBottom: "4px",
};

const cookingIntroStyle: React.CSSProperties = {
  color: "#4a5568",
  fontSize: "14px",
  margin: "0 0 16px 0",
};

const comingSoonItemStyle: React.CSSProperties = {
  backgroundColor: "#fafafa",
  borderRadius: "6px",
  padding: "12px 16px",
  marginBottom: "12px",
  borderLeft: "4px solid #e2e8f0",
};

const comingSoonNameStyle: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0",
};

const comingSoonDescStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  margin: "4px 0 0 0",
};

const dividerStyle: React.CSSProperties = {
  borderColor: "#e2e8f0",
  borderWidth: "1px",
  margin: "8px 32px 24px 32px",
};

const ctaSectionStyle: React.CSSProperties = {
  padding: "8px 32px 32px 32px",
  textAlign: "center" as const,
};

const ctaButtonStyle: React.CSSProperties = {
  backgroundColor: "#1a1a2e",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
  textAlign: "center" as const,
};

const closingStyle: React.CSSProperties = {
  padding: "0 32px 32px 32px",
};

const closingTextStyle: React.CSSProperties = {
  color: "#4a5568",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 12px 0",
};

const signoffStyle: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "15px",
  fontStyle: "italic",
  margin: "20px 0 16px 0",
};

const signatureStyle: React.CSSProperties = {
  color: "#4a5568",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: 0,
};

const footerStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  padding: "24px 32px",
  textAlign: "center" as const,
};

// Uncomment when social links are ready
// const socialLinksStyle: React.CSSProperties = {
//   marginBottom: "16px",
// };
// const socialLinkStyle: React.CSSProperties = {
//   color: "#6366f1",
//   fontSize: "13px",
//   textDecoration: "none",
// };
// const socialDividerStyle: React.CSSProperties = {
//   color: "#cbd5e1",
//   fontSize: "13px",
// };

const footerTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  margin: "0 0 4px 0",
};

const footerLinkStyle: React.CSSProperties = {
  color: "#6366f1",
  fontSize: "13px",
  textDecoration: "none",
};
