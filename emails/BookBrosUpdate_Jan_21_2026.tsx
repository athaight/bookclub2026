import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// ============================================
// COPY THIS FILE FOR EACH NEW EMAIL
// Then customize the content below
// ============================================

// ============================================
// 1. UPDATE THESE FOR EACH EMAIL
// ============================================

const EMAIL_CONFIG = {
  previewText: "UPDATE: Cool new chat features",
  subject: "📚 Book Bros Update: Chatty Kathys", // For reference when sending
  greeting: "Hey Book Bros,",
  introText: `I added a cool new feature to the site... chats. 
   
  The Book of the Month now has a chat towards the bottom of the page where we can discuss the book of the month.`,
};

// ============================================
// 2. UPDATE YOUR CONTENT SECTIONS BELOW
// ============================================

export const BookBrosUpdateEmail = () => {
  return (
    <Html>
      <Head />
      <Preview>{EMAIL_CONFIG.previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* HEADER */}
          <Section style={headerStyle}>
            <Link href="https://bookbrosbookclub.com" style={logoLinkStyle}>
              <Text style={logoTextStyle}>📚 Book Bros Book Club</Text>
            </Link>
          </Section>

          {/* GREETING */}
          <Section style={contentStyle}>
            <Text style={greetingStyle}>{EMAIL_CONFIG.greeting}</Text>
            <Text style={introStyle}>{EMAIL_CONFIG.introText}</Text>
          </Section>

          {/* ========== WHAT'S NEW SECTION ========== */}
          {/* Uncomment and customize the blocks you need */}
          
          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionHeadingStyle}>
              What's New in Book Bros!
            </Heading>

            {/* NEW FEATURE BLOCK */}
            <div style={featureBlockStyle}>
              <Text style={featureLabelStyle}>✨ New Feature</Text>
              <Text style={featureNameStyle}>Chats for Book of the Month and our Libraries.</Text>
              <Text style={featureLabelStyle}>Overview</Text>
              <ul style={listStyle}>
                <li style={listItemStyle}>Available in the Book of the Month</li>
                <li style={listItemStyle}>Available in the Libraries section</li>
                <li style={listItemStyle}>Mention others with <strong>@</strong></li>
                <li style={listItemStyle}>Check your SPAM folder in your email client and mark as "not spam"</li>
              </ul>
              <br />
              <Text style={featureLabelStyle}>TL;DR</Text>
              <Text style={featureDescStyle}>
                 The Chat has a capability of mentioning someone by typing <strong>@</strong> and the user name, this feature is also availble in the Libraries section, just be logged in and you'll see a chat icon, that will open that chat window for that particular book
  <br /><br />
  <strong>Important note:</strong> The chat is public to all logged in users, so please be respectful and kind in your messages. If you see anything inappropriate, please let me know right away so I can address it.
  <br /><br />
  In order to make sure you receive notifications for chat mentions and new messages, please check your SPAM folder and mark the email as "not spam". 
  Also, check your profile settings to ensure notifications are enabled (Admin button in the footer will take you there).
              </Text>
              
            </div>

            {/* IMPROVEMENT BLOCK - Uncomment if needed
            <div style={{ ...featureBlockStyle, borderLeftColor: "#10b981" }}>
              <Text style={{ ...featureLabelStyle, color: "#10b981" }}>⚡ Improved</Text>
              <Text style={featureNameStyle}>Area Improved</Text>
              <ul style={listStyle}>
                <li style={listItemStyle}>Improvement 1</li>
                <li style={listItemStyle}>Improvement 2</li>
              </ul>
            </div>
            */}

            { /* BUG FIX BLOCK - Uncomment if needed 8 */ }
            <div style={{ ...featureBlockStyle, borderLeftColor: "#f59e0b" }}>
              <Text style={{ ...featureLabelStyle, color: "#f59e0b" }}>🐛 Bug Fixes</Text>
              <Text style={featureNameStyle}>iOS sorting of Top Ten</Text>
              <ul style={listStyle}>
                <li style={listItemStyle}>Issue 1 fixed: iOS users can now sort the Top Ten list correctly</li>
                <li style={listItemStyle}>Issue 2 unfixed: Users still use iPhones LOL</li>
              </ul>
            </div>
          
          </Section>

          <Hr style={dividerStyle} />

          {/* CTA BUTTON */}
          <Section style={ctaSectionStyle}>
            <Button style={ctaButtonStyle} href="https://bookbrosbookclub.com">
              Visit Book Bros Book Club
            </Button>
          </Section>

          {/* CLOSING */}
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

          {/* FOOTER */}
          <Section style={footerStyle}>
            {/* Social Links - Uncomment when ready
            <Section style={{ marginBottom: "16px" }}>
              <Link href="https://twitter.com/bookbros" style={footerLinkStyle}>Twitter</Link>
              <Text style={{ color: "#cbd5e1", fontSize: "13px", display: "inline" }}> • </Text>
              <Link href="https://instagram.com/bookbros" style={footerLinkStyle}>Instagram</Link>
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
// STYLES (Generally don't need to change these)
// ============================================

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
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

const logoLinkStyle: React.CSSProperties = { textDecoration: "none" };

const logoTextStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "600",
  margin: 0,
};

const contentStyle: React.CSSProperties = { padding: "32px" };

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
  whiteSpace: "pre-line",
};

const sectionStyle: React.CSSProperties = { padding: "0 32px 24px 32px" };

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

const listStyle: React.CSSProperties = { margin: "8px 0 0 0", paddingLeft: "20px" };

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

const closingStyle: React.CSSProperties = { padding: "0 32px 32px 32px" };

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
