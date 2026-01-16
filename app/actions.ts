'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Initialize Supabase Client for Server Actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function joinCycle(
  cycleId: string, 
  userId: string, 
  mode: 'full' | 'custom', 
  siteName?: string
) {
  
  // 1. Fetch User Profile to check Credits
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  const userCredits = profile?.credits || 0;
  const sitesSelected = mode === 'full' ? ['ALL'] : [siteName || 'Unknown'];
  let usedCredit = false;

  // 2. LOGIC: If they have credits, use one.
  if (userCredits > 0) {
    // Deduct Credit
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: userCredits - 1 })
      .eq('id', userId);
    
    if (creditError) {
      // eslint-disable-next-line no-console
      console.error('Credit Transaction Error:', creditError);
      return { success: false, message: 'Credit transaction failed.' };
    }
    usedCredit = true;
  } 
  // Else: Here is where you would normally check for Stripe/MPesa payment success.
  // For MVP, we proceed as "Pay-as-you-go" (free for now if no credits).

  // 3. Insert into Participants table
  const { error } = await supabase
    .from('participants')
    .upsert({
      user_id: userId,
      cycle_id: cycleId,
      sites_selected: sitesSelected,
      checklist_completed: true, // They passed the modal
      personal_outcome: 'pending',
      joined_at: new Date().toISOString()
      // We could add a 'payment_method' column later: 'credit' vs 'cash'
    }, {
      onConflict: 'user_id, cycle_id' // If they already joined, just update their selection
    });

  if (error) {
    // If insert fails but we deducted credit, we should ideally refund it here.
    // For MVP, logging is sufficient.
    // eslint-disable-next-line no-console
    console.error('Join Cycle Error:', error);
    return { success: false, message: error.message };
  }

  // 4. Revalidate pages so UI updates immediately
  revalidatePath('/dashboard');
  revalidatePath('/account'); // Update the wallet number on the account page too
  
  return { 
    success: true, 
    message: usedCredit ? 'Entry Unlocked using 1 Rollover Credit.' : 'Entry Unlocked.' 
  };
}

// --- SETTLEMENT LOGIC ---

export async function settleCycle(cycleId: string, winningPlatform: string | null) {
  // 1. Update Cycle Status
  const newStatus = winningPlatform ? 'success' : 'failed';
  
  const { error: cycleError } = await supabase
    .from('cycles')
    .update({ status: newStatus })
    .eq('id', cycleId);

  if (cycleError) {
    // eslint-disable-next-line no-console
    console.error('Cycle Status Update Error:', cycleError);
    return { success: false, message: 'Failed to update cycle status' };
  }

  // 2. Fetch all Participants for this cycle
  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('cycle_id', cycleId);

  if (!participants || participants.length === 0) {
    return { success: true, message: 'Cycle closed. No participants found.' };
  }

  // 3. Loop through and grade each user
  const updates = participants.map(async (user) => {
    let outcome = 'lost';
    let giveCredit = false;

    // SCENARIO A: The Cycle Failed Globally
    if (!winningPlatform) {
      outcome = 'lost'; 
    } 
    // SCENARIO B: The Cycle Won Globally
    else {
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

    // Prepare Update Promises
    const userUpdates = [];
    
    // A. Update Participation Record
    userUpdates.push(
      supabase
        .from('participants')
        .update({ 
          personal_outcome: outcome,
          rollover_credit: giveCredit 
        })
        .eq('id', user.id)
    );

    // B. Update Profile Stats (Credits OR Wins)
    if (giveCredit) {
       // Increment Credits
       const { data: p } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
       if (p) {
         userUpdates.push(
           supabase.from('profiles').update({ credits: (p.credits || 0) + 1 }).eq('id', user.id)
         );
       }
    } else if (outcome === 'won') {
       // Increment Total Wins
       const { data: p } = await supabase.from('profiles').select('total_wins').eq('id', user.id).single();
       if (p) {
         userUpdates.push(
           supabase.from('profiles').update({ total_wins: (p.total_wins || 0) + 1 }).eq('id', user.id)
         );
       }
    }

    return Promise.all(userUpdates);
  });

  await Promise.all(updates);
  revalidatePath('/dashboard');
  revalidatePath('/account');
  revalidatePath('/'); // Update landing page leaderboard
  return { success: true };
}