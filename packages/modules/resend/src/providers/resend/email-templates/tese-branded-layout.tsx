import * as React from "react"

const TESE_LOGO_URL = "https://marketplace.tese.io/logo-white.png"
const BLACK = "#000000"
const LIME = "#bbdb48"
const PAGE_BG = "#f7f8f9"
const BODY = "#333333"
const FONT = "'Poppins', Helvetica, Arial, sans-serif"
const TESE_FOOTER_IMG =
  "https://assets.unlayer.com/projects/0/1750942897170-Footer.jpg?w=1000px"
const TESE_LINKEDIN_ICON =
  "https://cdn.tools.unlayer.com/social/icons/squared-black/linkedin.png"

type TeseBrandedLayoutProps = {
  children: React.ReactNode
  previewText?: string
  footerNote?: string
  headline?: string
  limeWord?: string
}

/**
 * Shared Tese brand chrome for Medusa/Resend React email templates.
 * Matches tese-backend teseBrandedShell (black / lime Report Link design).
 */
export const TeseBrandedLayout: React.FC<TeseBrandedLayoutProps> = ({
  children,
  previewText,
  footerNote,
  headline,
  limeWord,
}) => {
  let headlineNode: React.ReactNode = null
  if (headline) {
    if (limeWord && headline.includes(limeWord)) {
      const idx = headline.indexOf(limeWord)
      headlineNode = (
        <h1
          style={{
            margin: "28px 0 0",
            fontFamily: FONT,
            fontSize: 28,
            lineHeight: 1.3,
            fontWeight: 600,
            color: "#ffffff",
          }}
        >
          {headline.slice(0, idx)}
          <span style={{ color: LIME }}>{limeWord}</span>
          {headline.slice(idx + limeWord.length)}
        </h1>
      )
    } else {
      headlineNode = (
        <h1
          style={{
            margin: "28px 0 0",
            fontFamily: FONT,
            fontSize: 28,
            lineHeight: 1.3,
            fontWeight: 600,
            color: "#ffffff",
          }}
        >
          {headline}
        </h1>
      )
    }
  }

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        backgroundColor: PAGE_BG,
        fontFamily: FONT,
      }}
    >
      {/* Web font — supported in Apple Mail / some Gmail clients; falls back to Helvetica/Arial */}
      <div style={{ display: "none" }}>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}
      </div>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}
      </style>
      {previewText ? (
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden" }}>
          {previewText}
        </div>
      ) : null}
      <table
        role="presentation"
        width="100%"
        cellSpacing={0}
        cellPadding={0}
        style={{ backgroundColor: PAGE_BG, padding: "24px 12px" }}
      >
        <tbody>
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellSpacing={0}
                cellPadding={0}
                style={{
                  maxWidth: 560,
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        backgroundColor: BLACK,
                        padding: "28px 32px 24px",
                      }}
                    >
                      <img
                        src={TESE_LOGO_URL}
                        alt="tese.io"
                        width={120}
                        style={{ display: "block", border: 0, maxWidth: 120 }}
                      />
                      {headlineNode}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: 32,
                        color: BODY,
                        fontSize: 15,
                        lineHeight: 1.7,
                      }}
                    >
                      {children}
                      <p style={{ margin: "28px 0 0", color: BODY, fontSize: 15 }}>
                        The Tese.io team
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="center"
                      style={{ padding: 0, backgroundColor: BLACK }}
                    >
                      <img
                        src={TESE_FOOTER_IMG}
                        alt="Connecting capital to sustainable impact."
                        width={560}
                        style={{
                          display: "block",
                          border: 0,
                          width: "100%",
                          maxWidth: 560,
                          height: "auto",
                        }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="center"
                      style={{
                        padding: "12px 24px 24px",
                        backgroundColor: BLACK,
                      }}
                    >
                      <a
                        href="https://www.linkedin.com/company/tese-io"
                        style={{ textDecoration: "none" }}
                      >
                        <img
                          src={TESE_LINKEDIN_ICON}
                          width={24}
                          height={24}
                          alt="LinkedIn"
                          style={{ display: "inline-block", border: 0 }}
                        />
                      </a>
                      {footerNote ? (
                        <p
                          style={{
                            margin: "12px 0 0",
                            fontSize: 11,
                            color: "#bbbbbb",
                          }}
                        >
                          {footerNote}
                        </p>
                      ) : null}
                      <p
                        style={{
                          margin: "12px 0 0",
                          fontSize: 11,
                          color: "#bbbbbb",
                        }}
                      >
                        © {new Date().getFullYear()} Tese.io. All rights
                        reserved.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export const teseCtaStyle: React.CSSProperties = {
  display: "inline-block",
  background: LIME,
  color: BLACK,
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 700,
  fontFamily: FONT,
  padding: "12px 28px",
  borderRadius: 4,
}

export const teseHeadingStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 22,
  lineHeight: 1.35,
  color: BLACK,
  fontWeight: 700,
  fontFamily: FONT,
}

export const teseMutedStyle: React.CSSProperties = {
  color: "#555555",
  fontSize: 14,
}

export { BLACK as TEAL, LIME, TESE_LOGO_URL, BLACK }
