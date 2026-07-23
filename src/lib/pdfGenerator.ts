import { getGraphClient } from './graph';
import fs from 'fs';
import path from 'path';

export async function generateInvoicePdf(regionName: string, data: any, budget: any): Promise<Buffer> {
    // 1. Fetch organization details
    const client = getGraphClient();
    let orgAddressLines: string[] = [];
    let orgName = "Equinox";
    
    try {
        const orgs = await client.api('/organization').select('displayName,city,countryLetterCode,postalCode,state,street').get();
        if (orgs && orgs.value && orgs.value.length > 0) {
            const org = orgs.value[0];
            orgName = org.displayName || "Equinox";
            if (org.street) orgAddressLines.push(org.street);
            const cityStateZip = [org.city, org.state, org.postalCode].filter(Boolean).join(', ');
            if (cityStateZip) orgAddressLines.push(cityStateZip);
            if (org.countryLetterCode) orgAddressLines.push(org.countryLetterCode);
        }
    } catch (e) {
        console.error("Failed to fetch organization for PDF", e);
        orgAddressLines = ["Address unavailable"];
    }

    // 2. Setup jsPDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    const checkPageBreak = (neededSpace: number) => {
        if (y + neededSpace > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
    };

    // 3. Header Section (Logo + Address)
    try {
        const logoPath = path.join(process.cwd(), 'public', 'Equinox-Group-Holdings-Logo.png');
        if (fs.existsSync(logoPath)) {
            const logoData = fs.readFileSync(logoPath).toString('base64');
            // Estimate logo size. Original might be big, let's scale it down.
            doc.addImage(`data:image/png;base64,${logoData}`, 'PNG', 15, y, 60, 20);
        } else {
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text(orgName, 15, y + 10);
        }
    } catch (e) {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(orgName, 15, y + 10);
    }

    // Print Address on the right
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let addressY = y + 5;
    doc.text("BILLING ADDRESS", pageWidth - 15, addressY, { align: "right" });
    addressY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(orgName, pageWidth - 15, addressY, { align: "right" });
    doc.setFont("helvetica", "normal");
    orgAddressLines.forEach(line => {
        addressY += 5;
        doc.text(line, pageWidth - 15, addressY, { align: "right" });
    });

    y = Math.max(y + 35, addressY + 15);

    // 4. Invoice Title & Region Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`IT Cost Allocation Statement`, 15, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.text(`Region: ${regionName}`, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, y, { align: "right" });
    y += 10;

    // Draw horizontal line
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Helper to print a line item
    const printLineItem = (title: string, amount: number, subtitle?: string) => {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, 15, y);
        doc.text(`$${amount.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
        y += 4;
        
        if (subtitle) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text(subtitle, 15, y);
            y += 4;
        }
    };

    const printUsers = (usersList: string[]) => {
        if (!usersList || usersList.length === 0) {
            y += 2;
            return;
        }
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        
        // Print in 2 columns to save space
        const columnWidth = (pageWidth - 30) / 2;
        let col = 0;
        
        for (let i = 0; i < usersList.length; i++) {
            if (col === 0) {
                checkPageBreak(4);
            }
            
            const x = 20 + (col * columnWidth);
            doc.text(`• ${usersList[i]}`, x, y);
            
            if (col === 1) {
                col = 0;
                y += 4;
            } else {
                col = 1;
            }
        }
        
        if (col === 1) y += 4; // advance Y if we ended on the first column
        y += 4;
    };

    let totalAmount = 0;

    // --- AZURE COSTS ---
    const mainRegions = data.regions.filter((r: any) => ['Northern Region', 'Eastern Region', 'Southern Region', 'Western Region'].includes(r.name));
    const isMainRegion = mainRegions.some((r: any) => r.name === regionName);
    
    if (isMainRegion && mainRegions.length > 0 && budget.azureRunRate > 0) {
        const azureSplit = budget.azureRunRate / mainRegions.length;
        if (azureSplit > 0) {
            printLineItem("Azure Servers & Add-ons", azureSplit, `Regional split`);
            totalAmount += azureSplit;
            y += 4;
        }
    }

    // --- MICROSOFT LICENSES ---
    const regionData = data.regions.find((r: any) => r.name === regionName);
    if (regionData && regionData.products) {
        for (const product of regionData.products) {
            if (product.totalCost > 0) {
                printLineItem(product.name, product.totalCost, `${product.users.length} users @ $${product.unitPrice.toFixed(2)}/mo`);
                totalAmount += product.totalCost;
                
                // Print the users
                printUsers(product.users);
            }
        }
    }

    // --- MANUAL SOFTWARE ---
    if (budget && budget.software) {
        budget.software.forEach((sw: any) => {
            if (sw.regions && sw.regions.includes(regionName)) {
                const hasAssignedUsers = sw.assignedUsers && sw.assignedUsers.length > 0;

                if (hasAssignedUsers) {
                    const usersInThisRegion = (sw.assignedUsers || []).filter((email: string) => regionData?.usersList?.some((u: any) => u.email === email));
                    const totalAssignedUsers = sw.assignedUsers?.length || 0;

                    if (usersInThisRegion.length > 0 && totalAssignedUsers > 0) {
                        const proportion = usersInThisRegion.length / totalAssignedUsers;
                        const swMonthlyCost = sw.interval === 'yearly' ? sw.cost / 12 : sw.cost;
                        const allocatedCost = (swMonthlyCost * sw.quantity) * proportion;
                        
                        if (allocatedCost > 0) {
                            let label = sw.name;
                            if (proportion >= 0.99 && regionName !== 'Southern Region') {
                                label += ' (No cost recovery to Southern Region necessary)';
                            }
                            
                            printLineItem(label, allocatedCost, `Assigned to ${usersInThisRegion.length} users in this region (${(proportion * 100).toFixed(0)}% of total)`);
                            totalAmount += allocatedCost;
                            
                            printUsers(usersInThisRegion);
                        }
                    }
                } else {
                    const totalUsersInSelectedRegions = data.regions
                        .filter((r: any) => sw.regions.includes(r.name))
                        .reduce((sum: number, r: any) => sum + (r.premiumUsers || 0), 0);

                    if (totalUsersInSelectedRegions > 0) {
                        const proportion = (regionData?.premiumUsers || 0) / totalUsersInSelectedRegions;
                        const swMonthlyCost = sw.interval === 'yearly' ? sw.cost / 12 : sw.cost;
                        const allocatedCost = (swMonthlyCost * sw.quantity) * proportion;
                        
                        if (allocatedCost > 0) {
                            let label = sw.name;
                            if (proportion >= 0.99 && regionName !== 'Southern Region') {
                                label += ' (No cost recovery to Southern Region necessary)';
                            } else {
                                label += ' (Custom Software Allocation)';
                            }
                            
                            printLineItem(label, allocatedCost);
                            totalAmount += allocatedCost;
                            y += 4;
                        }
                    }
                }
            }
        });
    }

    // Draw horizontal line
    checkPageBreak(30);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // TOTAL
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL ALLOCATED COST:", 15, y);
    doc.text(`$${totalAmount.toFixed(2)}`, pageWidth - 15, y, { align: "right" });

    return Buffer.from(doc.output('arraybuffer'));
}
