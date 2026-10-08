const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const questions = [
    { section: "Section 1: Vendor Information", items: [
        "Company name:", "Headquarters location:", "Year established:", "Number of employees:",
        "Number of customers:", "Primary industries served:", "Annual revenue (optional):",
        "Ownership structure (private/public):", "Financial stability information available:",
        "Major customers/reference accounts:", "Product name:", "Current version:",
        "Product roadmap available? (Yes/No)", "Product release frequency:", "End-of-life policy:"
    ]},
    { section: "Section 2: Business Requirements", items: [
        "How does your solution address our business requirements?", "What differentiates your solution from competitors?",
        "What business outcomes can we expect?", "Which use cases are best supported?",
        "Which use cases are not supported?", "Do you have customers in our industry?",
        "Can you provide relevant case studies?", "Are industry-specific configurations available?"
    ]},
    { section: "Section 3: Functional Requirements", items: [
        "Describe the key functionality provided.", "Which features are standard?",
        "Which features require additional licensing?", "How configurable is the solution?",
        "How customizable is the solution?", "Can workflows be created without coding?",
        "Can workflows be automated?", "Is approval routing supported?",
        "Can business rules be configured by administrators?", "What reporting capabilities exist?",
        "Are dashboards included?", "Can users build custom reports?",
        "Is real-time reporting available?", "What KPIs can be tracked?"
    ]},
    { section: "Section 4: User Experience", items: [
        "Describe the user interface.", "Is the solution web-based?", "Is mobile access supported?",
        "Are native mobile apps available?", "Are accessibility standards supported (WCAG)?",
        "What training materials are provided?", "Is role-based personalization available?",
        "How long does typical user onboarding take?"
    ]},
    { section: "Section 5: Technical Architecture", items: [
        "Is the solution SaaS, PaaS, or On-Premises?", "What cloud platforms are supported?",
        "Which databases are used?", "Is multi-tenancy supported?", "Describe your architecture.",
        "Maximum supported users?", "Maximum transaction volume?", "Auto-scaling capabilities?",
        "Performance benchmarks available?", "Uptime SLA?", "Redundancy architecture?",
        "Disaster recovery strategy?", "Recovery Time Objective (RTO)?", "Recovery Point Objective (RPO)?"
    ]},
    { section: "Section 6: Integration Requirements", items: [
        "Describe available APIs.", "REST API support?", "GraphQL support?", "SOAP support?", "Webhook support?",
        "Microsoft 365 integration?", "Active Directory / Entra ID integration?", "Teams integration?",
        "SharePoint integration?", "ERP integration capabilities?", "CRM integration capabilities?",
        "Supported file formats?", "Import/export capabilities?", "Bulk data migration tools available?"
    ]},
    { section: "Section 7: Security & Compliance", items: [
        "Describe your security framework.", "Encryption at rest?", "Encryption in transit?",
        "Supported authentication methods?", "Multi-factor authentication?", "Single Sign-On (SSO)?",
        "Role-based access control?", "Vulnerability management process?", "Penetration testing frequency?",
        "Security incident response process?", "Security monitoring capabilities?", "ISO 27001 certified?",
        "SOC 2 certified?", "GDPR compliant?", "HIPAA compliant (if applicable)?", "Data residency options?",
        "Audit logging available?", "Audit retention period?", "Exportable audit reports?"
    ]},
    { section: "Section 8: Data Management", items: [
        "Who owns customer data?", "Data retention policies?", "Data archiving capabilities?",
        "Data deletion process?", "Data portability options?", "Backup frequency?",
        "Restoration process?", "Backup retention period?"
    ]},
    { section: "Section 9: Implementation & Deployment", items: [
        "Estimated implementation timeline?", "Typical implementation methodology?",
        "Required customer resources?", "Vendor implementation support available?",
        "Data migration services?", "Legacy system migration tools?", "Migration references available?",
        "Administrator training available?", "End-user training available?", "Training materials included?"
    ]},
    { section: "Section 10: Support & Service Management", items: [
        "Support hours?", "Global support coverage?", "Service desk channels available?", "Escalation process?",
        "Incident response SLA?", "Resolution SLA?", "Priority definitions?", "Named customer success manager?",
        "Quarterly business reviews available?", "Product adoption guidance provided?"
    ]},
    { section: "Section 11: Commercial & Licensing", items: [
        "Licensing model?", "User-based pricing?", "Consumption-based pricing?", "Enterprise licensing available?",
        "Implementation cost?", "Annual subscription cost?", "Training cost?", "Support cost?",
        "Professional services cost?", "Contract duration?", "Renewal terms?", "Termination provisions?",
        "Price increase policy?"
    ]},
    { section: "Section 12: Risk Assessment", items: [
        "What are the top implementation risks?", "What dependencies exist?", "What contingency plans are available?",
        "How do you mitigate operational risks?", "Business continuity plan available?", "Tested annually?",
        "Disaster recovery test reports available?"
    ]}
];

async function createDoc() {
    const children = [];
    
    children.push(new Paragraph({
        text: "Software Selection Questionnaire",
        heading: HeadingLevel.HEADING_1
    }));
    
    questions.forEach(sec => {
        children.push(new Paragraph({
            text: sec.section,
            heading: HeadingLevel.HEADING_2
        }));
        
        sec.items.forEach((q, index) => {
            children.push(new Paragraph({
                text: `${index + 1}. ${q}`
            }));
            // Add some blank space for answers in Word
            children.push(new Paragraph({ text: "" }));
            children.push(new Paragraph({ text: "" }));
        });
    });

    const doc = new Document({
        sections: [{ children }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("C:\\Users\\WianDuRandt\\Desktop\\Questionnaire_For_Forms_Import.docx", buffer);
    console.log("Word document created successfully!");
}

createDoc().catch(console.error);
