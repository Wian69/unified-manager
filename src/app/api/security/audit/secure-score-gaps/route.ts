import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getGraphClient();
        
        // Fetch the security secure scores to find the recommendations
        const response = await client.api('/security/secureScores')
            .top(1)
            .get();

        if (response.value && response.value.length > 0) {
            const score = response.value[0];
            // Filter for controls that are NOT fully implemented (score < maxScore)
            const recommendations = score.controlScores.filter((c: any) => c.score < c.controlMaxScore);

            return NextResponse.json({
                currentScore: score.currentScore,
                maxScore: score.maxScore,
                topRecommendations: recommendations.map((r: any) => ({
                    name: r.controlName,
                    current: r.score,
                    max: r.controlMaxScore,
                    category: r.controlCategory
                })).slice(0, 15) // Get the top 15 gaps
            });
        }

        return NextResponse.json({ message: "No secure score data found" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
