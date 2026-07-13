export interface DocTemplate {
  id: string
  name: string
  category: string
  description: string
  doc_type: string
  content: string
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: "ccpa_opt_out",
    name: "CCPA Opt-Out Request",
    category: "Privacy",
    description: "California Consumer Privacy Act — opt out of sale of personal information",
    doc_type: "ccpa_request",
    content: `To Whom It May Concern:

Pursuant to the California Consumer Privacy Act (CCPA), Cal. Civ. Code § 1798.100 et seq., I am writing to request that you cease the sale of my personal information.

My information is as follows:
- Full Name: [YOUR NAME]
- Email: [YOUR EMAIL]
- Address: [YOUR ADDRESS]

I request that you:
1. Cease selling any personal information you have collected about me.
2. Delete any personal information you have collected about me, to the extent permitted by law.
3. Confirm in writing that you have complied with this request.

This request is made pursuant to Cal. Civ. Code § 1798.120 (right to opt out of the sale of personal information).

Please respond within 45 days as required by the CCPA.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "gdpr_erasure",
    name: "GDPR Right to Erasure (RTBF)",
    category: "Privacy",
    description: "EU General Data Protection Regulation — request deletion of personal data",
    doc_type: "gdpr_request",
    content: `To Whom It May Concern:

Under Article 17 of the General Data Protection Regulation (EU) 2016/679, I am exercising my right to erasure ("right to be forgotten").

I request that you erase all personal data you hold about me without undue delay, as provided under Article 17(1) GDPR.

My information:
- Full Name: [YOUR NAME]
- Email: [YOUR EMAIL]
- Any known account identifiers or usernames

The applicable grounds for erasure under Article 17(1) are:
(a) The personal data is no longer necessary for the purpose for which it was collected.
(b) I withdraw consent on which the processing is based.
(d) The personal data has been unlawfully processed.

I request:
1. Erasure of all personal data concerning me.
2. Confirmation of erasure in writing.
3. Notification of any third parties to whom the data was disclosed, as per Article 17(2).

Please respond within 30 days as required by Article 12(3) GDPR.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "data_removal_broker",
    name: "Data Broker Removal Request",
    category: "Privacy",
    description: "Generic removal request to data brokers (Spokeo, WhitePages, BeenVerified, etc.)",
    doc_type: "removal_request",
    content: `To Whom It May Concern:

I am writing to request the removal of all personal information about me from your databases and services, pursuant to applicable privacy laws.

My information:
- Full Name: [YOUR NAME]
- Email: [YOUR EMAIL]
- Address: [YOUR ADDRESS]
- Phone: [YOUR PHONE] (if applicable)

I request that you:
1. Remove all personal information about me from your website and databases.
2. Opt me out of any future data collection.
3. Confirm in writing that my data has been removed.

Under the CCPA and applicable state privacy laws, you are required to honor verified consumer requests to delete personal information.

Please respond within 45 days.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "cease_desist_harassment",
    name: "Cease and Desist — Harassment",
    category: "Legal",
    description: "Formal demand to stop harassment or threatening behavior",
    doc_type: "custom",
    content: `CEASE AND DESIST NOTICE

Date: [DATE]

TO: [RECIPIENT NAME / ORGANIZATION]
[RECIPIENT ADDRESS]

RE: Demand to Cease and Desist Harassment

Dear [RECIPIENT NAME]:

This letter serves as formal notice demanding that you immediately CEASE AND DESIST all harassment, threatening communication, and intimidation directed at me.

Specifically, I demand that you:
1. Immediately cease all forms of harassment, including but not limited to [DESCRIBE CONDUCT].
2. Refrain from any further contact with me, whether in person, by phone, email, text message, social media, or any other means.
3. Refrain from contacting my family, friends, employer, or associates regarding this matter.

Your conduct constitutes [harassment / stalking / intimidation] in violation of [STATE] law, including [CITE SPECIFIC STATUTES].

If you do not comply with this demand, I will pursue all available legal remedies, including but not limited to filing a restraining order and pursuing civil and criminal action.

This letter is written without prejudice to my rights and remedies, all of which are expressly reserved.

Sincerely,
[YOUR NAME]
[YOUR ADDRESS]
[YOUR CONTACT INFORMATION]

[SIGNATURE]`,
  },
  {
    id: "cease_desist_defamation",
    name: "Cease and Desist — Defamation",
    category: "Legal",
    description: "Demand to stop publishing false statements",
    doc_type: "custom",
    content: `CEASE AND DESIST NOTICE

Date: [DATE]

TO: [RECIPIENT NAME / ORGANIZATION]

RE: Demand to Cease and Desist Defamatory Statements

Dear [RECIPIENT NAME]:

This letter demands that you immediately CEASE AND DESIST publishing, distributing, or communicating false and defamatory statements about me.

Your statements, including but not limited to [DESCRIBE STATEMENTS], are false and have caused material harm to my reputation.

The statements in question constitute defamation per se and/or slander, as they:
1. Are false statements of fact presented as truth.
2. Were published to third parties.
3. Were made with [actual malice / negligence] regarding their truth or falsity.
4. Have caused damages including [emotional distress / reputational harm / financial loss].

I demand that you:
1. Immediately cease all defamatory statements about me.
2. Remove all defamatory content published online or in other media.
3. Publish a retraction of the false statements.
4. Confirm in writing that you have complied.

If you fail to comply, I will pursue legal action including claims for defamation, tortious interference, and intentional infliction of emotional distress.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "dmca_takedown",
    name: "DMCA Takedown Notice",
    category: "Copyright",
    description: "Digital Millennium Copyright Act — request removal of infringing content",
    doc_type: "custom",
    content: `DMCA TAKEDOWN NOTICE
Pursuant to 17 U.S.C. § 512(c)

Date: [DATE]

To: [SERVICE PROVIDER / HOSTING COMPANY]
[COMPANY ADDRESS]

Re: Copyright Infringement — Notice and Takedown Request

I am the copyright owner (or authorized agent of the copyright owner) of the following original work(s):

Title of Work: [WORK TITLE]
Copyright Owner: [YOUR NAME]
Date of Publication: [DATE]

The infringing material is located at:
[URL(S) OF INFRINGING CONTENT]

I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

I declare under penalty of perjury that:
1. I am the copyright owner or authorized to act on behalf of the owner.
2. The information in this notice is accurate.
3. I have not authorized the use of the material.
4. The use constitutes copyright infringement.

I request that you immediately remove or disable access to the infringing material.

Please send your response to:
[YOUR NAME]
[YOUR EMAIL]
[YOUR ADDRESS]

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "fcra_dispute",
    name: "FCRA Credit Report Dispute",
    category: "Financial",
    description: "Fair Credit Reporting Act — dispute inaccurate information on credit report",
    doc_type: "custom",
    content: `To Whom It May Concern:

Pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681, I am writing to dispute inaccurate information appearing on my credit report.

My information:
- Full Name: [YOUR NAME]
- Date of Birth: [DOB]
- SSN (last 4): [LAST 4 SSN]
- Account Number: [ACCOUNT NUMBER]

The following information is inaccurate:
[DESCRIBE INACCURATE ITEMS]

I have reviewed my credit report and these items are inaccurate because:
[EXPLAIN WHY EACH ITEM IS INACCURATE]

Under § 1681i, you are required to:
1. Conduct a reasonable investigation within 30 days.
2. Forward all relevant information to the furnisher.
3. Delete or modify any information that cannot be verified.
4. Notify me of the results of the investigation.

Please investigate these items and correct my credit report accordingly.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "fair_debt_validation",
    name: "Fair Debt Validation Letter",
    category: "Financial",
    description: "FDCPA — request debt validation from collectors",
    doc_type: "custom",
    content: `To Whom It May Concern:

Pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g, I am requesting validation of the alleged debt you are attempting to collect.

This letter is NOT a refusal to pay, but a notice that your claim is disputed and validation is requested.

My information:
- Full Name: [YOUR NAME]
- Account Number: [ACCOUNT NUMBER]

I request that you provide the following:
1. The amount of the debt.
2. The name of the original creditor.
3. Proof that you are authorized to collect this debt.
4. A copy of the original signed agreement.
5. Proof that the statute of limitations has not expired.

Until you provide validation, I request that you:
1. Cease all collection activity.
2. Refrain from reporting to credit bureaus.
3. Remove any negative information already reported.

Under 15 U.S.C. § 1692g(b), you must cease collection until validation is provided.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "opt_out_prea",
    name: "Pre-Approved Credit Offer Opt-Out",
    category: "Privacy",
    description: "Opt out of prescreened credit and insurance offers",
    doc_type: "opt_out",
    content: `To Whom It May Concern:

Pursuant to the Fair Credit Reporting Act, 15 U.S.C. § 1681b(e), I am requesting that you cease prescreening my consumer report for the purpose of extending unsolicited credit or insurance offers.

My information:
- Full Name: [YOUR NAME]
- Date of Birth: [DOB]
- Social Security Number (last 4): [LAST 4 SSN]
- Current Address: [YOUR ADDRESS]
- Previous Address: [PREVIOUS ADDRESS] (if applicable)

I request that you:
1. Place my name on your internal do-not-prescreen list.
2. Remove my information from any prescreened list shared with third parties.
3. Confirm in writing that my request has been processed.

For joint accounts, this applies to both account holders.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
  {
    id: "online_account_deletion",
    name: "Online Account Deletion Request",
    category: "Privacy",
    description: "Request deletion of online account and associated data",
    doc_type: "removal_request",
    content: `To Whom It May Concern:

I am writing to request the permanent deletion of my account and all associated personal data from your services.

My account information:
- Username: [YOUR USERNAME]
- Email: [YOUR EMAIL]
- Account Name: [ACCOUNT NAME IF APPLICABLE]

I request that you:
1. Permanently delete my account and all associated data.
2. Delete all personal information, including name, email, IP logs, usage data, and any derived data.
3. Cease any further processing of my personal data.
4. Confirm in writing that my data has been fully deleted.

This request is made pursuant to [CCPA § 1798.105 / GDPR Article 17 / applicable state privacy law] and any other applicable data protection regulations.

Please respond within 30 days.

Sincerely,
[YOUR NAME]

[SIGNATURE]`,
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "Privacy", label: "Privacy" },
  { id: "Legal", label: "Legal" },
  { id: "Copyright", label: "Copyright" },
  { id: "Financial", label: "Financial" },
]
