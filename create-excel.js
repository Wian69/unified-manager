const ExcelJS = require('exceljs');

async function createQuestionnaire() {
    const workbook = new ExcelJS.Workbook();
    
    // --- Sheet 1: Questionnaire ---
    const qSheet = workbook.addWorksheet('Questionnaire');
    qSheet.columns = [
        { header: 'Section', key: 'section', width: 25 },
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Question', key: 'question', width: 60 },
        { header: 'Vendor Response', key: 'response', width: 60 },
        { header: 'Internal Evaluator Score (1-5)', key: 'score', width: 25 }
    ];

    qSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    qSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };

    const questions = [
        ['Section 1: Vendor Information', 'Company Profile', 'Company name:'],
        ['Section 1: Vendor Information', 'Company Profile', 'Headquarters location:'],
        ['Section 1: Vendor Information', 'Company Profile', 'Year established:'],
        ['Section 1: Vendor Information', 'Company Profile', 'Number of employees:'],
        ['Section 1: Vendor Information', 'Company Profile', 'Number of customers:'],
        ['Section 1: Vendor Information', 'Company Profile', 'Primary industries served:'],
        ['Section 1: Vendor Information', 'Company Profile', 'Annual revenue (optional):'],
        ['Section 1: Vendor Information', 'Company Profile', 'Ownership structure (private/public):'],
        ['Section 1: Vendor Information', 'Company Profile', 'Financial stability information available:'],
        ['Section 1: Vendor Information', 'Company Profile', 'Major customers/reference accounts:'],
        ['Section 1: Vendor Information', 'Product Information', 'Product name:'],
        ['Section 1: Vendor Information', 'Product Information', 'Current version:'],
        ['Section 1: Vendor Information', 'Product Information', 'Product roadmap available? (Yes/No)'],
        ['Section 1: Vendor Information', 'Product Information', 'Product release frequency:'],
        ['Section 1: Vendor Information', 'Product Information', 'End-of-life policy:'],
        ['Section 2: Business Requirements', 'Strategic Fit', 'How does your solution address our business requirements?'],
        ['Section 2: Business Requirements', 'Strategic Fit', 'What differentiates your solution from competitors?'],
        ['Section 2: Business Requirements', 'Strategic Fit', 'What business outcomes can we expect?'],
        ['Section 2: Business Requirements', 'Strategic Fit', 'Which use cases are best supported?'],
        ['Section 2: Business Requirements', 'Strategic Fit', 'Which use cases are not supported?'],
        ['Section 2: Business Requirements', 'Industry Alignment', 'Do you have customers in our industry?'],
        ['Section 2: Business Requirements', 'Industry Alignment', 'Can you provide relevant case studies?'],
        ['Section 2: Business Requirements', 'Industry Alignment', 'Are industry-specific configurations available?'],
        ['Section 3: Functional Requirements', 'Core Features', 'Describe the key functionality provided.'],
        ['Section 3: Functional Requirements', 'Core Features', 'Which features are standard?'],
        ['Section 3: Functional Requirements', 'Core Features', 'Which features require additional licensing?'],
        ['Section 3: Functional Requirements', 'Core Features', 'How configurable is the solution?'],
        ['Section 3: Functional Requirements', 'Core Features', 'How customizable is the solution?'],
        ['Section 3: Functional Requirements', 'Workflow Management', 'Can workflows be created without coding?'],
        ['Section 3: Functional Requirements', 'Workflow Management', 'Can workflows be automated?'],
        ['Section 3: Functional Requirements', 'Workflow Management', 'Is approval routing supported?'],
        ['Section 3: Functional Requirements', 'Workflow Management', 'Can business rules be configured by administrators?'],
        ['Section 3: Functional Requirements', 'Reporting & Analytics', 'What reporting capabilities exist?'],
        ['Section 3: Functional Requirements', 'Reporting & Analytics', 'Are dashboards included?'],
        ['Section 3: Functional Requirements', 'Reporting & Analytics', 'Can users build custom reports?'],
        ['Section 3: Functional Requirements', 'Reporting & Analytics', 'Is real-time reporting available?'],
        ['Section 3: Functional Requirements', 'Reporting & Analytics', 'What KPIs can be tracked?'],
        ['Section 4: User Experience', 'Usability', 'Describe the user interface.'],
        ['Section 4: User Experience', 'Usability', 'Is the solution web-based?'],
        ['Section 4: User Experience', 'Usability', 'Is mobile access supported?'],
        ['Section 4: User Experience', 'Usability', 'Are native mobile apps available?'],
        ['Section 4: User Experience', 'Usability', 'Are accessibility standards supported (WCAG)?'],
        ['Section 4: User Experience', 'User Adoption', 'What training materials are provided?'],
        ['Section 4: User Experience', 'User Adoption', 'Is role-based personalization available?'],
        ['Section 4: User Experience', 'User Adoption', 'How long does typical user onboarding take?'],
        ['Section 5: Technical Architecture', 'Platform', 'Is the solution SaaS, PaaS, or On-Premises?'],
        ['Section 5: Technical Architecture', 'Platform', 'What cloud platforms are supported?'],
        ['Section 5: Technical Architecture', 'Platform', 'Which databases are used?'],
        ['Section 5: Technical Architecture', 'Platform', 'Is multi-tenancy supported?'],
        ['Section 5: Technical Architecture', 'Platform', 'Describe your architecture.'],
        ['Section 5: Technical Architecture', 'Scalability', 'Maximum supported users?'],
        ['Section 5: Technical Architecture', 'Scalability', 'Maximum transaction volume?'],
        ['Section 5: Technical Architecture', 'Scalability', 'Auto-scaling capabilities?'],
        ['Section 5: Technical Architecture', 'Scalability', 'Performance benchmarks available?'],
        ['Section 5: Technical Architecture', 'Availability', 'Uptime SLA?'],
        ['Section 5: Technical Architecture', 'Availability', 'Redundancy architecture?'],
        ['Section 5: Technical Architecture', 'Availability', 'Disaster recovery strategy?'],
        ['Section 5: Technical Architecture', 'Availability', 'Recovery Time Objective (RTO)?'],
        ['Section 5: Technical Architecture', 'Availability', 'Recovery Point Objective (RPO)?'],
        ['Section 6: Integration Requirements', 'Integration Capabilities', 'Describe available APIs.'],
        ['Section 6: Integration Requirements', 'Integration Capabilities', 'REST API support?'],
        ['Section 6: Integration Requirements', 'Integration Capabilities', 'GraphQL support?'],
        ['Section 6: Integration Requirements', 'Integration Capabilities', 'SOAP support?'],
        ['Section 6: Integration Requirements', 'Integration Capabilities', 'Webhook support?'],
        ['Section 6: Integration Requirements', 'Enterprise Integration', 'Microsoft 365 integration?'],
        ['Section 6: Integration Requirements', 'Enterprise Integration', 'Active Directory / Entra ID integration?'],
        ['Section 6: Integration Requirements', 'Enterprise Integration', 'Teams integration?'],
        ['Section 6: Integration Requirements', 'Enterprise Integration', 'SharePoint integration?'],
        ['Section 6: Integration Requirements', 'Enterprise Integration', 'ERP integration capabilities?'],
        ['Section 6: Integration Requirements', 'Enterprise Integration', 'CRM integration capabilities?'],
        ['Section 6: Integration Requirements', 'Data Exchange', 'Supported file formats?'],
        ['Section 6: Integration Requirements', 'Data Exchange', 'Import/export capabilities?'],
        ['Section 6: Integration Requirements', 'Data Exchange', 'Bulk data migration tools available?'],
        ['Section 7: Security & Compliance', 'Security Controls', 'Describe your security framework.'],
        ['Section 7: Security & Compliance', 'Security Controls', 'Encryption at rest?'],
        ['Section 7: Security & Compliance', 'Security Controls', 'Encryption in transit?'],
        ['Section 7: Security & Compliance', 'Security Controls', 'Supported authentication methods?'],
        ['Section 7: Security & Compliance', 'Security Controls', 'Multi-factor authentication?'],
        ['Section 7: Security & Compliance', 'Security Controls', 'Single Sign-On (SSO)?'],
        ['Section 7: Security & Compliance', 'Security Controls', 'Role-based access control?'],
        ['Section 7: Security & Compliance', 'Security Operations', 'Vulnerability management process?'],
        ['Section 7: Security & Compliance', 'Security Operations', 'Penetration testing frequency?'],
        ['Section 7: Security & Compliance', 'Security Operations', 'Security incident response process?'],
        ['Section 7: Security & Compliance', 'Security Operations', 'Security monitoring capabilities?'],
        ['Section 7: Security & Compliance', 'Compliance', 'ISO 27001 certified?'],
        ['Section 7: Security & Compliance', 'Compliance', 'SOC 2 certified?'],
        ['Section 7: Security & Compliance', 'Compliance', 'GDPR compliant?'],
        ['Section 7: Security & Compliance', 'Compliance', 'HIPAA compliant (if applicable)?'],
        ['Section 7: Security & Compliance', 'Compliance', 'Data residency options?'],
        ['Section 7: Security & Compliance', 'Audit', 'Audit logging available?'],
        ['Section 7: Security & Compliance', 'Audit', 'Audit retention period?'],
        ['Section 7: Security & Compliance', 'Audit', 'Exportable audit reports?'],
        ['Section 8: Data Management', 'Data Governance', 'Who owns customer data?'],
        ['Section 8: Data Management', 'Data Governance', 'Data retention policies?'],
        ['Section 8: Data Management', 'Data Governance', 'Data archiving capabilities?'],
        ['Section 8: Data Management', 'Data Governance', 'Data deletion process?'],
        ['Section 8: Data Management', 'Data Governance', 'Data portability options?'],
        ['Section 8: Data Management', 'Backup & Recovery', 'Backup frequency?'],
        ['Section 8: Data Management', 'Backup & Recovery', 'Restoration process?'],
        ['Section 8: Data Management', 'Backup & Recovery', 'Backup retention period?'],
        ['Section 9: Implementation & Deployment', 'Implementation', 'Estimated implementation timeline?'],
        ['Section 9: Implementation & Deployment', 'Implementation', 'Typical implementation methodology?'],
        ['Section 9: Implementation & Deployment', 'Implementation', 'Required customer resources?'],
        ['Section 9: Implementation & Deployment', 'Implementation', 'Vendor implementation support available?'],
        ['Section 9: Implementation & Deployment', 'Migration', 'Data migration services?'],
        ['Section 9: Implementation & Deployment', 'Migration', 'Legacy system migration tools?'],
        ['Section 9: Implementation & Deployment', 'Migration', 'Migration references available?'],
        ['Section 9: Implementation & Deployment', 'Training', 'Administrator training available?'],
        ['Section 9: Implementation & Deployment', 'Training', 'End-user training available?'],
        ['Section 9: Implementation & Deployment', 'Training', 'Training materials included?'],
        ['Section 10: Support & Service Management', 'Support Model', 'Support hours?'],
        ['Section 10: Support & Service Management', 'Support Model', 'Global support coverage?'],
        ['Section 10: Support & Service Management', 'Support Model', 'Service desk channels available?'],
        ['Section 10: Support & Service Management', 'Support Model', 'Escalation process?'],
        ['Section 10: Support & Service Management', 'Service Levels', 'Incident response SLA?'],
        ['Section 10: Support & Service Management', 'Service Levels', 'Resolution SLA?'],
        ['Section 10: Support & Service Management', 'Service Levels', 'Priority definitions?'],
        ['Section 10: Support & Service Management', 'Customer Success', 'Named customer success manager?'],
        ['Section 10: Support & Service Management', 'Customer Success', 'Quarterly business reviews available?'],
        ['Section 10: Support & Service Management', 'Customer Success', 'Product adoption guidance provided?'],
        ['Section 11: Commercial & Licensing', 'Licensing', 'Licensing model?'],
        ['Section 11: Commercial & Licensing', 'Licensing', 'User-based pricing?'],
        ['Section 11: Commercial & Licensing', 'Licensing', 'Consumption-based pricing?'],
        ['Section 11: Commercial & Licensing', 'Licensing', 'Enterprise licensing available?'],
        ['Section 11: Commercial & Licensing', 'Costs', 'Implementation cost?'],
        ['Section 11: Commercial & Licensing', 'Costs', 'Annual subscription cost?'],
        ['Section 11: Commercial & Licensing', 'Costs', 'Training cost?'],
        ['Section 11: Commercial & Licensing', 'Costs', 'Support cost?'],
        ['Section 11: Commercial & Licensing', 'Costs', 'Professional services cost?'],
        ['Section 11: Commercial & Licensing', 'Contract Terms', 'Contract duration?'],
        ['Section 11: Commercial & Licensing', 'Contract Terms', 'Renewal terms?'],
        ['Section 11: Commercial & Licensing', 'Contract Terms', 'Termination provisions?'],
        ['Section 11: Commercial & Licensing', 'Contract Terms', 'Price increase policy?'],
        ['Section 12: Risk Assessment', 'Vendor Risk', 'What are the top implementation risks?'],
        ['Section 12: Risk Assessment', 'Vendor Risk', 'What dependencies exist?'],
        ['Section 12: Risk Assessment', 'Vendor Risk', 'What contingency plans are available?'],
        ['Section 12: Risk Assessment', 'Vendor Risk', 'How do you mitigate operational risks?'],
        ['Section 12: Risk Assessment', 'Business Continuity', 'Business continuity plan available?'],
        ['Section 12: Risk Assessment', 'Business Continuity', 'Tested annually?'],
        ['Section 12: Risk Assessment', 'Business Continuity', 'Disaster recovery test reports available?']
    ];

    questions.forEach(q => {
        qSheet.addRow(q);
    });


    // --- Sheet 2: Evaluation Scoring Matrix ---
    const scoreSheet = workbook.addWorksheet('Evaluation Scoring Matrix');
    scoreSheet.columns = [
        { header: 'Category', key: 'cat', width: 30 },
        { header: 'Weight (%)', key: 'weight', width: 15 },
        { header: 'Evaluator Score (1-5)', key: 'score', width: 25 },
        { header: 'Weighted Score', key: 'weighted', width: 20 }
    ];
    scoreSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    scoreSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };

    const categories = [
        ['Functional Fit', 0.25],
        ['Security & Compliance', 0.20],
        ['Integration Capability', 0.15],
        ['User Experience', 0.10],
        ['Technical Architecture', 0.10],
        ['Implementation Approach', 0.05],
        ['Support & Service', 0.05],
        ['Vendor Viability', 0.05],
        ['Commercial Value', 0.05]
    ];

    let rowNum = 2;
    categories.forEach(c => {
        const row = scoreSheet.addRow([c[0], c[1], null]);
        row.getCell(2).numFmt = '0%';
        row.getCell(3).dataValidation = {
            type: 'whole',
            operator: 'between',
            formulae: [1, 5],
            showErrorMessage: true,
            errorTitle: 'Invalid Score',
            error: 'Score must be between 1 and 5'
        };
        // formula: weight * score
        row.getCell(4).value = { formula: `B${rowNum}*C${rowNum}` };
        row.getCell(4).numFmt = '0.00';
        rowNum++;
    });

    const totalRow = scoreSheet.addRow(['Total', { formula: 'SUM(B2:B10)' }, null, { formula: 'SUM(D2:D10)' }]);
    totalRow.font = { bold: true };
    totalRow.getCell(2).numFmt = '0%';
    totalRow.getCell(4).numFmt = '0.00';

    scoreSheet.addRow([]);
    
    // Summary section
    scoreSheet.addRow(['Final Recommendation']).font = { bold: true };
    scoreSheet.addRow(['Recommendation:', '']);
    scoreSheet.addRow(['Key strengths:', '']);
    scoreSheet.addRow(['Key weaknesses:', '']);
    scoreSheet.addRow(['Key risks:', '']);
    scoreSheet.addRow(['Estimated ROI:', '']);

    const desktopPath = "C:\\Users\\WianDuRandt\\Desktop\\Software_Selection_Questionnaire.xlsx";
    await workbook.xlsx.writeFile(desktopPath);
    console.log(`Successfully generated at ${desktopPath}`);
}

createQuestionnaire().catch(err => console.error(err));
