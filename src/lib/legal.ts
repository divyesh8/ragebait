/**
 * Ragebait legal content — single source of truth for the Terms & Conditions.
 *
 * TERMS_VERSION is recorded against every acceptance so we can prove exactly
 * which version a given user agreed to. Bump it (and the effective date)
 * whenever the substance of the Terms changes materially; existing users
 * should then be re-prompted to accept the new version.
 *
 * The same structured document renders both the public /terms page and the
 * in-registration acceptance modal, so the two can never drift apart.
 */

export const TERMS_VERSION = "1.0.0";
export const TERMS_EFFECTIVE_DATE = "3 July 2026";

export interface LegalBlock {
  type: "p" | "ul";
  text?: string;
  items?: string[];
}

export interface LegalSection {
  id: string;
  number: number;
  title: string;
  blocks: LegalBlock[];
}

const p = (text: string): LegalBlock => ({ type: "p", text });
const ul = (items: string[]): LegalBlock => ({ type: "ul", items });

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    number: 1,
    title: "Acceptance of Terms",
    blocks: [
      p("These Terms & Conditions (the \"Terms\") form a binding legal agreement between you (\"you\", \"your\", or the \"User\") and Ragebait (\"Ragebait\", \"we\", \"us\", or \"our\"), governing your access to and use of the Ragebait platform, websites, applications, and related services (collectively, the \"Service\")."),
      p("By creating an account, checking the acceptance box presented during registration, or otherwise accessing or using the Service, you acknowledge that you have read, understood, and agree to be legally bound by these Terms, together with our Privacy Policy, Community Guidelines, and AI Moderation Policy, each of which is incorporated into these Terms by reference."),
      p("If you do not agree to these Terms in full, you must not create an account and must discontinue all use of the Service immediately."),
    ],
  },
  {
    id: "eligibility",
    number: 2,
    title: "Eligibility",
    blocks: [
      p("To register for and use the Service, you must:"),
      ul([
        "Be at least the minimum age required to form a binding contract and to consent to the processing of your personal data in your jurisdiction, and in no event younger than thirteen (13) years of age;",
        "Provide accurate, current, and complete registration information, and keep that information up to date;",
        "Establish and maintain the security and confidentiality of your account credentials;",
        "Not create an account on behalf of, or while impersonating, any other person, entity, or fictitious identity; and",
        "Not be a user previously suspended or removed from the Service, unless expressly reinstated by Ragebait.",
      ]),
      p("Where applicable law imposes a higher minimum age for the use of online services or for data-processing consent, that higher age governs. We may require verification of your eligibility at any time."),
    ],
  },
  {
    id: "account",
    number: 3,
    title: "Account Responsibilities",
    blocks: [
      p("You are solely responsible for your account, your password and credentials, and all activity that occurs under your account, whether or not authorised by you. You agree to keep your credentials confidential and to notify us promptly of any unauthorised access to or use of your account."),
      p("We may suspend, restrict, or place additional verification requirements on any account that we reasonably believe has been compromised, is being used for suspicious or unauthorised activity, or is otherwise operated in violation of these Terms. You remain liable for losses arising from unauthorised use of your account resulting from your failure to safeguard your credentials."),
    ],
  },
  {
    id: "nature",
    number: 4,
    title: "Nature of the Platform",
    blocks: [
      p("Ragebait is a competitive entertainment platform on which users create or join battles to roast, debate, argue, joke, and compete using creativity, wit, humour, logic, and entertainment. Roasting, sarcasm, jokes, memes, banter, and competitive trash talk are expected and intended parts of gameplay."),
      p("Participation in the Service is voluntary. By participating, you acknowledge and accept that you may receive criticism, jokes, satire, or competitive insults directed at your submissions or your in-battle persona, within the limits set by these Terms and the Community Guidelines. Content exchanged during battles is competitive performance and is not intended as a sincere statement of fact about any real individual."),
      p("You participate at your own election and may withdraw from a battle or from the Service at any time, subject to the battle and fair-play rules below."),
    ],
  },
  {
    id: "ai-judging",
    number: 5,
    title: "AI Judging",
    blocks: [
      p("Battle outcomes on the Service are determined by Ragebait's artificial-intelligence judging systems (the \"AI\"). By participating, you agree that the AI determines battle results and that such decisions are final and binding for the purposes of gameplay, rankings, scoring, and rewards, save where Ragebait elects, in its sole discretion, to review or override a decision."),
      p("The AI evaluates the entirety of a battle, considering factors that include, without limitation:"),
      ul([
        "Creativity", "Originality", "Humour", "Relevance", "Confidence",
        "Reasoning", "Topic adherence", "Engagement", "Timing", "Audience impact",
      ]),
      p("Winning is never determined solely by the presence of profanity or strong language. The AI assesses overall context, intent, and the interplay of messages across the whole conversation rather than any single message in isolation."),
    ],
  },
  {
    id: "community-guidelines",
    number: 6,
    title: "Community Rules (Community Guidelines)",
    blocks: [
      p("The following conduct is permitted and forms part of normal, competitive gameplay:"),
      ul([
        "Friendly roasting", "Competitive banter", "Memes", "Satire", "Sarcasm",
        "Creative insults", "Gaming trash talk", "Fictional scenarios",
        "Strong language used competitively within the spirit of the game",
      ]),
      p("The following conduct is strictly prohibited and will result in enforcement action:"),
      ul([
        "Hate speech", "Support for or glorification of terrorism", "Racism",
        "Religious hatred", "Caste discrimination", "Ethnic discrimination",
        "Threats of violence", "Encouraging suicide or self-harm",
        "Child sexual abuse or exploitation material of any kind",
        "Doxxing or publishing another person's private information",
        "Sharing personal information without consent", "Blackmail or extortion",
        "Fraud", "Spam", "Malware or malicious code", "Illegal content",
        "Sexual exploitation", "Non-consensual explicit or intimate content",
      ]),
      p("This list is illustrative and not exhaustive. Ragebait, its moderation team, and the AI may remove any content, and restrict any account, that violates these rules or the spirit of fair, competitive play."),
    ],
  },
  {
    id: "ai-moderation",
    number: 7,
    title: "AI Content Moderation (AI Moderation Policy)",
    blocks: [
      p("The Service uses automated AI systems to review user-generated content in real time, both before and after publication, to detect and act on violations of these Terms and the Community Guidelines. Automated review distinguishes competitive roasting from genuine abuse using the surrounding context of the battle."),
      p("Where a violation is detected, moderation actions may include, individually or in combination:"),
      ul([
        "Warnings", "Score reductions", "Battle forfeits",
        "Temporary suspension of access to some or all features", "Permanent bans",
      ]),
      p("Moderation decisions may be reviewed by Ragebait administrators. No automated system is guaranteed to be free from error; where you believe a decision was made in error, you may use any appeal mechanism made available within the Service. Ragebait reserves the right to make the final determination in all moderation matters."),
    ],
  },
  {
    id: "battle-rules",
    number: 8,
    title: "Battle Rules",
    blocks: [
      p("When participating in battles, you agree that you will not:"),
      ul([
        "Cheat or attempt to obtain an unfair advantage",
        "Manipulate, deceive, or attempt to manipulate the AI or its scoring",
        "Use bots, scripts, or other automated tools to participate",
        "Exploit bugs, defects, or unintended behaviour in the Service",
        "Intentionally disconnect to avoid a loss or influence an outcome",
        "Create or operate fake, duplicate, or multiple accounts",
        "Artificially inflate rankings, scores, or engagement metrics",
      ]),
      p("Violations may result in penalties including score adjustments, forfeits, removal of rewards, suspension, or permanent termination."),
    ],
  },
  {
    id: "fair-play",
    number: 9,
    title: "Fair Play",
    blocks: [
      p("To preserve competitive integrity, the following behaviours are prohibited:"),
      ul([
        "Boosting or arranging predetermined outcomes",
        "Account sharing or allowing others to compete under your account",
        "Automation of gameplay or interactions",
        "Vote or ranking manipulation",
        "Fake engagement, including artificial reactions or activity",
        "Coordinated abuse, brigading, or organised rule evasion",
      ]),
      p("Ragebait may adjust rankings and rewards, and take enforcement action, to remedy the effects of any conduct that undermines fair play."),
    ],
  },
  {
    id: "ugc",
    number: 10,
    title: "User-Generated Content",
    blocks: [
      p("You retain ownership of the original content you create and submit to the Service (\"User Content\"). You are solely responsible for your User Content and the consequences of submitting it."),
      p("By submitting User Content, you grant Ragebait a worldwide, royalty-free, non-exclusive, sublicensable, and transferable licence to host, store, display, reproduce, adapt, moderate, analyse, and use that User Content for the purposes of operating, providing, securing, moderating, improving, and promoting the Service, including for the training, evaluation, and improvement of our AI systems."),
      p("You represent and warrant that you own or have obtained all rights, licences, and permissions necessary to submit your User Content and to grant the licence above, and that your User Content does not infringe or violate the rights of any third party or any applicable law."),
    ],
  },
  {
    id: "ip",
    number: 11,
    title: "Intellectual Property",
    blocks: [
      p("All software, source code, branding, user interfaces, designs, AI systems and models, logos, trademarks, service marks, rankings, scoring algorithms, databases, and other features and materials comprising the Service are owned by Ragebait or its licensors and are protected by intellectual-property and other laws."),
      p("Except for the limited right to use the Service in accordance with these Terms, no rights are granted to you. You may not copy, modify, translate, reverse engineer, decompile, disassemble, scrape, harvest, redistribute, sell, or create derivative works from any part of the Service or its assets without our prior written permission."),
    ],
  },
  {
    id: "privacy",
    number: 12,
    title: "Privacy",
    blocks: [
      p("In connection with your use of the Service, we may collect and process information including, without limitation:"),
      ul([
        "Email address", "Username", "IP address", "Browser and device details",
        "Login history", "Gameplay statistics", "Battle history",
        "Moderation records", "AI interaction logs", "Cookies and similar technologies",
        "Analytics data",
      ]),
      p("We handle personal information in accordance with our Privacy Policy, which describes the categories of data we collect, the purposes and legal bases for processing, how long we retain data, the parties with whom we may share it, and the rights available to you. By using the Service, you consent to the collection and processing of your information as described in the Privacy Policy."),
    ],
  },
  {
    id: "prohibited",
    number: 13,
    title: "Prohibited Activities",
    blocks: [
      p("In addition to the battle and fair-play rules above, you must not engage in, attempt, or facilitate any of the following:"),
      ul([
        "Hacking or unauthorised access to systems or accounts",
        "Reverse engineering, decompiling, or disassembling the Service",
        "Exploiting security vulnerabilities",
        "Credential stuffing or use of stolen credentials",
        "Phishing or social-engineering attacks",
        "Botting or automated interaction with the Service",
        "Account farming or mass account creation",
        "Spam or unsolicited bulk messaging",
        "Distributing malware or malicious code",
        "Data scraping or automated data harvesting",
        "API abuse or exceeding permitted usage",
        "Denial-of-service or distributed denial-of-service attacks",
        "Bypassing, disabling, or interfering with security or access controls",
        "Impersonation of any person or entity",
        "Payment fraud or unauthorised transactions",
      ]),
      p("We may report suspected unlawful activity to law-enforcement or regulatory authorities and cooperate with any resulting investigation."),
    ],
  },
  {
    id: "termination",
    number: 14,
    title: "Account Suspension & Termination",
    blocks: [
      p("Ragebait may, in its sole discretion and with or without notice, suspend, restrict, or permanently terminate your account and access to the Service for any violation of these Terms, the Community Guidelines, or the AI Moderation Policy, or where required to protect the Service, its users, or Ragebait."),
      p("Where an account is terminated for misconduct, no refund of any fees, virtual items, points, rankings, or rewards is guaranteed, to the maximum extent permitted by applicable law. Provisions of these Terms that by their nature should survive termination will survive."),
    ],
  },
  {
    id: "liability",
    number: 15,
    title: "Limitation of Liability",
    blocks: [
      p("The Service is provided on an \"as is\" and \"as available\" basis. To the maximum extent permitted by applicable law, Ragebait disclaims all warranties, whether express, implied, statutory, or otherwise, including implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement. We do not warrant that the Service will be uninterrupted, secure, error-free, or that it will produce any particular outcome."),
      p("To the maximum extent permitted by applicable law, Ragebait and its affiliates, officers, employees, and agents will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, data, goodwill, or opportunities, arising out of or in connection with your use of, or inability to use, the Service, even if advised of the possibility of such damages. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited."),
    ],
  },
  {
    id: "disclaimer",
    number: 16,
    title: "Disclaimer",
    blocks: [
      p("You acknowledge that AI-generated decisions, scores, and moderation outcomes may occasionally be imperfect, incomplete, or inconsistent. No AI system is guaranteed to be one hundred per cent accurate. By using the Service, you accept this possibility and agree that Ragebait is not liable for the ordinary consequences of good-faith AI decisions rendered in the operation of the Service."),
    ],
  },
  {
    id: "changes",
    number: 17,
    title: "Changes to Terms",
    blocks: [
      p("We may modify these Terms from time to time. Where changes are material, we will provide reasonable notice through the Service or by other appropriate means, and, where required, may ask you to accept the updated Terms before continuing to use the Service."),
      p("Each version of these Terms is identified by a version number. Your continued use of the Service after updated Terms take effect constitutes your acceptance of those updated Terms."),
    ],
  },
  {
    id: "governing-law",
    number: 18,
    title: "Governing Law",
    blocks: [
      p("These Terms and any dispute or claim arising out of or in connection with them or their subject matter are governed by, and construed in accordance with, the laws set out below, without regard to conflict-of-law principles."),
      ul([
        "Country: [COUNTRY]",
        "State / Province: [STATE]",
        "Jurisdiction: [JURISDICTION]",
        "Competent Court: [COURT]",
      ]),
    ],
  },
  {
    id: "contact",
    number: 19,
    title: "Contact Information",
    blocks: [
      p("If you have questions about these Terms or the Service, you may contact us using the details below."),
      ul([
        "Company Name: [COMPANY NAME]",
        "Email: [EMAIL]",
        "Website: [WEBSITE]",
        "Business Address: [BUSINESS ADDRESS]",
        "Support Email: [SUPPORT EMAIL]",
      ]),
    ],
  },
  {
    id: "entire-agreement",
    number: 20,
    title: "Entire Agreement",
    blocks: [
      p("These Terms, together with the Privacy Policy, the Community Guidelines, and the AI Moderation Policy, constitute the entire agreement between you and Ragebait regarding the Service and supersede all prior or contemporaneous understandings and agreements, whether written or oral, relating to the same subject matter."),
      p("If any provision of these Terms is held to be invalid or unenforceable, that provision will be limited or severed to the minimum extent necessary, and the remaining provisions will remain in full force and effect. Our failure to enforce any provision is not a waiver of our right to do so later."),
    ],
  },
];
