import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    try {
        const client = getGraphClient();
        
        const fetchFoldersRecursively = async (userId: string, folderId: string | null = null, parentPath = ""): Promise<any[]> => {
            let url = folderId 
                ? `/users/${userId}/mailFolders/${folderId}/childFolders`
                : `/users/${userId}/mailFolders`;
            
            let folders: any[] = [];
            let hasNext = true;
            
            while (hasNext && url) {
                const res = await client.api(url).get();
                
                for (const f of res.value) {
                    const currentPath = parentPath ? `${parentPath}/${f.displayName}` : f.displayName;
                    folders.push({
                        id: f.id,
                        displayName: f.displayName,
                        path: currentPath,
                        totalItemCount: f.totalItemCount,
                        childFolderCount: f.childFolderCount,
                        parentFolderId: f.parentFolderId
                    });

                    if (f.childFolderCount > 0) {
                        const children = await fetchFoldersRecursively(userId, f.id, currentPath);
                        folders = folders.concat(children);
                    }
                }
                
                if (res['@odata.nextLink']) {
                    url = res['@odata.nextLink'];
                } else {
                    hasNext = false;
                }
            }
            return folders;
        };

        const allFolders = await fetchFoldersRecursively(userId);
        
        // Sort alphabetically by path
        allFolders.sort((a, b) => a.path.localeCompare(b.path));

        return NextResponse.json({ folders: allFolders });
    } catch (error: any) {
        console.error('[API] Graph API Error (Mail Folders):', error.message);
        return NextResponse.json(
            { error: "Failed to fetch mail folders", details: error.message },
            { status: 500 }
        );
    }
}
