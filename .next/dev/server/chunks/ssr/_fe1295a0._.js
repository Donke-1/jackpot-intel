module.exports = [
"[project]/app/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"6090f5b93aa407259447be965dc7e7b2e37e4904a4":"settleCycle","78b9340fba67097d00b00821e2492e9084445fa77b":"joinCycle"},"",""] */ __turbopack_context__.s([
    "joinCycle",
    ()=>joinCycle,
    "settleCycle",
    ()=>settleCycle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
// Initialize Supabase Client for Server Actions
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://jfznjloufvqlivazfcwl.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmem5qbG91ZnZxbGl2YXpmY3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDY4MDQsImV4cCI6MjA4NDAyMjgwNH0.b5u3R8f07hBEPhvKy_v8MmjiAw9klB5-vpFx7RXGZ60"));
async function joinCycle(cycleId, userId, mode, siteName) {
    // 1. Fetch User Profile to check Credits
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
    const userCredits = profile?.credits || 0;
    const sitesSelected = mode === 'full' ? [
        'ALL'
    ] : [
        siteName || 'Unknown'
    ];
    let usedCredit = false;
    // 2. LOGIC: If they have credits, use one.
    if (userCredits > 0) {
        // Deduct Credit
        const { error: creditError } = await supabase.from('profiles').update({
            credits: userCredits - 1
        }).eq('id', userId);
        if (creditError) {
            // eslint-disable-next-line no-console
            console.error('Credit Transaction Error:', creditError);
            return {
                success: false,
                message: 'Credit transaction failed.'
            };
        }
        usedCredit = true;
    }
    // Else: Here is where you would normally check for Stripe/MPesa payment success.
    // For MVP, we proceed as "Pay-as-you-go" (free for now if no credits).
    // 3. Insert into Participants table
    const { error } = await supabase.from('participants').upsert({
        user_id: userId,
        cycle_id: cycleId,
        sites_selected: sitesSelected,
        checklist_completed: true,
        personal_outcome: 'pending',
        joined_at: new Date().toISOString()
    }, {
        onConflict: 'user_id, cycle_id' // If they already joined, just update their selection
    });
    if (error) {
        // If insert fails but we deducted credit, we should ideally refund it here.
        // For MVP, logging is sufficient.
        // eslint-disable-next-line no-console
        console.error('Join Cycle Error:', error);
        return {
            success: false,
            message: error.message
        };
    }
    // 4. Revalidate pages so UI updates immediately
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/account'); // Update the wallet number on the account page too
    return {
        success: true,
        message: usedCredit ? 'Entry Unlocked using 1 Rollover Credit.' : 'Entry Unlocked.'
    };
}
async function settleCycle(cycleId, winningPlatform) {
    // 1. Update Cycle Status
    const newStatus = winningPlatform ? 'success' : 'failed';
    const { error: cycleError } = await supabase.from('cycles').update({
        status: newStatus
    }).eq('id', cycleId);
    if (cycleError) {
        // eslint-disable-next-line no-console
        console.error('Cycle Status Update Error:', cycleError);
        return {
            success: false,
            message: 'Failed to update cycle status'
        };
    }
    // 2. Fetch all Participants for this cycle
    const { data: participants } = await supabase.from('participants').select('*').eq('cycle_id', cycleId);
    if (!participants || participants.length === 0) {
        return {
            success: true,
            message: 'Cycle closed. No participants found.'
        };
    }
    // 3. Loop through and grade each user
    const updates = participants.map(async (user)=>{
        let outcome = 'lost';
        let giveCredit = false;
        // SCENARIO A: The Cycle Failed Globally
        if (!winningPlatform) {
            outcome = 'lost';
        // Note: For "Hunter" cycles, we might not close it here, but let's assume this closes the week.
        } else {
            const userSites = user.sites_selected || [];
            const hasFullBundle = userSites.includes('ALL');
            const pickedWinner = userSites.includes(winningPlatform);
            if (hasFullBundle || pickedWinner) {
                outcome = 'won'; // They rode the bus!
            } else {
                // They picked the wrong site -> ROLLOVER LOGIC
                outcome = 'missed_opportunity';
                giveCredit = true;
            }
        }
        // Update the participant record
        // If we give credit, we also update the profile credits
        const updates = [];
        // Update Participation Record
        updates.push(supabase.from('participants').update({
            personal_outcome: outcome,
            rollover_credit: giveCredit
        }).eq('id', user.id));
        // Update Profile Credits (if applicable)
        if (giveCredit) {
            // We need to fetch current credits first to increment safely, or use an RPC.
            // For simplicity in MVP, we do a quick fetch-update or assume an RPC exists.
            // Let's do a safe RPC call if possible, or a direct increment.
            // Since we don't have an 'increment' RPC set up yet, we will fetch-update.
            const { data: p } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
            if (p) {
                updates.push(supabase.from('profiles').update({
                    credits: (p.credits || 0) + 1
                }).eq('id', user.id));
            }
        }
        return Promise.all(updates);
    });
    await Promise.all(updates);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/account');
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    joinCycle,
    settleCycle
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(joinCycle, "78b9340fba67097d00b00821e2492e9084445fa77b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(settleCycle, "6090f5b93aa407259447be965dc7e7b2e37e4904a4", null);
}),
"[project]/.next-internal/server/app/admin/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions.ts [app-rsc] (ecmascript)");
;
;
}),
"[project]/.next-internal/server/app/admin/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "6090f5b93aa407259447be965dc7e7b2e37e4904a4",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["settleCycle"],
    "78b9340fba67097d00b00821e2492e9084445fa77b",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["joinCycle"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$admin$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/admin/page/actions.js { ACTIONS_MODULE0 => "[project]/app/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_fe1295a0._.js.map