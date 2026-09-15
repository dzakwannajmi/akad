import { redirect } from 'next/navigation';

// The activity view now lives inside the pool page: the price and volume
// charts are derived from this same activity log, so splitting them across
// two routes meant the pool page could not show its own history. Kept as a
// redirect rather than deleted so older links stay alive.
export default function ActivityPage() {
  redirect('/pool');
}
